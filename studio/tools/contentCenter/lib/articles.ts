/**
 * Live article data: the GROQ query, the draft/published pairing, filtering and statistics.
 * Everything here is pure (no React, no network) so it can be checked in isolation.
 */
import type {PortableTextBlock} from '@portabletext/editor'

import {ARTICLE_CATEGORIES, DOCUMENT_TYPES, isArticleCategory} from './constants'
import type {ArticleCategory} from './constants'
import {formatDate, formatDateTime, toTime} from './format'
import type {
  ArticleCover,
  ArticleCoverChange,
  ArticleCoverImageValue,
  ArticleDraftDocument,
  ArticleDraftInput,
  ArticleSummary,
  CoverPalette,
  CoverScene,
  DashboardStats,
} from './types'

const DRAFT_PREFIX = 'drafts.'

/**
 * The one projection of an article's `coverImage` field, shared by every query that reads a cover
 * so they cannot drift apart. It returns the asset reference (`assetRef`, the `_ref` of
 * `coverImage.asset`), the image URL, the alt text and the hotspot. Use it as
 * `"cover": ${COVER_IMAGE_PROJECTION}`; the result matches RawArticleDoc['cover'].
 */
export const COVER_IMAGE_PROJECTION = `coverImage{"assetRef": asset._ref, "url": asset->url, alt, hotspot}`

/**
 * Every article in every state, read with the `raw` perspective so drafts are included.
 * Release versions (`versions.*`) are excluded: they are neither drafts nor published.
 */
export const ARTICLES_QUERY = `*[_type == "${DOCUMENT_TYPES.article}" && !(_id in path("versions.**"))] | order(_updatedAt desc) {
  _id,
  _createdAt,
  _updatedAt,
  title,
  excerpt,
  category,
  tag,
  readTime,
  author,
  publishedAt,
  "slug": slug.current,
  "cover": ${COVER_IMAGE_PROJECTION}
}`

/** Listens for changes to any article document (draft or published) so the list stays current. */
export const ARTICLES_LISTEN_QUERY = `*[_type == "${DOCUMENT_TYPES.article}"]`

/** A `globalInsight` document exactly as ARTICLES_QUERY returns it. Any field may be missing. */
export interface RawArticleDoc {
  _id: string
  _createdAt: string
  _updatedAt: string
  title?: string | null
  excerpt?: string | null
  category?: string | null
  tag?: string | null
  readTime?: number | null
  author?: string | null
  publishedAt?: string | null
  slug?: string | null
  cover?: {
    assetRef?: string | null
    url?: string | null
    alt?: string | null
    hotspot?: {x?: number | null; y?: number | null} | null
  } | null
}

export const isDraftId = (id: string): boolean => id.startsWith(DRAFT_PREFIX)

/** `drafts.abc` and `abc` both belong to the article `abc`. */
export const toPublishedId = (id: string): string =>
  isDraftId(id) ? id.slice(DRAFT_PREFIX.length) : id

export const toDraftId = (id: string): string => `${DRAFT_PREFIX}${toPublishedId(id)}`

