import {defineSchema} from '@portabletext/editor'

/**
 * Editor-side schema for the `body` field of `globalInsight`.
 *
 * It mirrors what the Sanity schema stores (`{type: 'block'}` plus an `image` object with a
 * `caption` string) but only declares what the Content Center editor can author safely. Anything
 * outside this list is reported by `validateBodyValue` instead of being edited or dropped.
 */

export const BODY_STYLE_NAMES = ['normal', 'h1', 'h2', 'h3', 'blockquote'] as const
export const BODY_LIST_NAMES = ['bullet', 'number'] as const
export const BODY_DECORATOR_NAMES = ['strong', 'em'] as const
export const LINK_ANNOTATION = 'link'
export const IMAGE_BLOCK = 'image'

export type BodyStyleName = (typeof BODY_STYLE_NAMES)[number]
export type BodyListName = (typeof BODY_LIST_NAMES)[number]

/** Deepest list level the editor styles. Deeper levels still render, at this level's indent. */
export const MAX_LIST_LEVEL = 4

export const bodySchemaDefinition = defineSchema({
  styles: [
    {name: 'normal', title: 'Paragraph'},
    {name: 'h1', title: 'Heading 1'},
    {name: 'h2', title: 'Heading 2'},
    {name: 'h3', title: 'Heading 3'},
    {name: 'blockquote', title: 'Quote'},
  ],
  lists: [
    {name: 'bullet', title: 'Bulleted list'},
    {name: 'number', title: 'Numbered list'},
  ],
  decorators: [
    {name: 'strong', title: 'Bold'},
    {name: 'em', title: 'Italic'},
  ],
  annotations: [{name: LINK_ANNOTATION, title: 'Link', fields: [{name: 'href', type: 'string'}]}],
  inlineObjects: [],
  // The existing embedded image. Only `caption` is declared; `asset`, `hotspot` and `crop` are
  // not editable here and are carried through untouched with the block.
  blockObjects: [
    {
      name: IMAGE_BLOCK,
      title: 'Image',
      fields: [{name: 'caption', type: 'string', title: 'Image Caption'}],
    },
  ],
})

/* ------------------------------------------------------------------------------------------ */
/* Links                                                                                      */
/* ------------------------------------------------------------------------------------------ */

const SAFE_SCHEME = /^(https?:|mailto:|tel:)/i

/** True for addresses that are safe to put in an `href` (no `javascript:`, `data:` and so on). */
export function isSafeHref(href: unknown): href is string {
  if (typeof href !== 'string') return false
  const value = href.trim()
  if (!value) return false
  return SAFE_SCHEME.test(value) || value.startsWith('/') || value.startsWith('#')
}

/**
 * Turns what an editor typed into a storable link address, or null when it is not usable.
 * A bare domain such as `elmivet.com/insights` becomes `https://elmivet.com/insights`.
 */
export function normalizeLinkHref(input: string): string | null {
  const value = input.trim()
  if (!value || /\s/.test(value)) return null
  if (SAFE_SCHEME.test(value) || value.startsWith('/') || value.startsWith('#')) return value
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null // some other scheme, e.g. javascript:
  return /^[^./@]+(\.[^./@]+)+(\/.*)?$/.test(value) ? `https://${value}` : null
}

/* ------------------------------------------------------------------------------------------ */
/* Validation of existing content                                                             */
/* ------------------------------------------------------------------------------------------ */

export type BodyIssueSeverity = 'error' | 'warning'

export interface BodyIssue {
  /** Errors block editing: the content cannot be edited here without changing or losing data. */
  severity: BodyIssueSeverity
  message: string
  blockIndex?: number
  blockKey?: string
}

