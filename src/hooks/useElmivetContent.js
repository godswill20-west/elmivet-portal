import {useCallback, useEffect, useState} from 'react'
import {createClient} from '@sanity/client'
import {CURRENT_ORGANOGRAM_QUERY, parseCurrentOrganogram} from '../lib/currentOrganogram'
import {
  SanityContentError,
  describeConfigProblems,
  readSanityConfig,
  toContentError,
} from '../lib/sanityConfig'
import {toNewsroomArticle, toNewsroomArticles} from '../lib/newsroom'

/* -------------------------------------------------------------------------- */
/*  Client                                                                    */
/*  Public dataset, NO token, published perspective (drafts never appear).    */
/*  Settings come from VITE_SANITY_PROJECT_ID / _DATASET / _API_VERSION.      */
/*  The client is created lazily so a missing variable becomes a readable     */
/*  error on the page instead of crashing the whole app at import time.       */
/* -------------------------------------------------------------------------- */
let cachedClients = null

function getClients() {
  if (cachedClients) return cachedClients

  const {config, problems} = readSanityConfig(import.meta.env)
  if (!config) {
    throw new SanityContentError('config', describeConfigProblems(problems), {problems})
  }

  const cdnClient = createClient({
    ...config,
    useCdn: true, // fast, cached reads, ideal for public website content
    perspective: 'published', // never returns drafts
    // Deliberately no `token`: the dataset is public, and a token must never ship to the browser.
  })
  // Same settings, but straight from the API (no CDN cache) for data that must change immediately.
  cachedClients = {cdn: cdnClient, live: cdnClient.withConfig({useCdn: false})}
  return cachedClients
}

/** Runs a GROQ query and converts any failure into a SanityContentError that says what broke. */
async function runQuery(label, query, params, {live = false} = {}) {
  try {
    const clients = getClients()
    return await (live ? clients.live : clients.cdn).fetch(query, params)
  } catch (error) {
    const contentError = toContentError(error, label)
    console.error(`[Elmivet] Could not load ${label}:`, contentError.message, contentError)
    throw contentError
  }
}

/* -------------------------------------------------------------------------- */
/*  GROQ queries (exported so you can reuse or tweak them)                    */
/* -------------------------------------------------------------------------- */
const PUBLISHED = `!(_id in path("drafts.**"))`

// Homepage cards: cover image is a plain URL string + alt text.
// The legacy `isFeatured` field is NOT read anywhere.
const CARD_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  category,
  tag,
  readTime,
  publishedAt,
  "coverImage": coverImage.asset->url,
  "coverAlt": coverImage.alt
`

// GlobalInsight newsroom: same fields plus author, with coverImage.asset / coverImage.alt kept as
// an object so the page can read the real asset URL and its dimensions. `body` is NOT listed here:
// full article text is fetched on demand (ARTICLE_QUERY) so the feed stays small.
const NEWSROOM_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  category,
  tag,
  readTime,
  publishedAt,
  author,
  coverImage{
    alt,
    asset->{_id, url, metadata{dimensions{width, height}}}
  }
`

// Embedded body images are resolved to their asset (url + dimensions); text blocks, lists, marks
// and markDefs (links) pass through unchanged.
const BODY_PROJECTION = `body[]{
  ...,
  _type == "image" => {
    "asset": asset->{_id, url, metadata{dimensions{width, height}}}
  }
}`

// 1. GlobalInsight: ALL published articles, newest first (drafts excluded)
export const INSIGHTS_QUERY = `
  *[_type == "globalInsight" && ${PUBLISHED}]
    | order(publishedAt desc) {${NEWSROOM_FIELDS}}
`

// 2. One published article with its full body. `$key` is the slug or the document id.
export const ARTICLE_QUERY = `
  *[_type == "globalInsight" && ${PUBLISHED} && (slug.current == $key || _id == $key)][0]{
    ${NEWSROOM_FIELDS},
    ${BODY_PROJECTION}
  }
`

// Featured placements are two INDEPENDENT selections kept in the single "featuredPlacements"
// document (managed in the Studio's Content Center). The legacy `isFeatured` field is ignored.
// References are weak and the client uses the published perspective, so an article that is
// unpublished (or deleted) simply resolves to nothing and is skipped until it is published again.
const PLACEMENTS_DOC = `*[_id == "featuredPlacements"][0]`

// 3. GlobalInsight page: the single selected article (null when the position is empty)
export const FEATURED_INSIGHT_QUERY = `
  ${PLACEMENTS_DOC}.insightPage->{${NEWSROOM_FIELDS}}
`

// 4. Homepage Featured Stories: the articles selected for the homepage, in the order the editor
//    added them. Published only, capped server-side so the payload stays small.
//    `tag` is the optional "Card Label" editors can set; the card falls back to category.
export const FEATURED_INSIGHTS_LIMIT = 10
export const FEATURED_INSIGHTS_QUERY = `
  ${PLACEMENTS_DOC}.homepage[defined(@->_id)][0...${FEATURED_INSIGHTS_LIMIT}]->{${CARD_FIELDS}}
`

