import {useEffect, useMemo, useRef} from 'react'
import {toDraftId} from '../lib/articles'
import {DOCUMENT_TYPES} from '../lib/constants'
import type {ArticleSummary} from '../lib/types'
import {deniedMessage} from './permissions'
import type {ArticleAction} from './permissions'
import {
  useDocumentOperation,
  useDocumentOperationEvent,
  useDocumentPairPermissions,
  useValidationStatus,
} from './sanityInternals'

export interface OperationRequest {
  action: ArticleAction
  article: ArticleSummary
}

export type OperationResult = {ok: true} | {ok: false; message: string}

interface ArticleOperationRunnerProps {
  request: OperationRequest
  onDone: (result: OperationResult) => void
}

/** Give up if Sanity never reports an outcome (offline, or the document pair never loads). */
const TIMEOUT_MS = 20000

const REASONS: Record<ArticleAction, Record<string, string>> = {
  publish: {
    ALREADY_PUBLISHED: 'This article is already published and has no unpublished changes.',
    NO_CHANGES: 'There are no changes to publish.',
    NOT_PUBLISHABLE: 'This article cannot be published yet. Check its required fields.',
    LIVE_EDIT_ENABLED: 'This document type publishes automatically and cannot be published here.',
    TARGET_NOT_FOUND: 'This article no longer exists. Refresh the list.',
  },
  unpublish: {
    NOT_PUBLISHED: 'This article is not published.',
    ALREADY_UNPUBLISHED: 'This article is already unpublished.',
    LIVE_EDIT_ENABLED: 'This document type cannot be unpublished here.',
    TARGET_NOT_FOUND: 'This article no longer exists. Refresh the list.',
  },
  delete: {
    NOTHING_TO_DELETE: 'This article has already been deleted.',
    TARGET_NOT_FOUND: 'This article no longer exists. Refresh the list.',
  },
}

const reasonMessage = (action: ArticleAction, reason: string): string =>
  REASONS[action][reason] ?? `This action is not available right now (${reason}).`

/**
 * Headless. Runs one publish, unpublish or delete through Sanity's document operations, which
 * apply the draft/published model (delete removes both versions, unpublish keeps the content as a
 * draft). Before executing it re-checks the user's grants and, for publish, the schema validation
 * the Studio's own Publish button enforces. It reports exactly one result, then does nothing.
 *
 * Mount it when an operation is requested and unmount it when `onDone` fires.
 */
export function ArticleOperationRunner({request, onDone}: ArticleOperationRunnerProps) {
  const {action, article} = request
  const id = article.id
  const type = DOCUMENT_TYPES.article

  const operations = useDocumentOperation(id, type)
  const validation = useValidationStatus(id, type)
  const [permission, permissionLoading] = useDocumentPairPermissions({
    id,
    type,
    permission: action,
  })
  const event = useDocumentOperationEvent(id, type)

  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const started = useRef(false)
  const finished = useRef(false)
  // An event from an earlier operation on this document must not be mistaken for ours.
  const previousEvent = useRef(event)

  const finish = (result: OperationResult) => {
    if (finished.current) return
    finished.current = true
    onDoneRef.current(result)
  }

  const operation =
    action === 'delete'
      ? operations.delete
      : action === 'publish'
        ? operations.publish
        : operations.unpublish
  // Sanity's delete removes only the versions it is told about: called with none it leaves the
  // draft behind (published article) or does nothing (draft-only article). Name every version.
  const {hasDraft, hasPublished} = article
  const versionsToDelete = useMemo(
    () => [...(hasDraft ? [toDraftId(id)] : []), ...(hasPublished ? [id] : [])],
    [id, hasDraft, hasPublished],
  )

  useEffect(() => {
    if (started.current || finished.current) return
    if (permissionLoading) return
    if (!permission?.granted) {
      if (permission) console.warn('[Content Center] Permission denied:', permission.reason)
      finish({ok: false, message: deniedMessage(action)})
      return
    }

    if (action === 'publish') {
      if (validation.isValidating) return
      const errors = validation.validation.filter((marker) => marker.level === 'error')
      if (errors.length > 0) {
        const first = errors[0]?.message ?? 'a required field is invalid'
        const more = errors.length > 1 ? ` (and ${errors.length - 1} more)` : ''
        finish({
          ok: false,
          message: `Cannot publish: ${first}${more} Fix it in the Editorial & Settings tool first.`,
        })
        return
      }
    }

    if (operation.disabled === 'NOT_READY') return
    if (operation.disabled) {
      finish({ok: false, message: reasonMessage(action, operation.disabled)})
      return
    }

    started.current = true
    if (action === 'delete') operations.delete.execute(versionsToDelete)
    else if (action === 'publish') operations.publish.execute()
    else operations.unpublish.execute()
    // `finish` only touches refs and a ref'd callback, so it is safe to leave out of the deps.
  }, [action, operations, operation, permission, permissionLoading, validation, versionsToDelete])

  useEffect(() => {
    if (!started.current || finished.current || !event) return
    // The delete operation is reported as `delete` (or its legacy alias `del`).
    const sameAction = action === 'delete' ? event.op === 'delete' || event.op === 'del' : event.op === action
    if (event === previousEvent.current || !sameAction) return
    if (event.type === 'success') {
      finish({ok: true})
    } else {
      console.error('[Content Center] Operation failed.', event.error)
      finish({ok: false, message: event.error.message || `The ${action} did not complete.`})
    }
  }, [event, action])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      finish({
        ok: false,
        message: `The ${action} could not be confirmed. The list was refreshed: check the article before trying again.`,
      })
    }, TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [action])

  return null
}
