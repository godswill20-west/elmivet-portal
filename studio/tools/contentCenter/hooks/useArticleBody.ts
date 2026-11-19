import type {PortableTextBlock} from '@portabletext/editor'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useClient} from 'sanity'

import {API_VERSION, DOCUMENT_TYPES} from '../lib/constants'
import {COVER_IMAGE_PROJECTION, toCover, toDraftId, toPublishedId} from '../lib/articles'
import type {RawArticleDoc} from '../lib/articles'
import type {ArticleCover} from '../lib/types'

/**
 * The body and cover of the draft and published versions of ONE article (never the list query).
 * Both come from the same documents in the same response, so whichever document is selected, its
 * body and cover always belong to the same revision.
 */
const ARTICLE_BODY_QUERY = `*[_type == "${DOCUMENT_TYPES.article}" && _id in [$draftId, $publishedId]]{_id, _rev, body, "cover": ${COVER_IMAGE_PROJECTION}}`

interface BodyDoc {
  _id: string
  _rev?: string
  body?: PortableTextBlock[] | null
  cover?: RawArticleDoc['cover']
}

export interface ArticleBodyState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  /** The article the status belongs to, so a previous article's result is never reused. */
  articleId: string | null
  body: PortableTextBlock[] | undefined
  /**
   * The cover image of the same document the body came from (the draft's when a draft exists,
   * otherwise the published document's), or null when that document has no cover. Only meaningful
   * once ready; it is null while loading, on error and when idle.
   */
  cover: ArticleCover | null
  error: string | null
  retry: () => void
  /** Which version the body was read from once ready: the draft if one exists, else published. */
  source: 'draft' | 'published' | null
  /** `_rev` of the draft as loaded, or null when the article had no draft. */
  draftRev: string | null
  /** `_rev` of the published document as loaded, or null when the article was never published. */
  publishedRev: string | null
}

function describeError(error: unknown): string {
  const statusCode = (error as {statusCode?: number} | null)?.statusCode
  if (statusCode === 401 || statusCode === 403) {
    return 'You do not have permission to read this article body.'
  }
  const message = error instanceof Error ? error.message : ''
  return message
    ? `The article body could not be loaded: ${message}`
    : 'The article body could not be loaded.'
}

/**
 * Fetches the full body and cover of one article when `articleId` is set. The draft is used when
 * a draft exists, otherwise the published document; the body, the cover and the revisions all
 * come from that one fetch, so they describe the same selected document.
 */
export function useArticleBody(articleId: string | null): ArticleBodyState {
  const studioClient = useClient({apiVersion: API_VERSION})
  // `raw` returns drafts as well as published documents; the CDN could serve stale content.
  const client = useMemo(
    () => studioClient.withConfig({perspective: 'raw', useCdn: false}),
    [studioClient],
  )
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    articleId: string
    attempt: number
    body?: PortableTextBlock[]
    cover?: ArticleCover | null
    error?: string
    source?: 'draft' | 'published'
    draftRev?: string | null
    publishedRev?: string | null
  } | null>(null)
  // Closing the form (articleId becomes null) forgets the previous load. Without this, reopening
  // the same article would briefly show the body and revision from before the last save.
  const [seenArticleId, setSeenArticleId] = useState<string | null>(articleId)
  if (seenArticleId !== articleId) {
    setSeenArticleId(articleId)
    if (articleId === null) setResult(null)
  }

  useEffect(() => {
    if (!articleId) return
    let cancelled = false
    const publishedId = toPublishedId(articleId)
    client
      .fetch<BodyDoc[]>(ARTICLE_BODY_QUERY, {draftId: toDraftId(publishedId), publishedId})
      .then((docs) => {
        if (cancelled) return
        const list = Array.isArray(docs) ? docs : []
        const draftDoc = list.find((doc) => doc._id === toDraftId(publishedId))
        const publishedDoc = list.find((doc) => doc._id === publishedId)
        const source = draftDoc ?? publishedDoc
        // TEMPORARY DIAGNOSTICS (remove after debugging): IDs and counts only, never article text.
        const diagBody = source?.body
        const diagBlocks = Array.isArray(diagBody) ? diagBody : []
        let diagChars = 0
        for (const block of diagBlocks as Array<{_type?: string; children?: unknown}>) {
          if (block?._type !== 'block' || !Array.isArray(block.children)) continue
          for (const child of block.children as Array<{text?: unknown}>) {
            if (typeof child?.text === 'string') diagChars += child.text.length
          }
        }
        console.log('[Content Center][body-diagnostic] fetched', {
          originalArticleId: articleId,
          publishedId,
          generatedDraftId: toDraftId(publishedId),
          returnedDocumentIds: list.map((doc) => doc._id),
          matchingDraftFound: list.some((doc) => doc._id === toDraftId(publishedId)),
          selectedDocumentId: source?._id ?? null,
          selectedHasBodyField: source ? 'body' in source && source.body != null : false,
          bodyIsArray: Array.isArray(diagBody),
          blockCount: diagBlocks.length,
          textCharacterCount: diagChars,
        })
        if (!source) {
          setResult({articleId, attempt, error: 'This article could not be found in Sanity.'})
          return
        }
        setResult({
          articleId,
          attempt,
          body: Array.isArray(source.body) ? source.body : undefined,
          // Read from `source`, the same document as the body, never from the other version.
          cover: toCover(source),
          source: draftDoc ? 'draft' : 'published',
          draftRev: draftDoc?._rev ?? null,
          publishedRev: publishedDoc?._rev ?? null,
        })
      })
      .catch((caught) => {
        if (cancelled) return
        console.error('[Content Center] Loading the article body failed.', caught)
        console.log('[Content Center][body-diagnostic] fetch failed', {
          originalArticleId: articleId,
          generatedDraftId: toDraftId(toPublishedId(articleId)),
          statusCode: (caught as {statusCode?: number} | null)?.statusCode ?? null,
          message: caught instanceof Error ? caught.message : String(caught),
        })
        setResult({articleId, attempt, error: describeError(caught)})
      })
    return () => {
      cancelled = true
    }
  }, [client, articleId, attempt])

  const retry = useCallback(() => setAttempt((current) => current + 1), [])

  const noVersion = {source: null, draftRev: null, publishedRev: null} as const
  if (!articleId) {
    return {
      status: 'idle',
      articleId: null,
      body: undefined,
      cover: null,
      error: null,
      retry,
      ...noVersion,
    }
  }
  if (!result || result.articleId !== articleId || result.attempt !== attempt) {
    return {
      status: 'loading',
      articleId,
      body: undefined,
      cover: null,
      error: null,
      retry,
      ...noVersion,
    }
  }
  if (result.error) {
    return {
      status: 'error',
      articleId,
      body: undefined,
      cover: null,
      error: result.error,
      retry,
      ...noVersion,
    }
  }
  return {
    status: 'ready',
    articleId,
    body: result.body,
    cover: result.cover ?? null,
    error: null,
    retry,
    source: result.source ?? null,
    draftRev: result.draftRev ?? null,
    publishedRev: result.publishedRev ?? null,
  }
}