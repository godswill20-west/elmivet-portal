/* -------------------------------------------------------------------------- */
/*  Article SEO metadata for /global-insight/<slug>.                          */
/*                                                                            */
/*  Pure module: no React, no DOM, no Sanity client, no Vite-only features.   */
/*  It is imported by BOTH                                                    */
/*    - api/global-insight.js  (the Vercel function that writes the tags into */
/*                              the HTML before React runs), and              */
/*    - src/lib/articleHead.js (the browser code that keeps the live <head>   */
/*                              in step with those same tags),                */
/*  so the server and the browser can never disagree about a value.           */
/*  Relative imports carry the ".js" extension because Node (the function)    */
/*  does not resolve extensionless ES-module paths.                           */
/* -------------------------------------------------------------------------- */
import { SITE_URL, DEFAULT_SEO } from './seo.js'

export const BRAND_SUFFIX = ' | Elmivet International Limited'
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630
export const DESCRIPTION_MAX = 160

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '')
const HTTP_URL = /^https?:\/\//i

/* ----------------------------- Sanity query ------------------------------ */
// Same published-only filter and the same slug-or-id lookup as ARTICLE_QUERY in
// src/hooks/useElmivetContent.js (so a URL the reader can open is a URL that gets metadata).
// Only the fields the metadata needs; `body` is not fetched.
export const ARTICLE_SEO_QUERY = `
  *[_type == "globalInsight" && !(_id in path("drafts.**")) && (slug.current == $key || _id == $key)][0]{
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    coverImage{
      alt,
      asset->{url}
    }
  }
`

/* ------------------------------ Text helpers ----------------------------- */
/**
 * Collapses whitespace and, when the text is longer than `max`, cuts it at a word boundary and
 * adds an ellipsis. The result (ellipsis included) is never longer than `max` characters.
 */
export function trimDescription(text, max = DESCRIPTION_MAX) {
  const flat = cleanString(text).replace(/\s+/g, ' ')
  if (flat.length <= max) return flat

  const window = flat.slice(0, max - 1) // leave one character for the ellipsis
  const lastSpace = window.lastIndexOf(' ')
  // Only back up to a space when that keeps most of the text; otherwise (one very long word) hard-cut.
  const cut = lastSpace >= Math.floor(max * 0.6) ? window.slice(0, lastSpace) : window
  return `${cut.replace(/[\s,;:.\-–—]+$/, '')}…`
}

/** Escapes text for use inside an HTML element or a double- or single-quoted attribute value. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ------------------------------ URL helpers ------------------------------ */
export const getArticleUrl = (slug) => `${SITE_URL}/global-insight/${encodeURIComponent(slug)}`

/** Sanity image URL with an explicit JPEG format (never `auto=format`) at exactly 1200 x 630. */
export function getOgImageUrl(assetUrl) {
  const params = new URLSearchParams({
    w: String(OG_IMAGE_WIDTH),
    h: String(OG_IMAGE_HEIGHT),
    fit: 'crop',
    fm: 'jpg',
    q: '80',
  })
  return `${assetUrl}?${params.toString()}`
}

/* ------------------------------ Metadata model --------------------------- */
/**
 * Turns an article (a raw Sanity document OR the page's mapped article shape) into the metadata
 * model both sides use. Returns null when the article has no usable title.
 *
 * `fallbackKey` is the key the page was opened with; it is used for the canonical URL only when
 * the article itself has no slug (the reader can open such articles by document id).
 *
 * Model: { title, description, canonical, tags: [...] } where every tag is either
 *   { tag: 'meta', attr: 'name' | 'property', key, content }  or
 *   { tag: 'link', rel, href }
 */