const PALETTES: Record<string, {scene: CoverScene; palette: CoverPalette}> = {
  'Regulatory Notice': {
    scene: 'port',
    palette: {base: '#0A2540', mid: '#143A63', accent: '#8FB0D6'},
  },
  'Port Operations': {
    scene: 'vessel',
    palette: {base: '#143A63', mid: '#1F4F82', accent: '#9CBBE0'},
  },
  'Global Logistics': {
    scene: 'port',
    palette: {base: '#2C5A8C', mid: '#143A63', accent: '#E8EEF6'},
  },
  'Guangdong Hub': {
    scene: 'hub',
    palette: {base: '#0A2540', mid: '#143A63', accent: '#D9A441'},
  },
}
const FALLBACK_ART = {
  scene: 'port' as CoverScene,
  palette: {base: '#0A2540', mid: '#13335A', accent: '#C9D6E6'},
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/**
 * The cover to display, or null when the document has no cover image that resolves to a URL.
 * Takes anything with a projected `cover`, so a document read by another query (for example the
 * body fetch) can use it too.
 */
export function toCover(doc: {cover?: RawArticleDoc['cover']}): ArticleCover | null {
  const url = doc.cover?.url
  if (!url) return null
  const x = doc.cover?.hotspot?.x
  const y = doc.cover?.hotspot?.y
  const objectPosition =
    typeof x === 'number' && typeof y === 'number'
      ? `${Math.round(clamp01(x) * 100)}% ${Math.round(clamp01(y) * 100)}%`
      : '50% 50%'
  const assetRef = doc.cover?.assetRef
  return {
    url,
    alt: doc.cover?.alt?.trim() ?? '',
    objectPosition,
    assetRef: typeof assetRef === 'string' && assetRef !== '' ? assetRef : null,
  }
}

/** Adds Sanity image-CDN sizing parameters to a cover URL. */
export const coverSrc = (url: string, width: number): string =>
  `${url}?w=${width}&auto=format&fit=max`

interface Pair {
  published?: RawArticleDoc
  draft?: RawArticleDoc
}

/**
 * Pairs each draft with its published counterpart and returns one entry per article.
 * Pairing is by published id (`drafts.x` and `x` are the same article), so an article can never
 * appear twice. Entries keep the order of the input (the query sorts by last update).
 */
export function buildArticles(docs: readonly RawArticleDoc[]): ArticleSummary[] {
  const pairs = new Map<string, Pair>()
  for (const doc of docs) {
    const id = toPublishedId(doc._id)
    const pair = pairs.get(id) ?? {}
    if (isDraftId(doc._id)) pair.draft = doc
    else pair.published = doc
    pairs.set(id, pair)
  }

  const articles: ArticleSummary[] = []
  for (const [id, {published, draft}] of pairs) {
    const shown = draft ?? published
    if (!shown) continue

    const hasPublished = published !== undefined
    const hasDraft = draft !== undefined
    const rawCategory = shown.category?.trim() ?? ''
    const category: ArticleCategory | null = isArticleCategory(rawCategory) ? rawCategory : null
    const art = PALETTES[rawCategory] ?? FALLBACK_ART
    // Dates describe what is LIVE, so they come from the published document, never from a draft.
    const livePublishedAt = published?.publishedAt ?? published?._createdAt ?? null
    const createdAt = [draft?._createdAt, published?._createdAt]
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? shown._createdAt
    const editedLabel = formatDateTime(shown._updatedAt) ?? 'Unknown'

    articles.push({
      id,
      title: shown.title?.trim() || 'Untitled dispatch',
      category,
      categoryLabel: rawCategory || 'Uncategorised',
      tag: shown.tag?.trim() || null,
      status: hasPublished ? 'published' : 'draft',
      hasPublished,
      hasDraft,
      hasUnpublishedChanges: hasPublished && hasDraft,
      dateLabel: hasPublished
        ? (formatDate(livePublishedAt) ?? 'Date unknown')
        : `Edited ${formatDate(shown._updatedAt) ?? 'recently'}`,
      publishedLabel: hasPublished
        ? (formatDateTime(livePublishedAt) ?? 'Date unknown')
        : 'Not published',
      editedLabel,
      excerpt: shown.excerpt?.trim() ?? '',
      readTimeMinutes:
        typeof shown.readTime === 'number' && shown.readTime > 0 ? shown.readTime : null,
      byline: shown.author?.trim() || 'Not set',
      slug: shown.slug?.trim() || null,
      cover: toCover(shown),
      scene: art.scene,
      palette: art.palette,
      createdAt,
      updatedAt: shown._updatedAt,
      leadTime: toTime(published?.publishedAt ?? published?._createdAt),
    })
  }
  return articles
}

/* ------------------------------ Search and filters ----------------------------- */

export type StatusFilter = 'all' | 'published' | 'draft'
export type CategoryFilter = 'all' | ArticleCategory

export interface ArticleFilters {
  query: string
  status: StatusFilter
  category: CategoryFilter
}

export const DEFAULT_FILTERS: ArticleFilters = {query: '', status: 'all', category: 'all'}

/** Lower-cases, strips accents and collapses whitespace so "  Café  Port " matches "cafe port". */
const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const hasActiveFilters = (filters: ArticleFilters): boolean =>
  normalize(filters.query) !== '' || filters.status !== 'all' || filters.category !== 'all'

/**
 * Search (title), status and category combine: an article must satisfy all three. The search
 * matches when every word typed appears in the title, in any order.
 */
export function filterArticles(
  articles: readonly ArticleSummary[],
  filters: ArticleFilters,
): ArticleSummary[] {
  const words = normalize(filters.query).split(' ').filter(Boolean)
  return articles.filter((article) => {
    if (filters.status === 'published' && !article.hasPublished) return false
    if (filters.status === 'draft' && article.hasPublished) return false
    if (filters.category !== 'all' && article.category !== filters.category) return false
    if (words.length > 0) {
      const title = normalize(article.title)
      if (!words.every((word) => title.includes(word))) return false
    }
    return true
  })
}

/* ---------------------------------- Statistics --------------------------------- */

const TREND_MONTHS = 6

/** Counts dates per calendar month for the last TREND_MONTHS months, oldest first. */
function monthlyCounts(dates: readonly string[], now: Date): number[] {
  const counts = new Array<number>(TREND_MONTHS).fill(0)
  for (const iso of dates) {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) continue
    const monthsAgo =
      (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
    if (monthsAgo >= 0 && monthsAgo < TREND_MONTHS) counts[TREND_MONTHS - 1 - monthsAgo] += 1
  }
  return counts
}

export function buildStats(articles: readonly ArticleSummary[], now = new Date()): DashboardStats {
  const published = articles.filter((article) => article.hasPublished)
  const drafts = articles.filter((article) => !article.hasPublished)
  const trend = {
    total: monthlyCounts(
      articles.map((article) => article.createdAt),
      now,
    ),
    published: monthlyCounts(
      published.map((article) => new Date(article.leadTime || 0).toISOString()),
      now,
    ),
    drafts: monthlyCounts(
      drafts.map((article) => article.createdAt),
      now,
    ),
  }
  return {
    total: articles.length,
    published: published.length,
    drafts: drafts.length,
    createdThisMonth: trend.total[TREND_MONTHS - 1] ?? 0,
    trend,
  }
}

/** SVG path for the 70x26 sparkline. A flat baseline when every value is zero. */
export function sparklinePath(values: readonly number[]): string {
  const left = 2
  const right = 68
  const top = 3
  const bottom = 22
  if (values.length < 2) return `M${left} ${bottom}L${right} ${bottom}`
  const max = Math.max(...values)
  const step = (right - left) / (values.length - 1)
  return values
    .map((value, index) => {
      const x = left + index * step
      const y = max === 0 ? bottom : bottom - (value / max) * (bottom - top)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join('')
}

/* ------------------------------- Draft creation -------------------------------- */

/** Limits copied from the `globalInsight` schema. */
export const HEADLINE_MAX_LENGTH = 110
export const SUMMARY_MAX_LENGTH = 260
export const TAG_MAX_LENGTH = 40
const SLUG_MAX_LENGTH = 96

/** "Customs & Compliance: New Rules!" becomes "customs-compliance-new-rules". */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '')
}

/* ------------------------------- Cover image changes --------------------------- */

/** Sanity image asset ids look like `image-<hash>-<width>x<height>-<extension>`. */
export const COVER_ASSET_REF_PATTERN = /^image-[A-Za-z0-9]+-\d+x\d+-[A-Za-z0-9]+$/

export const COVER_ALT_REQUIRED_MESSAGE = 'Enter alternative text for the cover image before saving.'
export const COVER_CHANGE_INVALID_MESSAGE =
  'The cover image change is not valid, so nothing was saved.'
export const COVER_ASSET_INVALID_MESSAGE =
  'The cover image reference is not valid, so nothing was saved.'

/** The fields each kind of cover change may carry. Anything else is contradictory. */
const COVER_CHANGE_FIELDS: Record<ArticleCoverChange['kind'], readonly string[]> = {
  unchanged: ['kind'],
  set: ['kind', 'assetRef', 'alt'],
  alt: ['kind', 'alt'],
  remove: ['kind'],
}

/**
 * Returns a message for the first problem with a cover change, or null when it is acceptable.
 * `undefined` (no change requested) is acceptable. The input is checked at runtime as well as by
 * the compiler, so a malformed or contradictory object can never reach a write:
 * - an unknown kind, or a field that does not belong to the kind (alt text on `remove`, an asset
 *   reference on `alt`, anything on `unchanged`), is rejected rather than ignored;
 * - `set` needs a Sanity image asset reference and non-blank alt text;
 * - `alt` needs non-blank alt text.
 */
export function validateCoverChange(change: unknown): string | null {
  if (change === undefined) return null
  if (typeof change !== 'object' || change === null || Array.isArray(change)) {
    return COVER_CHANGE_INVALID_MESSAGE
  }
  const record = change as Record<string, unknown>
  const kind = record.kind
  if (typeof kind !== 'string' || !Object.prototype.hasOwnProperty.call(COVER_CHANGE_FIELDS, kind)) {
    return COVER_CHANGE_INVALID_MESSAGE
  }
  const allowed = COVER_CHANGE_FIELDS[kind as ArticleCoverChange['kind']]
  const present = Object.keys(record).filter((key) => record[key] !== undefined)
  if (present.some((key) => !allowed.includes(key))) return COVER_CHANGE_INVALID_MESSAGE

  if (kind === 'set') {
    const assetRef = record.assetRef
    if (typeof assetRef !== 'string' || !COVER_ASSET_REF_PATTERN.test(assetRef)) {
      return COVER_ASSET_INVALID_MESSAGE
    }
  }
  if (kind === 'set' || kind === 'alt') {
    const alt = record.alt
    if (typeof alt !== 'string' || alt.trim() === '') return COVER_ALT_REQUIRED_MESSAGE
  }
  return null
}

/** Throws (with the same message validateCoverChange returns) when the change is not valid. */
function requireValidCoverChange(change: ArticleCoverChange | undefined): ArticleCoverChange {
  const problem = validateCoverChange(change)
  if (problem) throw new Error(problem)
  return change ?? {kind: 'unchanged'}
}

/** A fresh image object: asset reference and alt text only, so hotspot and crop start unset. */
function buildCoverImageValue(change: {assetRef: string; alt: string}): ArticleCoverImageValue {
  return {
    _type: 'image',
    asset: {_type: 'reference', _ref: change.assetRef},
    alt: change.alt.trim(),
  }
}

/** Returns a message for the first problem with the form, or null when it can be saved. */
export function validateDraftInput(input: ArticleDraftInput): string | null {
  const headline = input.headline.trim()
  const summary = input.summary.trim()
  if (!headline) return 'Enter a headline before saving.'
  if (headline.length > HEADLINE_MAX_LENGTH) {
    return `The headline must be ${HEADLINE_MAX_LENGTH} characters or fewer.`
  }
  if (!input.category || !(ARTICLE_CATEGORIES as readonly string[]).includes(input.category)) {
    return 'Choose a category before saving.'
  }
  if (!summary) return 'Enter an executive summary before saving.'
  if (summary.length > SUMMARY_MAX_LENGTH) {
    return `The executive summary must be ${SUMMARY_MAX_LENGTH} characters or fewer.`
  }
  if (input.label.trim().length > TAG_MAX_LENGTH) {
    return `The card label must be ${TAG_MAX_LENGTH} characters or fewer.`
  }
  return validateCoverChange(input.coverImage)
}

/** Text of a block's direct span children, or null when the block is not a text block. */
function textOfBlock(block: unknown): string | null {
  if (typeof block !== 'object' || block === null) return null
  const {_type: type, children} = block as {_type?: unknown; children?: unknown}
  if (type !== 'block') return null
  if (!Array.isArray(children)) return ''
  return children
    .map((child) =>
      typeof child === 'object' && child !== null && typeof (child as {text?: unknown}).text === 'string'
        ? (child as {text: string}).text
        : '',
    )
    .join('')
}

/**
 * True when a body holds something worth storing: at least one text block with non-blank text, or
 * any non-text block (an image, for example). An empty editor, or one holding only blank
 * paragraphs, is not meaningful. No minimum length applies: the schema's 200-character rule is a
 * publishing requirement, never a condition for saving a draft.
 */
export function hasMeaningfulBody(body: unknown): body is PortableTextBlock[] {
  if (!Array.isArray(body)) return false
  return body.some((block) => {
    const text = textOfBlock(block)
    return text === null ? typeof block === 'object' && block !== null : text.trim() !== ''
  })
}

/**
 * Builds the document for a brand-new article draft. The `_id` always carries the `drafts.`
 * prefix, so Sanity stores it as an unpublished draft; nothing here creates a published document.
 * Only fields the schema already defines are written. `body` is written only when it has
 * meaningful content (see hasMeaningfulBody) and is stored exactly as the editor produced it.
 * `coverImage` is written only when the cover is explicitly set (`{kind: 'set'}`), as a fresh
 * image object; otherwise it is left out (the schema requires `body` and `coverImage` at publish
 * time, not for drafts). A new article has no cover to update, so an `alt` change throws; `remove`
 * and `unchanged` write nothing.
 * Call only after validateDraftInput() returned null.
 */
export function buildDraftDocument(
  input: ArticleDraftInput,
  publishedId: string = crypto.randomUUID(),
): ArticleDraftDocument {
  const headline = input.headline.trim()
  const label = input.label.trim()
  const cover = requireValidCoverChange(input.coverImage)
  if (cover.kind === 'alt') {
    throw new Error('A new article has no cover image whose alt text could be updated.')
  }
  return {
    _id: toDraftId(publishedId),
    _type: DOCUMENT_TYPES.article,
    title: headline,
    excerpt: input.summary.trim(),
    category: input.category as ArticleDraftDocument['category'],
    ...(label ? {tag: label} : {}),
    // Schema defaults (`initialValue`), applied here because documents created through the
    // client do not receive initial values.
    readTime: 3,
    author: 'Elmivet Editorial Desk',
    publishedAt: new Date().toISOString(),
    slug: {_type: 'slug', current: slugify(headline) || `dispatch-${publishedId.slice(0, 8)}`},
    ...(hasMeaningfulBody(input.body) ? {body: input.body} : {}),
    ...(cover.kind === 'set' ? {coverImage: buildCoverImageValue(cover)} : {}),
  }
}

/* ------------------------------- Draft editing --------------------------------- */

/** Path of the cover's alt text, set on its own so the asset reference, hotspot and crop stay. */
const COVER_ALT_PATH = 'coverImage.alt'

/**
 * What the Edit Article form changes on an existing article. Nothing outside `set` and `unset`
 * is ever written, so `readTime`, `author`, `publishedAt`, `slug` and every other field keep the
 * values they already have. `coverImage` is only touched by an explicit cover change (see
 * ArticleCoverChange): `set` holds it or its `coverImage.alt` path, `unset` holds `coverImage`.
 */
export interface ArticleEditPatch {
  set: Record<string, unknown>
  unset: string[]
}

export type BodyEditCheck = {ok: true; write: boolean} | {ok: false; message: string}

/** Deep equality for plain JSON values (Portable Text blocks), independent of key order. */
function isSameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => isSameValue(item, b[index]))
    )
  }
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.prototype.hasOwnProperty.call(right, key) && isSameValue(left[key], right[key]),
    )
  )
}

