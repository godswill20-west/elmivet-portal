import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useClient} from 'sanity'

import {ARTICLES_LISTEN_QUERY, ARTICLES_QUERY, buildArticles} from '../lib/articles'
import type {RawArticleDoc} from '../lib/articles'
import {API_VERSION} from '../lib/constants'
import type {ArticleSummary} from '../lib/types'

export type ArticlesStatus = 'loading' | 'ready' | 'error'

export interface ArticlesState {
  articles: ArticleSummary[]
  /** `loading` until the first response, `error` when it failed, otherwise `ready`. */
  status: ArticlesStatus
  /** True while a re-fetch runs behind an already-displayed list. */
  refreshing: boolean
  /** Message for a failed first load (null otherwise). */
  error: string | null
  /** Re-fetches the list. Resolves to an error message, or null on success. */
  refresh: () => Promise<string | null>
}

/** Turns a Sanity client error into a sentence an editor can act on. */
function describeError(error: unknown): string {
  const statusCode = (error as {statusCode?: number} | null)?.statusCode
  if (statusCode === 401 || statusCode === 403) {
    return 'You do not have permission to read articles. Ask an administrator for access.'
  }
  const message = error instanceof Error ? error.message : ''
  return message ? `Articles could not be loaded: ${message}` : 'Articles could not be loaded.'
}

/**
 * Loads every `globalInsight` document through the Studio's own authenticated client (the signed-in
 * user's session and permissions; no token is involved) and merges drafts with their published
 * versions. The list refreshes itself when any article changes, including edits made in other
 * Studio tools.
 */
export function useArticles(): ArticlesState {
  const studioClient = useClient({apiVersion: API_VERSION})
  // `raw` returns drafts as well as published documents; the CDN would serve stale data.
  const client = useMemo(
    () => studioClient.withConfig({perspective: 'raw', useCdn: false}),
    [studioClient],
  )

  const [docs, setDocs] = useState<RawArticleDoc[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const latestRequest = useRef(0)

  const load = useCallback(
    async (refreshingList: boolean): Promise<string | null> => {
      const request = ++latestRequest.current
      if (refreshingList) setRefreshing(true)
      try {
        const result = await client.fetch<RawArticleDoc[]>(ARTICLES_QUERY)
        // A newer request (or unmount) supersedes this one.
        if (request !== latestRequest.current) return null
        setDocs(Array.isArray(result) ? result : [])
        setError(null)
        return null
      } catch (caught) {
        if (request !== latestRequest.current) return null
        const message = describeError(caught)
        console.error('[Content Center] Loading articles failed.', caught)
        setError(message)
        return message
      } finally {
        if (request === latestRequest.current) setRefreshing(false)
      }
    },
    [client],
  )

  useEffect(() => {
    void load(false)
    return () => {
      latestRequest.current += 1
    }
  }, [load])

  useEffect(() => {
    let timer: number | undefined
    const subscription = client
      .listen(ARTICLES_LISTEN_QUERY, {}, {includeResult: false, visibility: 'query'})
      .subscribe({
        next: (event) => {
          if (event.type !== 'mutation') return
          window.clearTimeout(timer)
          timer = window.setTimeout(() => void load(true), 500)
        },
        error: (caught) => console.warn('[Content Center] Live updates are unavailable.', caught),
      })
    return () => {
      window.clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [client, load])

  const articles = useMemo(() => buildArticles(docs ?? []), [docs])
  const status: ArticlesStatus = docs !== null ? 'ready' : error ? 'error' : 'loading'

  return {articles, status, refreshing, error: docs === null ? error : null, refresh: () => load(true)}
}
