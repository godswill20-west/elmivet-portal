/* -------------------------------------------------------------------------- */
/*  Keeps the live <head> in step with the article metadata the server wrote. */
/*                                                                            */
/*  Why not <Seo> / React 19 tag hoisting? Hoisted <meta> and <link> elements */
/*  are ADDED to <head>; React never adopts the ones the server already put   */
/*  there, so using them for articles would leave two canonicals, two         */
/*  descriptions and two sets of Open Graph tags. Instead, the server's tags  */
/*  (marked data-elm-seo) are found and UPDATED IN PLACE; a missing one is    */
/*  created; and leaving the article puts the site defaults back.             */
/*                                                                            */
/*  Values come from src/lib/articleSeo.js, the same module the server uses,  */
/*  so after the app loads the browser's tags equal the server's tags.        */
/*  Only elements carrying data-elm-seo are ever modified or removed, so tags */
/*  React hoists for other pages are never touched.                           */
/* -------------------------------------------------------------------------- */
import { MANAGED_KEYS, SEO_MARKER, buildDefaultSeo } from './articleSeo.js'

const cssEscape = (value) => String(value).replace(/["\\]/g, '\\$&')

function selectorFor([tag, attr, key]) {
  return `${tag}[${attr}="${cssEscape(key)}"]`
}

function descriptorSelector(descriptor) {
  return descriptor.tag === 'link'
    ? selectorFor(['link', 'rel', descriptor.rel])
    : selectorFor(['meta', descriptor.attr, descriptor.key])
}

/** The element this feature manages for a selector: an owned one first, else the first plain match. */
function findManaged(head, selector) {
  return head.querySelector(`${selector}[${SEO_MARKER}]`) || head.querySelector(selector)
}

function upsert(doc, descriptor) {
  const head = doc.head
  const selector = descriptorSelector(descriptor)
  let element = findManaged(head, selector)

  if (!element) {
    element = doc.createElement(descriptor.tag)
    if (descriptor.tag === 'link') element.setAttribute('rel', descriptor.rel)
    else element.setAttribute(descriptor.attr, descriptor.key)
    head.appendChild(element)
  }
  if (!element.hasAttribute(SEO_MARKER)) element.setAttribute(SEO_MARKER, 'client')

  if (descriptor.tag === 'link') element.setAttribute('href', descriptor.href)
  else element.setAttribute('content', descriptor.content)
}

function setTitle(doc, text) {
  const head = doc.head
  let title = head.querySelector(`title[${SEO_MARKER}]`) || head.querySelector('title')
  if (!title) {
    title = doc.createElement('title')
    head.appendChild(title)
  }
  if (!title.hasAttribute(SEO_MARKER)) title.setAttribute(SEO_MARKER, 'client')
  title.textContent = text
}

/** Writes an article's metadata model (from buildArticleSeo) into the document's <head>. */
export function applyArticleHead(seo, doc = document) {
  if (!seo || !doc?.head) return
  setTitle(doc, seo.title)
  for (const descriptor of seo.tags) upsert(doc, descriptor)

  // Anything this feature manages that the article does not define (e.g. an article without a cover
  // has no og:image) must not linger from an earlier article.
  const defined = new Set(seo.tags.map(descriptorSelector))
  for (const key of MANAGED_KEYS) {
    const selector = selectorFor(key)
    if (defined.has(selector)) continue
    doc.head.querySelectorAll(`${selector}[${SEO_MARKER}]`).forEach((node) => {
      const fallback = buildDefaultSeo().tags.find((d) => descriptorSelector(d) === selector)
      if (fallback) node.setAttribute('content', fallback.content)
      else node.remove()
    })
  }
}

/**
 * Puts the head back the way index.html ships it: managed tags that have a site default get that
 * value; those with none (canonical, og:image..., article:published_time) are removed.
 */
export function resetArticleHead(doc = document) {
  if (!doc?.head) return
  const defaults = buildDefaultSeo()

  const title = doc.head.querySelector(`title[${SEO_MARKER}]`)
  if (title) title.textContent = defaults.title

  const byDescriptor = new Map(defaults.tags.map((d) => [descriptorSelector(d), d]))
  for (const key of MANAGED_KEYS) {
    const selector = selectorFor(key)
    const fallback = byDescriptor.get(selector)
    doc.head.querySelectorAll(`${selector}[${SEO_MARKER}]`).forEach((node) => {
      if (fallback) node.setAttribute('content', fallback.content)
      else node.remove()
    })
  }
}