export const EMPTIED_BODY_MESSAGE =
  'The article body is empty, so nothing was saved. Restore the text (or close this form to discard your changes): an emptied body is never saved as a draft.'

/**
 * Decides what an edit save may do with the body.
 * - The article had a body and the editor is now empty or blank: blocked, never saved.
 * - The body is unchanged, or there was none and there still is none: `write: false`, so the
 *   stored body is left exactly as it is.
 * - The body has meaningful content and differs from what was loaded: `write: true`.
 */
export function checkBodyForEdit(loaded: unknown, edited: unknown): BodyEditCheck {
  const hadBody = hasMeaningfulBody(loaded)
  const hasBody = hasMeaningfulBody(edited)
  if (hadBody && !hasBody) return {ok: false, message: EMPTIED_BODY_MESSAGE}
  if (!hasBody) return {ok: true, write: false}
  return {ok: true, write: !isSameValue(loaded, edited)}
}

/** Adds the patch entries for one cover change: the single place that maps a change to a write. */
function applyCoverChange(cover: ArticleCoverChange, set: Record<string, unknown>, unset: string[]): void {
  switch (cover.kind) {
    case 'set':
      set.coverImage = buildCoverImageValue(cover)
      break
    case 'alt':
      set[COVER_ALT_PATH] = cover.alt.trim()
      break
    case 'remove':
      unset.push('coverImage')
      break
    case 'unchanged':
      break
  }
}

