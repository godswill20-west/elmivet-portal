import {
  defineAnnotation,
  defineBlockObject,
  defineDecorator,
  defineTextBlock,
} from '@portabletext/editor'
import type {PortableTextObject, RegistrableNode, TextBlockRenderProps} from '@portabletext/editor'
import {Component} from 'react'
import type {ErrorInfo, ReactElement, ReactNode} from 'react'

import {IMAGE_BLOCK, LINK_ANNOTATION, MAX_LIST_LEVEL, isSafeHref} from './bodySchema'
import type {BodyIssue} from './bodySchema'

/* ------------------------------------------------------------------------------------------ */
/* Node registrations (rendered through <NodePlugin nodes={...} />)                           */
/* ------------------------------------------------------------------------------------------ */

export interface BodyNodeOptions {
  /**
   * Resolves a displayable URL for an embedded image block. Without it the editor shows a
   * labelled placeholder (the image itself is preserved either way).
   */
  resolveImageUrl?: (image: PortableTextObject) => string | undefined
}

function textBlockClassName(style: string, listItem: string | undefined, level: number): string {
  const classes = ['ecc-pte-block', `ecc-pte-block--${style}`]
  if (listItem) {
    classes.push(
      'ecc-pte-block--list',
      `ecc-pte-block--${listItem}`,
      `ecc-pte-level-${Math.min(Math.max(level, 1), MAX_LIST_LEVEL)}`,
    )
  }
  return classes.join(' ')
}

/** Plain function render (no hooks): the outer element of one paragraph, heading, quote or list item. */
function renderTextBlock({attributes, children, node}: TextBlockRenderProps): ReactElement {
  const style = node.style ?? 'normal'
  const level = typeof node.level === 'number' ? node.level : 1
  const className = textBlockClassName(style, node.listItem, level)

  switch (style) {
    case 'h1':
      return (
        <h1 {...attributes} className={className}>
          {children}
        </h1>
      )
    case 'h2':
      return (
        <h2 {...attributes} className={className}>
          {children}
        </h2>
      )
    case 'h3':
      return (
        <h3 {...attributes} className={className}>
          {children}
        </h3>
      )
    case 'blockquote':
      return (
        <blockquote {...attributes} className={className}>
          {children}
        </blockquote>
      )
    default:
      return (
        <p {...attributes} className={className}>
          {children}
        </p>
      )
  }
}

export function createBodyNodes(options: BodyNodeOptions = {}): RegistrableNode[] {
  const {resolveImageUrl} = options

  return [
    defineTextBlock({type: 'block', render: renderTextBlock}),

    defineDecorator({
      type: 'strong',
      render: ({children}) => <strong className="ecc-pte-strong">{children}</strong>,
    }),
    defineDecorator({
      type: 'em',
      render: ({children}) => <em className="ecc-pte-em">{children}</em>,
    }),

    defineAnnotation({
      type: LINK_ANNOTATION,
      render: ({annotation, children}) => {
        const href = typeof annotation.href === 'string' ? annotation.href : ''
        return (
          <a
            className="ecc-pte-link"
            href={isSafeHref(href) ? href : undefined}
            title={href || undefined}
            rel="noreferrer noopener"
            // Inside the editor and the preview a click must never navigate away from the form.
            onClick={(event) => event.preventDefault()}
          >
            {children}
          </a>
        )
      },
    }),

    defineBlockObject({
      type: IMAGE_BLOCK,
      render: ({attributes, children, node, selected}) => {
        const caption = typeof node.caption === 'string' ? node.caption.trim() : ''
        const asset = node.asset as {_ref?: unknown} | undefined
        const assetRef = typeof asset?._ref === 'string' ? asset._ref : ''
        const url = resolveImageUrl?.(node)

        return (
          <div
            {...attributes}
            className={`ecc-pte-image${selected ? ' ecc-pte-image--selected' : ''}`}
          >
            {/* `children` is the engine's caret anchor and must stay inside the block. */}
            {children}
            <figure className="ecc-pte-figure" contentEditable={false}>
              {url ? (
                <img className="ecc-pte-img" src={url} alt={caption} draggable={false} />
              ) : (
                <div className="ecc-pte-img-placeholder">
                  <strong>Embedded image</strong>
                  {assetRef ? <span title={assetRef}>{assetRef}</span> : <span>No file attached</span>}
                </div>
              )}
              <figcaption className={caption ? 'ecc-pte-caption' : 'ecc-pte-caption is-empty'}>
                {caption || 'No caption'}
              </figcaption>
            </figure>
          </div>
        )
      },
    }),
  ]
}

/** Stable default registrations. Pass this (or a memoised `createBodyNodes()`) to `<NodePlugin>`. */
export const bodyNodes: RegistrableNode[] = createBodyNodes()

/* ------------------------------------------------------------------------------------------ */
/* Shared pieces: issue notice, raw content, error boundary                                    */
/* ------------------------------------------------------------------------------------------ */

