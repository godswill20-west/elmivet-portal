/* -------------------------------------------------------------------------- */
/*  Pure helpers for the homepage featured-dispatches section.                */
/*  No React, no Sanity client: easy to test and safe to import anywhere.     */
/* -------------------------------------------------------------------------- */

import { formatLongDate, formatShortDate } from './newsroom.js'

export const FEATURED_MAX = 10

const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const HTTP_URL_PATTERN = /^https?:\/\//i

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '')

export const isValidSlug = (slug) => SLUG_PATTERN.test(cleanString(slug))

/**
 * Turns one raw Sanity document into a card-safe object, or null if it cannot
 * be shown at all (not an object, or no title). Everything else is optional.
 */
export function normalizeInsight(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null

  const title = cleanString(raw.title)
  if (!title) return null

  const slug = cleanString(raw.slug)
  const category = cleanString(raw.category)
  const coverImage = cleanString(raw.coverImage)

  return {
    id: cleanString(raw._id) || `insight-${index}`,
    title,
    slug: isValidSlug(slug) ? slug : null,
    excerpt: cleanString(raw.excerpt),
    category,
    // Card label: the editor's "Card Label" if set, otherwise the category.
    label: cleanString(raw.tag) || category,
    coverImage: HTTP_URL_PATTERN.test(coverImage) ? coverImage : '',
    coverAlt: cleanString(raw.coverAlt),
    // Publication date straight from Sanity ('' when missing or unparseable)
    publishedAt: formatShortDate(raw.publishedAt) ? raw.publishedAt : null,
    date: formatShortDate(raw.publishedAt),
    longDate: formatLongDate(raw.publishedAt),
  }
}

/** Normalises a list, drops unusable items and duplicates, and caps the count. */
export function normalizeInsights(list, max = FEATURED_MAX) {
  if (!Array.isArray(list)) return []

  const seen = new Set()
  const result = []

  list.forEach((raw, index) => {
    const post = normalizeInsight(raw, index)
    if (!post || seen.has(post.id)) return
    seen.add(post.id)
    result.push(post)
  })

  return result.slice(0, max)
}

/** Which layout the section should use for a given number of articles. */
export function getLayoutVariant(count) {
  if (!Number.isFinite(count) || count <= 0) return 'none'
  if (count === 1) return 'single'
  if (count === 2) return 'pair'
  if (count === 3) return 'trio'
  return 'carousel'
}

/**
 * Link target for a card.
 *  - detailBase set  -> `${detailBase}/${slug}` (a dedicated article page)
 *  - queryParam set  -> `${listPath}?${queryParam}=${slug}` (opens the article reader on the
 *                       Global Insight page)
 *  - otherwise       -> the Global Insight listing
 * A missing or invalid slug always falls back to the listing.
 */
export function buildInsightHref(slug, { listPath, detailBase = null, queryParam = null }) {
  if (!isValidSlug(slug)) return listPath
  const clean = encodeURIComponent(slug.trim())
  if (detailBase) return `${detailBase}/${clean}`
  if (queryParam) return `${listPath}?${queryParam}=${clean}`
  return listPath
}