/**
 * A patch that carries only a cover change and no other field. Used to attach an uploaded cover
 * to a draft that was just created. Throws if the change is invalid (see validateCoverChange).
 */
export function buildCoverOnlyPatch(change: ArticleCoverChange): ArticleEditPatch {
  const set: Record<string, unknown> = {}
  const unset: string[] = []
  applyCoverChange(requireValidCoverChange(change), set, unset)
  return {set, unset}
}

/**
 * The patch for saving edits to an article. Call only after validateDraftInput() returned null.
 * `body` is included only when `writeBody` is true AND the body has meaningful content; an empty
 * body is never written and never unset. A blank card label removes `tag`.
 * The cover follows `input.coverImage` (absent means unchanged):
 * - unchanged: `coverImage` is not in the patch at all, so it is never rewritten;
 * - set: `coverImage` is replaced with a fresh image object (the old hotspot and crop are reset);
 * - alt: only `coverImage.alt` is set, so the asset reference, hotspot and crop are preserved;
 * - remove: `coverImage` is unset. Sanity asset documents are never touched.
 * Throws if the cover change is invalid or contradictory (see validateCoverChange).
 */
export function buildArticleEditPatch(input: ArticleDraftInput, writeBody: boolean): ArticleEditPatch {
  const cover = requireValidCoverChange(input.coverImage)
  const label = input.label.trim()
  const set: Record<string, unknown> = {
    title: input.headline.trim(),
    excerpt: input.summary.trim(),
    category: input.category,
  }
  const unset: string[] = []
  if (label) set.tag = label
  else unset.push('tag')
  if (writeBody && hasMeaningfulBody(input.body)) set.body = input.body
  applyCoverChange(cover, set, unset)
  return {set, unset}
}

