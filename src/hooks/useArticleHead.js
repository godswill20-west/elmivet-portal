import { useEffect } from 'react'
import { buildArticleSeo } from '../lib/articleSeo.js'
import { applyArticleHead, resetArticleHead } from '../lib/articleHead.js'

/**
 * Keeps <head> metadata in step with the article opened at /global-insight/<slug>.
 *
 * The server already wrote these tags into the HTML; this updates those same elements in place
 * (never adds a second set) and puts the site defaults back when the reader closes.
 *
 *   routeSlug  the :slug from the URL, or undefined when no dedicated article URL is open
 *   article    the article's data once known (the card/list data is enough), else null
 */
export default function useArticleHead(routeSlug, article) {
  useEffect(() => {
    if (!routeSlug || !article) return
    const seo = buildArticleSeo(article, routeSlug)
    if (seo) applyArticleHead(seo)
  }, [routeSlug, article])

  useEffect(() => {
    if (!routeSlug) return undefined
    return () => resetArticleHead()
  }, [routeSlug])
}
