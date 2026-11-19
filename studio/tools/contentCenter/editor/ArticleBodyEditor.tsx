import {
  EditorProvider,
  PortableTextEditable,
  useEditor,
  useEditorSelector,
} from '@portabletext/editor'
import type {EditorEmittedEvent, EditorSelection, PortableTextBlock} from '@portabletext/editor'
import {EventListenerPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {
  getActiveStyle,
  isActiveAnnotation,
  isActiveDecorator,
  isActiveListItem,
  isSelectionCollapsed,
} from '@portabletext/editor/selectors'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {KeyboardEvent, MutableRefObject, ReactNode} from 'react'

import {
  BodyEditorStyles,
  BodyIssuesNotice,
  BodyRenderBoundary,
  RawBodyContent,
  bodyNodes,
  createBodyNodes,
} from './bodyNodes'
import type {BodyNodeOptions} from './bodyNodes'
import {
  LINK_ANNOTATION,
  bodySchemaDefinition,
  normalizeLinkHref,
  validateBodyValue,
} from './bodySchema'
import type {BodyIssue, BodyStyleName} from './bodySchema'

/* ------------------------------------------------------------------------------------------ */
/* Public component                                                                           */
/* ------------------------------------------------------------------------------------------ */

/**
 * A handle to read the editor's current content. `onChange` follows the editor's mutation events,
 * which arrive up to about a second after typing, so a Save or Cancel pressed right after typing
 * must read the content from here instead of from the last `onChange` value.
 */
export interface ArticleBodyEditorHandle {
  /** The content as the editor holds it right now. */
  getValue: () => PortableTextBlock[]
}

export interface ArticleBodyEditorProps {
  /**
   * The stored `body` (Portable Text). It is validated and loaded once, when the editor mounts;
   * later changes to this prop are not pushed into the editor. Give the editor a new `key` to
   * load a different article.
   */
  value: unknown
  /** Called with the full body after every edit. Never called for content that failed validation. */
  onChange: (value: PortableTextBlock[]) => void
  /**
   * Called when the stored content cannot be edited here. The editor then shows the problem and
   * the stored content unchanged, and never calls `onChange`, so the caller should block saving.
   */
  onInvalid?: (issues: BodyIssue[]) => void
  /** Filled while the editor is mounted and cleared when it unmounts or cannot edit the content. */
  handleRef?: MutableRefObject<ArticleBodyEditorHandle | null>
  readOnly?: boolean
  placeholder?: string
  ariaLabel?: string
  /** Optional image URL resolver for embedded images. Keep it referentially stable. */
  resolveImageUrl?: BodyNodeOptions['resolveImageUrl']
  className?: string
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function ArticleBodyEditor({
  value,
  onChange,
  onInvalid,
  handleRef,
  readOnly = false,
  placeholder = 'Write the full article here…',
  ariaLabel = 'Article body',
  resolveImageUrl,
  className,
}: ArticleBodyEditorProps) {
  // Content is judged once, as stored, before the editor ever sees it.
  const [initial] = useState(() => ({value, validation: validateBodyValue(value)}))
  const [runtimeIssue, setRuntimeIssue] = useState<string | null>(null)

  const [config] = useState(() => ({
    schemaDefinition: bodySchemaDefinition,
    initialValue: (initial.value ?? undefined) as PortableTextBlock[] | undefined,
    readOnly,
  }))
  const nodes = useMemo(
    () => (resolveImageUrl ? createBodyNodes({resolveImageUrl}) : bodyNodes),
    [resolveImageUrl],
  )

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const handleEvent = useCallback((event: EditorEmittedEvent) => {
    if (event.type === 'mutation') {
      onChangeRef.current(event.value ?? [])
    } else if (event.type === 'invalid value') {
      setRuntimeIssue(event.resolution?.description ?? 'The editor could not load this content.')
    }
  }, [])

  const renderPlaceholder = useCallback(
    () => <span className="ecc-pte-placeholder">{placeholder}</span>,
    [placeholder],
  )

  if (initial.validation.hasErrors) {
    return (
      <InvalidBody
        issues={initial.validation.issues}
        value={initial.value}
        onInvalid={onInvalid}
        className={className}
      />
    )
  }

  if (runtimeIssue) {
    return (
      <InvalidBody
        issues={[
          {severity: 'error', message: `The editor could not load this content: ${runtimeIssue}`},
        ]}
        value={initial.value}
        onInvalid={onInvalid}
        className={className}
      />
    )
  }

  return (
    <BodyRenderBoundary
      fallback={(error) => (
        <InvalidBody
          issues={[
            {severity: 'error', message: `The editor failed to display this content: ${error.message}`},
          ]}
          value={initial.value}
          onInvalid={onInvalid}
          className={className}
        />
      )}
    >
      <EditorProvider initialConfig={config}>
        <NodePlugin nodes={nodes} />
        <EventListenerPlugin on={handleEvent} />
        <ReadOnlySync readOnly={readOnly} />
        {handleRef ? <HandleBridge handleRef={handleRef} /> : null}
        <div className={cx('ecc-pte', readOnly && 'ecc-pte--readonly', className)}>
          <BodyEditorStyles />
          <EditorToolbar disabled={readOnly} />
          <BodyIssuesNotice issues={initial.validation.issues} />
          <PortableTextEditable
            className="ecc-pte-editable"
            aria-label={ariaLabel}
            renderPlaceholder={renderPlaceholder}
            spellCheck
          />
        </div>
      </EditorProvider>
    </BodyRenderBoundary>
  )
}

/* ------------------------------------------------------------------------------------------ */
/* Invalid content                                                                            */
/* ------------------------------------------------------------------------------------------ */

function InvalidBody({
  issues,
  value,
  onInvalid,
  className,
}: {
  issues: BodyIssue[]
  value: unknown
  onInvalid?: (issues: BodyIssue[]) => void
  className?: string
}) {
  const onInvalidRef = useRef(onInvalid)
  useEffect(() => {
    onInvalidRef.current = onInvalid
  })
  useEffect(() => {
    onInvalidRef.current?.(issues)
  }, [issues])

  return (
    <div className={cx('ecc-pte', 'ecc-pte--invalid', className)}>
      <BodyEditorStyles />
      <BodyIssuesNotice issues={issues} />
      <RawBodyContent value={value} />
    </div>
  )
}

/* ------------------------------------------------------------------------------------------ */
/* Read-only sync                                                                             */
/* ------------------------------------------------------------------------------------------ */

function HandleBridge({handleRef}: {handleRef: MutableRefObject<ArticleBodyEditorHandle | null>}) {
  const editor = useEditor()

  useEffect(() => {
    const handle: ArticleBodyEditorHandle = {getValue: () => editor.getSnapshot().context.value}
    handleRef.current = handle
    return () => {
      if (handleRef.current === handle) handleRef.current = null
    }
  }, [editor, handleRef])

  return null
}

function ReadOnlySync({readOnly}: {readOnly: boolean}) {
  const editor = useEditor()
  const isFirstRun = useRef(true)

  useEffect(() => {
    // The initial value of `readOnly` is already part of the editor's config.
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    editor.send({type: 'update readOnly', readOnly})
  }, [editor, readOnly])

  return null
}

/* ------------------------------------------------------------------------------------------ */
/* Toolbar                                                                                    */
/* ------------------------------------------------------------------------------------------ */

// Selectors are created once so their identity is stable across renders.
const IS_BOLD = isActiveDecorator('strong')
const IS_ITALIC = isActiveDecorator('em')
const IS_BULLET = isActiveListItem('bullet')
const IS_NUMBER = isActiveListItem('number')
const HAS_LINK = isActiveAnnotation(LINK_ANNOTATION, {mode: 'partial'})

const STYLE_BUTTONS: ReadonlyArray<{style: BodyStyleName; label: string; text: string}> = [
  {style: 'normal', label: 'Paragraph', text: 'P'},
  {style: 'h1', label: 'Heading 1', text: 'H1'},
  {style: 'h2', label: 'Heading 2', text: 'H2'},
  {style: 'h3', label: 'Heading 3', text: 'H3'},
  {style: 'blockquote', label: 'Quote', text: '“ ”'},
]

interface ToolButtonProps {
  label: string
  onClick: () => void
  pressed?: boolean
  disabled?: boolean
  className?: string
  children: ReactNode
}

function ToolButton({label, onClick, pressed, disabled, className, children}: ToolButtonProps) {
  return (
    <button
      type="button"
      className={cx('ecc-pte-tool', className)}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      // Keep the text selection in the editor when a toolbar button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

interface LinkDraft {
  href: string
  selection: NonNullable<EditorSelection>
  error: string | null
}

function EditorToolbar({disabled}: {disabled: boolean}) {
  const editor = useEditor()
  const activeStyle = useEditorSelector(editor, getActiveStyle) ?? 'normal'
  const isBold = useEditorSelector(editor, IS_BOLD)
  const isItalic = useEditorSelector(editor, IS_ITALIC)
  const isBullet = useEditorSelector(editor, IS_BULLET)
  const isNumber = useEditorSelector(editor, IS_NUMBER)
  const hasLink = useEditorSelector(editor, HAS_LINK)
  const selectionCollapsed = useEditorSelector(editor, isSelectionCollapsed)

  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null)

  const focusEditor = () => editor.send({type: 'focus'})

  const applyStyle = (style: BodyStyleName) => {
    editor.send(style === 'normal' ? {type: 'style.add', style} : {type: 'style.toggle', style})
    focusEditor()
  }

  const toggleLink = () => {
    if (hasLink) {
      editor.send({type: 'annotation.remove', annotation: {name: LINK_ANNOTATION}})
      focusEditor()
      return
    }
    // The input takes focus, so remember what was selected.
    const selection = editor.getSnapshot().context.selection
    if (selection) setLinkDraft({href: '', selection, error: null})
  }

  const applyLink = () => {
    if (!linkDraft) return
    const href = normalizeLinkHref(linkDraft.href)
    if (!href) {
      setLinkDraft({
        ...linkDraft,
        error: 'Enter a web address (https://…), an email link (mailto:) or a phone link (tel:).',
      })
      return
    }
    editor.send({
      type: 'annotation.add',
      annotation: {name: LINK_ANNOTATION, value: {href}},
      at: linkDraft.selection,
    })
    setLinkDraft(null)
    focusEditor()
  }

  const cancelLink = () => {
    setLinkDraft(null)
    focusEditor()
  }

  const onLinkKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      applyLink()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancelLink()
    }
  }

  return (
    <div className="ecc-pte-toolbar" role="toolbar" aria-label="Formatting">
      <div className="ecc-pte-group" role="group" aria-label="Text style">
        {STYLE_BUTTONS.map(({style, label, text}) => (
          <ToolButton
            key={style}
            label={label}
            pressed={activeStyle === style}
            disabled={disabled}
            onClick={() => applyStyle(style)}
          >
            {text}
          </ToolButton>
        ))}
      </div>

      <div className="ecc-pte-group" role="group" aria-label="Emphasis">
        <ToolButton
          label="Bold"
          pressed={isBold}
          disabled={disabled}
          onClick={() => {
            editor.send({type: 'decorator.toggle', decorator: 'strong'})
            focusEditor()
          }}
        >
          <strong>B</strong>
        </ToolButton>
        <ToolButton
          label="Italic"
          pressed={isItalic}
          disabled={disabled}
          className="ecc-pte-tool--em"
          onClick={() => {
            editor.send({type: 'decorator.toggle', decorator: 'em'})
            focusEditor()
          }}
        >
          I
        </ToolButton>
      </div>

      <div className="ecc-pte-group" role="group" aria-label="Lists">
        <ToolButton
          label="Bulleted list"
          pressed={isBullet}
          disabled={disabled}
          onClick={() => {
            editor.send({type: 'list item.toggle', listItem: 'bullet'})
            focusEditor()
          }}
        >
          • List
        </ToolButton>
        <ToolButton
          label="Numbered list"
          pressed={isNumber}
          disabled={disabled}
          onClick={() => {
            editor.send({type: 'list item.toggle', listItem: 'number'})
            focusEditor()
          }}
        >
          1. List
        </ToolButton>
      </div>

      <div className="ecc-pte-group" role="group" aria-label="Insert">
        <ToolButton
          label={hasLink ? 'Remove link' : 'Add link to selected text'}
          pressed={hasLink}
          disabled={disabled || (!hasLink && selectionCollapsed)}
          onClick={toggleLink}
        >
          Link
        </ToolButton>
        {/* Image upload is intentionally not available yet. Existing images are preserved. */}
        <button
          type="button"
          className="ecc-pte-tool"
          disabled
          aria-disabled="true"
          aria-label="Insert image (not available yet)"
          title="Image upload is not available yet"
        >
          Image
        </button>
      </div>

      {linkDraft ? (
        <div className="ecc-pte-linkform">
          <input
            type="text"
            value={linkDraft.href}
            placeholder="https://example.com"
            aria-label="Link address"
            aria-invalid={linkDraft.error ? true : undefined}
            autoFocus
            onChange={(event) => setLinkDraft({...linkDraft, href: event.target.value, error: null})}
            onKeyDown={onLinkKeyDown}
          />
          <ToolButton label="Apply link" onClick={applyLink}>
            Apply
          </ToolButton>
          <ToolButton label="Cancel" onClick={cancelLink}>
            Cancel
          </ToolButton>
          {linkDraft.error ? (
            <p className="ecc-pte-linkform-error" role="alert">
              {linkDraft.error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