/** A draft document: the published document's fields, under a `drafts.` id. */
export interface ArticleDraftCopy {
  _id: string
  _type: string
  [field: string]: unknown
}

/** Server-managed fields that are never copied into a new document. */
const COPY_OMITTED_KEYS = ['_rev', '_createdAt', '_updatedAt', '_system']

const SAFE_PATH_SEGMENT = /^[A-Za-z_][A-Za-z0-9_]*$/
const UNSAFE_PATH_SEGMENTS = ['__proto__', 'constructor', 'prototype']

function splitFieldPath(path: string): string[] {
  const segments = path.split('.')
  if (segments.some((s) => !SAFE_PATH_SEGMENT.test(s) || UNSAFE_PATH_SEGMENTS.includes(s))) {
    throw new Error(`The field path "${path}" is not supported, so nothing was saved.`)
  }
  return segments
}

/**
 * Applies one `set` entry to the copy. A dotted path such as `coverImage.alt` is applied INSIDE
 * the existing object (Sanity's patch does the same on a draft), never stored as a top-level key
 * named "coverImage.alt". Every object on the way down is cloned first, so the published document
 * passed in is never mutated. A parent that is missing is an error, not something to invent.
 */
function applySetPath(copy: Record<string, unknown>, path: string, value: unknown): void {
  const segments = splitFieldPath(path)
  let parent = copy
  for (const segment of segments.slice(0, -1)) {
    const existing = parent[segment]
    if (typeof existing !== 'object' || existing === null || Array.isArray(existing)) {
      throw new Error(`The published article has no "${segment}" to update, so nothing was saved.`)
    }
    const clone = {...(existing as Record<string, unknown>)}
    parent[segment] = clone
    parent = clone
  }
  parent[segments[segments.length - 1]] = value
}

