import {useCallback, useEffect, useState} from 'react'
import {createClient} from '@sanity/client'

/* -------------------------------------------------------------------------- */
/*  Client                                                                    */
/* -------------------------------------------------------------------------- */
export const client = createClient({
  projectId: 'mu98kehm',
  dataset: 'production',
  apiVersion: '2026-01-01',
  useCdn: true, // fast, cached reads, ideal for public website content
  perspective: 'published', // never returns drafts
})

/* -------------------------------------------------------------------------- */
/*  GROQ queries (exported so you can reuse or tweak them)                    */
/* -------------------------------------------------------------------------- */
// Fields shared by the list and the featured story
const INSIGHT_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  category,
  isFeatured,
  readTime,
  publishedAt,
  "coverImage": coverImage.asset->url,
  "coverAlt": coverImage.alt
`

// 1. All published dispatches, newest first (drafts excluded)
export const INSIGHTS_QUERY = `
  *[_type == "globalInsight" && !(_id in path("drafts.**"))]
    | order(publishedAt desc) {${INSIGHT_FIELDS}}
`

// 2. The current lead story (most recent if several are featured)
export const FEATURED_INSIGHT_QUERY = `
  *[_type == "globalInsight" && isFeatured == true && !(_id in path("drafts.**"))]
    | order(publishedAt desc)[0] {${INSIGHT_FIELDS}}
`

// 3. Every currently featured dispatch (homepage section), newest first.
//    Published only, isFeatured == true, capped server-side so the payload stays small.
//    `tag` is the optional "Card Label" editors can set; the card falls back to category.
export const FEATURED_INSIGHTS_LIMIT = 10
export const FEATURED_INSIGHTS_QUERY = `
  *[_type == "globalInsight" && isFeatured == true && !(_id in path("drafts.**"))]
    | order(publishedAt desc)[0...${FEATURED_INSIGHTS_LIMIT}] {
      ${INSIGHT_FIELDS},
      tag
    }
`

/* -------------------------------------------------------------------------- */
/*  Plain fetch functions (usable outside React too)                          */
/* -------------------------------------------------------------------------- */
export const fetchInsights = () => client.fetch(INSIGHTS_QUERY)
export const fetchFeaturedInsight = () => client.fetch(FEATURED_INSIGHT_QUERY)
export const fetchFeaturedInsights = () => client.fetch(FEATURED_INSIGHTS_QUERY)

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
/* -------------------------------------------------------------------------- */
function useSanityQuery(fetcher) {
  const [state, setState] = useState({data: null, loading: true, error: null})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({...prev, loading: true, error: null}))

    fetcher()
      .then((data) => !cancelled && setState({data, loading: false, error: null}))
      .catch((error) => !cancelled && setState({data: null, loading: false, error}))

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
export const useInsights = () => useSanityQuery(fetchInsights)
export const useFeaturedInsight = () => useSanityQuery(fetchFeaturedInsight)
// Homepage featured list: returns {data (array | null), loading, error, refetch}
export const useFeaturedInsights = () => useSanityQuery(fetchFeaturedInsights)

// All-in-one hook: one parallel load for the whole page
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