export function buildArticleSeo(article, fallbackKey = '') {
  if (!article || typeof article !== 'object') return null

  const title = cleanString(article.title)
  if (!title) return null

  const slugValue = typeof article.slug === 'object' ? article.slug?.current : article.slug
  const slug = cleanString(slugValue) || cleanString(fallbackKey)
  if (!slug) return null

  const description = trimDescription(article.excerpt) || DEFAULT_SEO.description
  const canonical = getArticleUrl(slug)

  // Raw Sanity document: coverImage.asset.url. Mapped article: cover.url. Accept both.
  const assetUrl = cleanString(article.coverImage?.asset?.url) || cleanString(article.cover?.url)
  const hasImage = HTTP_URL.test(assetUrl)
  const imageUrl = hasImage ? getOgImageUrl(assetUrl) : ''
  const imageAlt =
    cleanString(article.coverImage?.alt) || cleanString(article.cover?.alt) || `Cover image: ${title}`

  const publishedAt = cleanString(article.publishedAt)
  const publishedTime = publishedAt && !Number.isNaN(new Date(publishedAt).getTime()) ? new Date(publishedAt).toISOString() : ''

  const meta = (attr, key, content) => ({ tag: 'meta', attr, key, content })

  const tags = [
    meta('name', 'description', description),
    { tag: 'link', rel: 'canonical', href: canonical },
    meta('property', 'og:type', 'article'),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:url', canonical),
  ]
  if (hasImage) {
    tags.push(
      meta('property', 'og:image', imageUrl),
      meta('property', 'og:image:type', 'image/jpeg'),
      meta('property', 'og:image:width', String(OG_IMAGE_WIDTH)),
      meta('property', 'og:image:height', String(OG_IMAGE_HEIGHT)),
      meta('property', 'og:image:alt', imageAlt),
    )
  }
  if (publishedTime) tags.push(meta('property', 'article:published_time', publishedTime))

  // A large-image card needs an image; without one the honest card type is "summary".
  tags.push(
    meta('name', 'twitter:card', hasImage ? 'summary_large_image' : 'summary'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
  )
  if (hasImage) {
    tags.push(meta('name', 'twitter:image', imageUrl), meta('name', 'twitter:image:alt', imageAlt))
  }

  return { title: `${title}${BRAND_SUFFIX}`, description, canonical, tags }
}

/**
 * The site-wide defaults that index.html ships with, in the same model. The browser code uses this
 * to put the head back when the reader closes; tags the defaults do not have are removed.
 */
export function buildDefaultSeo() {
  const meta = (attr, key, content) => ({ tag: 'meta', attr, key, content })
  return {
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    canonical: null,
    tags: [
      meta('name', 'description', DEFAULT_SEO.description),
      meta('property', 'og:type', 'website'),
      meta('property', 'og:title', DEFAULT_SEO.title),
      meta('property', 'og:description', DEFAULT_SEO.description),
      meta('property', 'og:url', `${SITE_URL}/`),
      meta('name', 'twitter:card', 'summary_large_image'),
      meta('name', 'twitter:title', DEFAULT_SEO.title),
      meta('name', 'twitter:description', DEFAULT_SEO.description),
    ],
  }
}

/** Every meta/link this feature manages, as { tag, attr, key } / { tag, rel } selectors' source data. */
export const MANAGED_KEYS = [
  ['meta', 'name', 'description'],
  ['link', 'rel', 'canonical'],
  ['meta', 'property', 'og:type'],
  ['meta', 'property', 'og:title'],
  ['meta', 'property', 'og:description'],
  ['meta', 'property', 'og:url'],
  ['meta', 'property', 'og:image'],
  ['meta', 'property', 'og:image:type'],
  ['meta', 'property', 'og:image:width'],
  ['meta', 'property', 'og:image:height'],
  ['meta', 'property', 'og:image:alt'],
  ['meta', 'property', 'article:published_time'],
  ['meta', 'name', 'twitter:card'],
  ['meta', 'name', 'twitter:title'],
  ['meta', 'name', 'twitter:description'],
  ['meta', 'name', 'twitter:image'],
  ['meta', 'name', 'twitter:image:alt'],
]

/* ------------------------------ HTML output ------------------------------ */
/** Marker the server puts on every tag it writes, so the browser code can find and manage them. */
export const SEO_MARKER = 'data-elm-seo'

/** One tag as an HTML string, every dynamic value escaped. */
export function renderTag(descriptor) {
  if (descriptor.tag === 'link') {
    return `<link rel="${escapeHtml(descriptor.rel)}" href="${escapeHtml(descriptor.href)}" ${SEO_MARKER}="server" />`
  }
  return `<meta ${descriptor.attr}="${escapeHtml(descriptor.key)}" content="${escapeHtml(descriptor.content)}" ${SEO_MARKER}="server" />`
}

/** The whole block for <head>: the <title> plus every tag, one per line. */
export function renderHeadBlock(seo, indent = '    ') {
  const lines = [`<title ${SEO_MARKER}="server">${escapeHtml(seo.title)}</title>`, ...seo.tags.map(renderTag)]
  return lines.map((line) => `${indent}${line}`).join('\n')
}