/** Applies one `unset` entry to the copy, with the same path rules as applySetPath. */
function applyUnsetPath(copy: Record<string, unknown>, path: string): void {
  const segments = splitFieldPath(path)
  let parent = copy
  for (const segment of segments.slice(0, -1)) {
    const existing = parent[segment]
    if (typeof existing !== 'object' || existing === null || Array.isArray(existing)) return
    const clone = {...(existing as Record<string, unknown>)}
    parent[segment] = clone
    parent = clone
  }
  delete parent[segments[segments.length - 1]]
}

/**
 * For an article that is published but has no draft: a draft with every field of the published
 * document, with the edit applied on top. The id is `drafts.<publishedId>`; the published
 * document itself is only read, never written (nothing in it is mutated either).
 * A `coverImage.alt` change is applied inside the copied `coverImage`, keeping its asset
 * reference, hotspot and crop; it throws if the published article has no cover image to update.
 */
export function buildDraftCopyFromPublished(
  published: {_id: string; _type: string; [field: string]: unknown},
  patch: ArticleEditPatch,
): ArticleDraftCopy {
  const copy: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(published)) {
    if (!COPY_OMITTED_KEYS.includes(key)) copy[key] = value
  }
  if (Object.prototype.hasOwnProperty.call(patch.set, COVER_ALT_PATH)) {
    const cover = copy.coverImage as {asset?: {_ref?: unknown}} | null | undefined
    if (typeof cover?.asset?._ref !== 'string' || cover.asset._ref === '') {
      throw new Error(
        'The published article has no cover image, so its alt text cannot be updated. Nothing was saved.',
      )
    }
  }
  if (patch.set.coverImage !== undefined && patch.unset.includes('coverImage')) {
    throw new Error('The cover image change is contradictory, so nothing was saved.')
  }
  for (const key of patch.unset) applyUnsetPath(copy, key)
  for (const [key, value] of Object.entries(patch.set)) applySetPath(copy, key, value)
  return {...copy, _id: toDraftId(published._id), _type: published._type}
}