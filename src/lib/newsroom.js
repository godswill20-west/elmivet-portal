/* -------------------------------------------------------------------------- */
/*  Pure helpers for GlobalInsight (newsroom) content.                        */
/*  No React and no Sanity client. Maps raw Sanity documents to the shape the */
/*  page uses, and formats dates from the data (nothing is hardcoded).        */
/* -------------------------------------------------------------------------- */

// Publication dates are shown in the company's home time zone so every visitor sees the same day.
const DATE_ZONE = 'Africa/Lagos'

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '')
const HTTP_URL = /^https?:\/\//i

function toDate(iso) {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

function format(iso, options) {
  const date = toDate(iso)
  if (!date) return ''
  try {
    return date.toLocaleDateString('en-US', { ...options, timeZone: DATE_ZONE })
  } catch {
    return date.toLocaleDateString('en-US', options)
  }
}

/** "November 2, 2026" */
export const formatLongDate = (iso) => format(iso, { year: 'numeric', month: 'long', day: 'numeric' })
/** "Nov 2, 2026" */
export const formatShortDate = (iso) => format(iso, { year: 'numeric', month: 'short', day: 'numeric' })

export const formatReadTime = (minutes) =>
  typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 ? `${Math.round(minutes)} min read` : ''

/**
 * Maps one Sanity document (see NEWSROOM_FIELDS in the content hook) to the page's article shape.
 * Returns null when the document has no usable title.
 *
 *   _id -> id, title, slug.current -> slug, excerpt, category, tag, readTime, publishedAt,
 *   author, coverImage.asset -> cover.url, coverImage.alt -> cover.alt, body
 */
export function toNewsroomArticle(doc) {
  if (!doc || typeof doc !== 'object') return null
  const title = cleanString(doc.title)
  if (!title) return null

  const id = cleanString(doc._id)
  // `slug` is projected as a string, but accept the raw {current} object too.
  const slug = cleanString(typeof doc.slug === 'object' ? doc.slug?.current : doc.slug)
  const category = cleanString(doc.category)

  const asset = doc.coverImage?.asset
  const url = cleanString(asset?.url)
  const dimensions = asset?.metadata?.dimensions

  return {
    id: id || slug || title,
    key: slug || id, // what the reader is opened with (URL ?article=<key>)
    title,
    slug: slug || null,
    excerpt: cleanString(doc.excerpt),
    category,
    tag: cleanString(doc.tag) || category,
    readTime: formatReadTime(doc.readTime),
    publishedAt: toDate(doc.publishedAt) ? doc.publishedAt : null,
    date: formatShortDate(doc.publishedAt),
    longDate: formatLongDate(doc.publishedAt),
    author: cleanString(doc.author),
    cover: HTTP_URL.test(url)
      ? {
          url,
          alt: cleanString(doc.coverImage?.alt),
          width: Number(dimensions?.width) || null,
          height: Number(dimensions?.height) || null,
        }
      : null,
    body: Array.isArray(doc.body) ? doc.body : null,
  }
}

/** Maps a list, dropping unusable documents and duplicate ids. Newest first is the query's job. */
export function toNewsroomArticles(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const result = []
  for (const doc of list) {
    const article = toNewsroomArticle(doc)
    if (!article || seen.has(article.id)) continue
    seen.add(article.id)
    result.push(article)
  }
  return result
}

/** Latest publication date among the articles, as a long date ("" when there are none). */
export function latestPublishedLabel(articles) {
  let latest = null
  for (const article of articles) {
    const date = toDate(article?.publishedAt)
    if (date && (!latest || date > latest)) latest = date
  }
  return latest ? formatLongDate(latest.toISOString()) : ''
}
