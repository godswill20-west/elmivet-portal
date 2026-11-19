import type {SanityClient} from 'sanity'

import {DOCUMENT_TYPES, isArticleCategory} from './constants'
import {HEADLINE_MAX_LENGTH, SUMMARY_MAX_LENGTH, TAG_MAX_LENGTH, toDraftId, toPublishedId} from './articles'

/** The fields of a `globalInsight` document that publishing depends on, as Sanity stores them. */
export interface SnapshotDoc {
  _id: string
  _rev: string
  title?: string | null
  excerpt?: string | null
  category?: string | null
  tag?: string | null
  isFeatured?: boolean | null
  readTime?: number | null
  author?: string | null
  publishedAt?: string | null
  slug?: {current?: string | null} | null
  body?: unknown
  coverImage?: {asset?: {_ref?: string | null} | null; alt?: string | null} | null
}

/** The draft and published versions of one article, read straight from Sanity. */
export interface ArticleSnapshot {
  draft: SnapshotDoc | null
  published: SnapshotDoc | null
}

const SNAPSHOT_QUERY = `*[_type == "${DOCUMENT_TYPES.article}" && _id in [$draftId, $publishedId]]{
  _id, _rev, title, excerpt, category, tag, isFeatured, readTime, author, publishedAt, slug, body,
  "coverImage": coverImage{asset, alt}
}`

/**
 * Reads both versions of an article. The client must use the `raw` perspective (so drafts are
 * returned) and bypass the CDN (so the result is never stale).
 */
export async function fetchArticleSnapshot(
  client: SanityClient,
  articleId: string,
): Promise<ArticleSnapshot> {
  const publishedId = toPublishedId(articleId)
  const draftId = toDraftId(publishedId)
  const docs = await client.fetch<SnapshotDoc[]>(SNAPSHOT_QUERY, {draftId, publishedId})
  const list = Array.isArray(docs) ? docs : []
  return {
    draft: list.find((doc) => doc._id === draftId) ?? null,
    published: list.find((doc) => doc._id === publishedId) ?? null,
  }
}

const MIN_BODY_TEXT = 200

const bodyTextLength = (body: unknown): number => {
  if (!Array.isArray(body)) return 0
  let total = 0
  for (const block of body as Array<{_type?: string; children?: unknown}>) {
    if (block?._type !== 'block' || !Array.isArray(block.children)) continue
    for (const child of block.children as Array<{text?: unknown}>) {
      if (typeof child?.text === 'string') total += child.text.length
    }
  }
  return total
}

const blank = (value: unknown): boolean => typeof value !== 'string' || value.trim().length === 0

/**
 * Everything that must be true before an article may go live. It mirrors the `globalInsight`
 * schema rules and adds a stricter alt-text check (the schema accepts whitespace-only alt text).
 * Returns actionable problems; an empty list means the document may be published.
 */
export function findPublishProblems(doc: SnapshotDoc): string[] {
  const problems: string[] = []

  if (blank(doc.title)) problems.push('the headline is missing.')
  else if ((doc.title as string).length > HEADLINE_MAX_LENGTH) {
    problems.push(`the headline is longer than ${HEADLINE_MAX_LENGTH} characters.`)
  }

  if (blank(doc.excerpt)) problems.push('the executive summary is missing.')
  else if ((doc.excerpt as string).length > SUMMARY_MAX_LENGTH) {
    problems.push(`the executive summary is longer than ${SUMMARY_MAX_LENGTH} characters.`)
  }

  if (!isArticleCategory(doc.category)) problems.push('choose a category.')
  if (typeof doc.tag === 'string' && doc.tag.length > TAG_MAX_LENGTH) {
    problems.push(`the card label is longer than ${TAG_MAX_LENGTH} characters.`)
  }
  if (blank(doc.slug?.current)) problems.push('the URL slug is missing.')
  if (blank(doc.publishedAt)) problems.push('the publication date is missing.')

  const readTime = doc.readTime
  if (readTime != null && (!Number.isInteger(readTime) || readTime < 1 || readTime > 60)) {
    problems.push('the read time must be a whole number between 1 and 60.')
  }
  if (typeof doc.author === 'string' && doc.author.length > 80) {
    problems.push('the byline is longer than 80 characters.')
  }

  if (!Array.isArray(doc.body) || doc.body.length < 2) {
    problems.push('the article body is empty. Write the full article.')
  } else {
    const length = bodyTextLength(doc.body)
    if (length < MIN_BODY_TEXT) {
      problems.push(
        `the article body is too short (${length} characters). Write at least ${MIN_BODY_TEXT} characters of article text.`,
      )
    }
  }

  if (!doc.coverImage?.asset?._ref) {
    problems.push('a cover image is required. Upload a cover image.')
  } else if (blank(doc.coverImage.alt)) {
    problems.push('the cover image needs alt text. Describe the image in the cover alt-text field.')
  }

  return problems
}

/** One sentence for a toast: what blocks publishing and where to fix it. */
export function describePublishProblems(title: string | null | undefined, problems: string[]): string {
  const [first, ...rest] = problems
  const more = rest.length > 0 ? ` (${rest.length} more issue${rest.length > 1 ? 's' : ''}: ${rest.join(' ')})` : ''
  const name = title && title.trim() ? ` “${title.trim()}”` : ''
  const lead = first ? first.charAt(0).toUpperCase() + first.slice(1) : ''
  return `Not published${name}: ${lead}${more} Fix it in Edit Article, then publish again.`
}

/**
 * A stable fingerprint of the content a reader sees, used to confirm that what Sanity holds after
 * an operation is exactly what was checked before it.
 */
export function contentFingerprint(doc: SnapshotDoc): string {
  return JSON.stringify([
    doc.title ?? null,
    doc.excerpt ?? null,
    doc.category ?? null,
    doc.tag ?? null,
    doc.isFeatured ?? null,
    doc.readTime ?? null,
    doc.author ?? null,
    doc.publishedAt ?? null,
    doc.slug?.current ?? null,
    doc.body ?? null,
    doc.coverImage?.asset?._ref ?? null,
    doc.coverImage?.alt ?? null,
  ])
}