/** Lists problems found in stored content. Errors read as alerts; warnings as notes. */
export function BodyIssuesNotice({issues, title}: {issues: BodyIssue[]; title?: string}) {
  if (issues.length === 0) return null
  const hasErrors = issues.some((issue) => issue.severity === 'error')

  return (
    <div
      className={`ecc-pte-notice ${hasErrors ? 'ecc-pte-notice--error' : 'ecc-pte-notice--warn'}`}
      role={hasErrors ? 'alert' : 'status'}
    >
      <strong className="ecc-pte-notice-title">
        {title ??
          (hasErrors
            ? 'This article body cannot be edited here without changing it.'
            : 'This article body will be adjusted when it is loaded.')}
      </strong>
      <ul className="ecc-pte-notice-list">
        {issues.map((issue, index) => (
          <li key={`${issue.blockKey ?? issue.blockIndex ?? 'body'}-${index}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  )
}

/** The stored content exactly as it is, so nothing is hidden when the editor cannot show it. */
export function RawBodyContent({value}: {value: unknown}) {
  let json: string
  try {
    json = JSON.stringify(value ?? [], null, 2)
  } catch {
    json = 'The stored content could not be displayed.'
  }

  return (
    <details className="ecc-pte-raw" open>
      <summary>Stored content (unchanged)</summary>
      <pre className="ecc-pte-raw-pre" tabIndex={0}>
        {json}
      </pre>
    </details>
  )
}

interface BoundaryProps {
  /** What to show when a child throws while rendering. */
  fallback: (error: Error) => ReactNode
  children: ReactNode
}

/** Stops a rendering failure inside the editor or preview from taking the surrounding form down. */
export class BodyRenderBoundary extends Component<BoundaryProps, {error: Error | null}> {
  state: {error: Error | null} = {error: null}

  static getDerivedStateFromError(error: Error) {
    return {error}
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Content Center] The article body editor failed to render.', error, info.componentStack)
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Styles: every selector is scoped to a new `ecc-pte-*` class                                 */
/* ------------------------------------------------------------------------------------------ */

const levelRules = Array.from({length: MAX_LIST_LEVEL}, (_, index) => {
  const level = index + 1
  const deeper = Array.from({length: MAX_LIST_LEVEL - level}, (__, i) => `ecc-n${level + i + 1}`)
  const fromHere = [`ecc-n${level}`, ...deeper]
  return `
.ecc-pte-block--list.ecc-pte-level-${level} { padding-left: ${level * 24 + 4}px; counter-reset: ${fromHere.join(' ')}; }
.ecc-pte-block--list.ecc-pte-level-${level}::before { left: ${level * 24 - 20}px; }
.ecc-pte-block--number.ecc-pte-level-${level} { counter-reset: ${deeper.join(' ') || 'ecc-none'}; counter-increment: ecc-n${level}; }
.ecc-pte-block--number.ecc-pte-level-${level}::before { content: counter(ecc-n${level}) '.'; }`
}).join('')

export const BODY_EDITOR_CSS = `
.ecc-pte {
  --pte-navy: var(--ecc-navy, #0A2540);
  --pte-navy2: var(--ecc-navy2, #143A63);
  --pte-ivory: var(--ecc-ivory, #FAF7F0);
  --pte-line: var(--ecc-line, #E7E1D3);
  --pte-ink: var(--ecc-ink, #0F172A);
  --pte-body: var(--ecc-body, #475569);
  --pte-muted: var(--ecc-muted, #7A8696);
  --pte-red: var(--ecc-red, #C81E28);
  --pte-amber: var(--ecc-amber, #946200);
  --pte-amberbg: var(--ecc-amberbg, #FBF0D9);
  --pte-serif: var(--ecc-serif, 'Playfair Display', Georgia, serif);
  --pte-sans: var(--ecc-sans, Inter, system-ui, -apple-system, 'Segoe UI', sans-serif);
  display: flex; flex-direction: column; min-width: 0;
  border: 1px solid var(--pte-line); border-radius: 10px; background: #fff;
  font-family: var(--pte-sans);
}
.ecc-pte, .ecc-pte * { box-sizing: border-box; }
.ecc-pte--readonly { background: var(--pte-ivory); }

/* Toolbar */
.ecc-pte-toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 6px 8px;
  border-bottom: 1px solid var(--pte-line); background: var(--pte-ivory); border-radius: 10px 10px 0 0;
}
.ecc-pte-group { display: flex; align-items: center; gap: 2px; }
.ecc-pte-group + .ecc-pte-group { padding-left: 12px; border-left: 1px solid var(--pte-line); }
.ecc-pte-tool {
  min-width: 32px; height: 32px; padding: 0 8px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--pte-ink);
  font: 600 13px/1 var(--pte-sans); cursor: pointer;
}
.ecc-pte-tool:hover:not(:disabled) { background: #fff; border-color: var(--pte-line); }
.ecc-pte-tool[aria-pressed='true'] { background: var(--pte-navy); color: #fff; }
.ecc-pte-tool:focus-visible { outline: 2px solid var(--pte-navy2); outline-offset: 1px; }
.ecc-pte-tool:disabled { opacity: .45; cursor: not-allowed; }
.ecc-pte-tool--em { font-style: italic; font-family: var(--pte-serif); }
.ecc-pte-linkform { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; width: 100%; padding-top: 6px; }
.ecc-pte-linkform input {
  flex: 1 1 220px; min-width: 0; height: 32px; padding: 0 10px; border: 1px solid var(--pte-line); border-radius: 6px;
  font: 400 13px/1 var(--pte-sans); color: var(--pte-ink); background: #fff;
}
.ecc-pte-linkform input:focus-visible { outline: 2px solid var(--pte-navy2); outline-offset: 1px; }
.ecc-pte-linkform-error { flex-basis: 100%; margin: 0; color: var(--pte-red); font-size: 12px; }

/* Editable surface */
.ecc-pte-editable {
  min-height: 280px; padding: 16px 18px; outline: none; color: var(--pte-ink);
  font: 400 15px/1.7 var(--pte-sans); overflow-wrap: anywhere;
}
.ecc-pte-editable:focus-visible { box-shadow: inset 0 0 0 2px var(--pte-navy2); border-radius: 0 0 10px 10px; }
.ecc-pte-placeholder { color: var(--pte-muted); pointer-events: none; user-select: none; }

/* Blocks */
.ecc-pte-block { position: relative; margin: 0 0 .9em; counter-reset: ecc-n1 ecc-n2 ecc-n3 ecc-n4; }
.ecc-pte-block--h1, .ecc-pte-block--h2, .ecc-pte-block--h3 { font-family: var(--pte-serif); color: var(--pte-navy); font-weight: 600; line-height: 1.25; }
.ecc-pte-block--h1 { font-size: 28px; margin-top: 1.1em; }
.ecc-pte-block--h2 { font-size: 22px; margin-top: 1em; }
.ecc-pte-block--h3 { font-size: 18px; margin-top: .9em; }
.ecc-pte-block--blockquote { margin-left: 0; padding: 2px 0 2px 16px; border-left: 3px solid var(--pte-navy2); color: var(--pte-body); font-style: italic; }
.ecc-pte-block--list { margin-bottom: .35em; }
.ecc-pte-block--list::before { position: absolute; top: 0; width: 20px; text-align: right; color: var(--pte-muted); user-select: none; pointer-events: none; }
.ecc-pte-block--bullet::before { content: '\\2022'; }
${levelRules}
.ecc-pte-strong { font-weight: 700; }
.ecc-pte-em { font-style: italic; }
.ecc-pte-link { color: var(--pte-navy2); text-decoration: underline; text-underline-offset: 2px; cursor: text; }

/* Embedded image (existing content is preserved; uploading is not available here) */
.ecc-pte-image { margin: 0 0 1em; }
.ecc-pte-figure { margin: 0; border: 1px solid var(--pte-line); border-radius: 8px; overflow: hidden; background: var(--pte-ivory); }
.ecc-pte-image--selected .ecc-pte-figure { outline: 2px solid var(--pte-navy2); }
.ecc-pte-img { display: block; width: 100%; height: auto; }
.ecc-pte-img-placeholder { display: flex; flex-direction: column; gap: 2px; padding: 22px 16px; color: var(--pte-body); font-size: 13px; }
.ecc-pte-img-placeholder span { color: var(--pte-muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ecc-pte-caption { padding: 8px 12px; border-top: 1px solid var(--pte-line); font-size: 13px; color: var(--pte-body); }
.ecc-pte-caption.is-empty { color: var(--pte-muted); font-style: italic; }

/* Notices and raw content */
.ecc-pte-notice { margin: 12px; padding: 10px 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; }
.ecc-pte-notice--error { border: 1px solid var(--pte-red); background: #FDECEE; color: #7A1017; }
.ecc-pte-notice--warn { border: 1px solid #E7C98A; background: var(--pte-amberbg); color: var(--pte-amber); }
.ecc-pte-notice-title { display: block; margin-bottom: 4px; }
.ecc-pte-notice-list { margin: 0; padding-left: 18px; }
.ecc-pte-raw { margin: 0 12px 12px; font-size: 12px; color: var(--pte-body); }
.ecc-pte-raw summary { cursor: pointer; font-weight: 600; }
.ecc-pte-raw-pre {
  max-height: 320px; margin: 6px 0 0; padding: 10px; overflow: auto; border: 1px solid var(--pte-line); border-radius: 6px;
  background: #fff; color: var(--pte-ink); font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap;
}

/* Preview */
.ecc-pte-preview { padding: 16px 18px; color: var(--pte-ink); font: 400 15px/1.7 var(--pte-sans); overflow-wrap: anywhere; }
.ecc-pte-preview-empty { margin: 0; padding: 16px 18px; color: var(--pte-muted); font-size: 14px; font-style: italic; }
`

/** Renders the scoped stylesheet. Safe to render from more than one component. */
export function BodyEditorStyles() {
  return <style>{BODY_EDITOR_CSS}</style>
}
