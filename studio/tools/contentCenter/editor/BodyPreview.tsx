import {EditorProvider, PortableTextEditable, useEditor} from '@portabletext/editor'
import type {EditorEmittedEvent, PortableTextBlock} from '@portabletext/editor'
import {EventListenerPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {useCallback, useEffect, useMemo, useState} from 'react'

import {
  BodyEditorStyles,
  BodyIssuesNotice,
  BodyRenderBoundary,
  RawBodyContent,
  bodyNodes,
  createBodyNodes,
} from './bodyNodes'
import type {BodyNodeOptions} from './bodyNodes'
import {bodySchemaDefinition, validateBodyValue} from './bodySchema'
import type {BodyIssue} from './bodySchema'

export interface BodyPreviewProps {
  /** The `body` to display. May change over time, for example to mirror an editor. */
  value: unknown
  /** Shown when the body has no content. */
  emptyMessage?: string
  /** Optional image URL resolver for embedded images. Keep it referentially stable. */
  resolveImageUrl?: BodyNodeOptions['resolveImageUrl']
  className?: string
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * A read-only rendering of article body content, drawn by the same node registrations the editor
 * uses so the two always look alike. Content that cannot be shown faithfully is never skipped:
 * a visible error is shown together with the stored content.
 */
export function BodyPreview({
  value,
  emptyMessage = 'Nothing to preview yet.',
  resolveImageUrl,
  className,
}: BodyPreviewProps) {
  const validation = useMemo(() => validateBodyValue(value), [value])
  const [runtimeIssue, setRuntimeIssue] = useState<string | null>(null)

  // The engine only reads `initialValue` once; later values arrive through ValueSync.
  const [config] = useState(() => ({
    schemaDefinition: bodySchemaDefinition,
    initialValue: ((validation.hasErrors ? undefined : value) ?? undefined) as
      | PortableTextBlock[]
      | undefined,
    readOnly: true,
  }))
  const nodes = useMemo(
    () => (resolveImageUrl ? createBodyNodes({resolveImageUrl}) : bodyNodes),
    [resolveImageUrl],
  )

  const handleEvent = useCallback((event: EditorEmittedEvent) => {
    if (event.type === 'invalid value') {
      setRuntimeIssue(event.resolution?.description ?? 'The preview could not load this content.')
    }
  }, [])

  // A new value gets another chance to render.
  useEffect(() => {
    setRuntimeIssue(null)
  }, [value])

  const isEmpty = value === undefined || value === null || (Array.isArray(value) && value.length === 0)

  if (validation.hasErrors) {
    return <PreviewProblem issues={validation.issues} value={value} className={className} />
  }

  if (runtimeIssue) {
    return (
      <PreviewProblem
        issues={[{severity: 'error', message: `The preview could not show this content: ${runtimeIssue}`}]}
        value={value}
        className={className}
      />
    )
  }

  if (isEmpty) {
    return (
      <div className={cx('ecc-pte', 'ecc-pte--readonly', className)}>
        <BodyEditorStyles />
        <p className="ecc-pte-preview-empty">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <BodyRenderBoundary
      fallback={(error) => (
        <PreviewProblem
          issues={[{severity: 'error', message: `The preview failed to display this content: ${error.message}`}]}
          value={value}
          className={className}
        />
      )}
    >
      <EditorProvider initialConfig={config}>
        <NodePlugin nodes={nodes} />
        <EventListenerPlugin on={handleEvent} />
        <ValueSync value={value as PortableTextBlock[]} />
        <div className={cx('ecc-pte', 'ecc-pte--readonly', className)}>
          <BodyEditorStyles />
          <BodyIssuesNotice issues={validation.issues} />
          <PortableTextEditable className="ecc-pte-preview" aria-label="Article body preview" />
        </div>
      </EditorProvider>
    </BodyRenderBoundary>
  )
}

function PreviewProblem({
  issues,
  value,
  className,
}: {
  issues: BodyIssue[]
  value: unknown
  className?: string
}) {
  return (
    <div className={cx('ecc-pte', 'ecc-pte--readonly', 'ecc-pte--invalid', className)}>
      <BodyEditorStyles />
      <BodyIssuesNotice issues={issues} title="This article body cannot be previewed faithfully." />
      <RawBodyContent value={value} />
    </div>
  )
}

/**
 * Keeps the read-only engine in step with `value` without remounting it. It also runs on mount,
 * because the engine can mount after the value was empty or invalid; sending a value the engine
 * already holds changes nothing.
 */
function ValueSync({value}: {value: PortableTextBlock[]}) {
  const editor = useEditor()

  useEffect(() => {
    editor.send({type: 'update value', value})
  }, [editor, value])

  return null
}