export interface BodyValidation {
  issues: BodyIssue[]
  hasErrors: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const STYLE_SET: ReadonlySet<string> = new Set(BODY_STYLE_NAMES)
const LIST_SET: ReadonlySet<string> = new Set(BODY_LIST_NAMES)
const DECORATOR_SET: ReadonlySet<string> = new Set(BODY_DECORATOR_NAMES)

/**
 * Checks stored Portable Text against what this editor can represent without changing it.
 *
 * The editor itself repairs some problems silently (missing keys, orphaned mark definitions) and
 * does not check styles, list types or marks at all, so it cannot be relied on to tell the editor
 * that content would be altered. This runs before the editor is mounted: any `error` means the
 * caller must show the content as-is with a visible message rather than load it into the editor.
 */
export function validateBodyValue(value: unknown): BodyValidation {
  const issues: BodyIssue[] = []

  if (value === undefined || value === null) return {issues, hasErrors: false}

  if (!Array.isArray(value)) {
    issues.push({severity: 'error', message: 'The article body is not a list of content blocks.'})
    return {issues, hasErrors: true}
  }

  value.forEach((block: unknown, blockIndex) => {
    const position = `Block ${blockIndex + 1}`

    if (!isRecord(block)) {
      issues.push({severity: 'error', blockIndex, message: `${position} is not a content block.`})
      return
    }

    const blockKey = typeof block._key === 'string' ? block._key : undefined
    const report = (severity: BodyIssueSeverity, message: string) =>
      issues.push({severity, blockIndex, blockKey, message: `${position}: ${message}`})

    if (!blockKey) report('warning', 'it has no key; the editor will assign one.')

    if (block._type === IMAGE_BLOCK) {
      if (block.caption !== undefined && typeof block.caption !== 'string') {
        report('error', 'the image caption is not text.')
      }
      return
    }

    if (block._type !== 'block') {
      const type = typeof block._type === 'string' ? `“${block._type}”` : '(missing)'
      report('error', `the block type ${type} is not supported by this editor.`)
      return
    }

    if (block.style !== undefined && !(typeof block.style === 'string' && STYLE_SET.has(block.style))) {
      report('error', `the style “${String(block.style)}” is not supported by this editor.`)
    }

    if (block.listItem !== undefined) {
      if (!(typeof block.listItem === 'string' && LIST_SET.has(block.listItem))) {
        report('error', `the list type “${String(block.listItem)}” is not supported by this editor.`)
      }
      if (
        block.level !== undefined &&
        !(typeof block.level === 'number' && Number.isInteger(block.level) && block.level >= 1)
      ) {
        report('error', 'the list level is not a positive whole number.')
      }
    }

    // Mark definitions (links).
    const markKeys = new Set<string>()
    if (block.markDefs !== undefined && !Array.isArray(block.markDefs)) {
      report('error', 'its link definitions are malformed.')
    } else if (Array.isArray(block.markDefs)) {
      block.markDefs.forEach((def: unknown) => {
        if (!isRecord(def) || typeof def._key !== 'string') {
          report('error', 'a link definition is malformed.')
          return
        }
        markKeys.add(def._key)
        if (def._type !== LINK_ANNOTATION) {
          report('error', `the annotation type “${String(def._type)}” is not supported by this editor.`)
        } else if (typeof def.href !== 'string') {
          report('error', 'a link has no web address.')
        }
      })
    }

    // Children.
    if (!Array.isArray(block.children)) {
      report('error', 'its text content is missing or malformed.')
      return
    }
    if (block.children.length === 0) report('warning', 'it has no text; an empty line will be added.')

    const usedMarks = new Set<string>()
    block.children.forEach((child: unknown) => {
      if (!isRecord(child)) {
        report('error', 'it contains an item that is not text.')
        return
      }
      if (child._type !== 'span') {
        report('error', `it contains an inline item (“${String(child._type)}”) that is not supported.`)
        return
      }
      if (typeof child.text !== 'string') report('error', 'a piece of text has no text value.')

      if (child.marks === undefined) return
      if (!Array.isArray(child.marks)) {
        report('error', 'a piece of text has malformed formatting.')
        return
      }
      child.marks.forEach((mark: unknown) => {
        if (typeof mark !== 'string') {
          report('error', 'a piece of text has malformed formatting.')
        } else if (DECORATOR_SET.has(mark)) {
          // Supported decorator.
        } else if (markKeys.has(mark)) {
          usedMarks.add(mark)
        } else {
          report('error', `the formatting “${mark}” is not supported by this editor.`)
        }
      })
    })

    if ([...markKeys].some((key) => !usedMarks.has(key))) {
      report('warning', 'it has link data that is not used by any text; it will be removed.')
    }
  })

  return {issues, hasErrors: issues.some((issue) => issue.severity === 'error')}
}
