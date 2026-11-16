/**
 * Live article data: the GROQ query, the draft/published pairing, filtering and statistics.
 * Everything here is pure (no React, no network) so it can be checked in isolation.
 */
import {DOCUMENT_TYPES, isArticleCategory} from './constants'
import type {ArticleCategory} from './constants'
import {formatDate, formatDateTime, toTime} from './format'
import type {
  ArticleCover,
  ArticleSummary,
  CoverPalette,
  CoverScene,
  DashboardStats,
} from './types'

const DRAFT_PREFIX = 'drafts.'

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
  isFeatured,
  readTime,
  author,
  publishedAt,
  "slug": slug.current,
  "cover": coverImage{"url": asset->url, alt, hotspot}
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
  isFeatured?: boolean | null
  readTime?: number | null
  author?: string | null
  publishedAt?: string | null
  slug?: string | null
  cover?: {
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

function toCover(doc: RawArticleDoc): ArticleCover | null {
  const url = doc.cover?.url
  if (!url) return null
  const x = doc.cover?.hotspot?.x
  const y = doc.cover?.hotspot?.y
  const objectPosition =
    typeof x === 'number' && typeof y === 'number'
      ? `${Math.round(clamp01(x) * 100)}% ${Math.round(clamp01(y) * 100)}%`
      : '50% 50%'
  return {url, alt: doc.cover?.alt?.trim() ?? '', objectPosition}
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
      isFeatured: shown.isFeatured === true,
      featuredLive: published?.isFeatured === true,
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

export type FeaturedState = 'live' | 'pending' | 'removing' | 'none'

/**
 * Featured status as the public site will see it. `isFeatured` on a draft only takes effect once
 * published, so a draft flag alone is `pending`, and a published flag the draft has switched off
 * is `removing` (still featured until the changes are published).
 */
export function featuredState(article: ArticleSummary): FeaturedState {
  if (article.isFeatured && article.featuredLive) return 'live'
  if (article.isFeatured) return 'pending'
  if (article.featuredLive) return 'removing'
  return 'none'
}

export const FEATURED_TEXT: Record<FeaturedState, string> = {
  live: 'Featured',
  pending: 'Featured once published',
  removing: 'Featured until changes are published',
  none: 'Not featured',
}

/** The published featured stories, most recently published first. */
export const featuredStories = (articles: readonly ArticleSummary[]): ArticleSummary[] =>
  articles
    .filter((article) => article.hasPublished && article.featuredLive)
    .sort((a, b) => b.leadTime - a.leadTime)

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