/* -------------------------------------------------------------------------- */
/*  Plain fetch functions (usable outside React too)                          */
/* -------------------------------------------------------------------------- */
export const fetchInsights = async () =>
  toNewsroomArticles(await runQuery('the newsroom articles', INSIGHTS_QUERY))

export const fetchFeaturedInsight = async () =>
  toNewsroomArticle(await runQuery('the GlobalInsight featured article', FEATURED_INSIGHT_QUERY))

// Raw documents: the homepage normalises them itself (see lib/featuredInsights.js)
export const fetchFeaturedInsights = () =>
  runQuery('the homepage featured articles', FEATURED_INSIGHTS_QUERY)

// Full article for the reader. Resolves to null when the article is not published (any more).
export const fetchInsightArticle = async (key) => {
  if (typeof key !== 'string' || !key.trim()) return null
  return toNewsroomArticle(await runQuery('the article', ARTICLE_QUERY, {key: key.trim()}))
}

// The current organogram is read WITHOUT the CDN cache so a version change or an unpublish in
// the Content Center shows up on the next page load. It is a single tiny query.
export const fetchCurrentOrganogram = async () => {
  const raw = await runQuery('the current organogram', CURRENT_ORGANOGRAM_QUERY, undefined, {live: true})
  try {
    return parseCurrentOrganogram(raw)
  } catch (error) {
    const contentError = toContentError(error, 'the current organogram')
    console.error('[Elmivet] The current organogram cannot be shown:', contentError.message)
    throw contentError
  }
}

const fetchAllContent = async () => {
  const [insights, featured] = await Promise.all([fetchInsights(), fetchFeaturedInsight()])
  return {insights: insights ?? [], featured: featured ?? null}
}

/* -------------------------------------------------------------------------- */
/*  Image helper: resize/optimise any Sanity image URL on the fly             */
/*  e.g. imageUrl(post.coverImage, {width: 800, height: 450})                 */
/* -------------------------------------------------------------------------- */
export const imageUrl = (url, {width, height, quality = 80} = {}) => {
  if (!url) return ''
  const params = new URLSearchParams({auto: 'format', q: String(quality)})
  if (width) params.set('w', String(width))
  if (height) params.set('h', String(height))
  if (width && height) params.set('fit', 'crop')
  return `${url}?${params.toString()}`
}

/* -------------------------------------------------------------------------- */
/*  Tiny generic hook: handles loading, error, cleanup and refetch            */
/*  `fetcher` must be a stable reference (module-level functions are).        */
/*  A synchronous throw (e.g. missing config) is surfaced as an error too.    */
/* -------------------------------------------------------------------------- */
function useSanityQuery(fetcher) {
  const [state, setState] = useState({data: null, loading: true, error: null})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({...prev, loading: true, error: null}))

    Promise.resolve()
      .then(fetcher)
      .then((data) => !cancelled && setState({data, loading: false, error: null}))
      .catch((error) => !cancelled && setState({data: null, loading: false, error: toContentError(error)}))

    return () => {
      cancelled = true // ignore results if the component unmounts
    }
  }, [fetcher, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])
  return {...state, refetch}
}

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                     */
/* -------------------------------------------------------------------------- */
// Individual hooks: use these when a component needs just one thing
// All published GlobalInsight articles: {data (article[] | null), loading, error, refetch}
export const useInsights = () => useSanityQuery(fetchInsights)
// GlobalInsight page featured article: {data (article | null), loading, error, refetch}
export const useFeaturedInsight = () => useSanityQuery(fetchFeaturedInsight)
// Homepage featured list: {data (raw documents array | null), loading, error, refetch}
export const useFeaturedInsights = () => useSanityQuery(fetchFeaturedInsights)

// About page organogram: {data ({url, title, versionNumber, ...} | null), loading, error, refetch}.
// data is null (and error is null) when no organogram is current; a failure sets `error`.
export const useCurrentOrganogram = () => useSanityQuery(fetchCurrentOrganogram)

// All-in-one hook for the GlobalInsight page: one parallel load of the feed and the featured article
export default function useElmivetContent() {
  const {data, loading, error, refetch} = useSanityQuery(fetchAllContent)
  return {
    insights: data?.insights ?? [],
    featured: data?.featured ?? null,
    loading,
    error,
    refetch,
  }
}

/* Full article for the reader: {data (article | null), loading, error, refetch} */
export function useInsightArticle(key) {
  const [state, setState] = useState({data: null, loading: true, error: null})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({data: null, loading: true, error: null})

    Promise.resolve()
      .then(() => fetchInsightArticle(key))
      .then((data) => !cancelled && setState({data, loading: false, error: null}))
      .catch((error) => !cancelled && setState({data: null, loading: false, error: toContentError(error)}))

    return () => {
      cancelled = true
    }
  }, [key, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])
  return {...state, refetch}
}
