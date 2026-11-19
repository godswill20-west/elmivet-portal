import {useEffect, useMemo, useRef, useState} from 'react'
import {useClient} from 'sanity'
import {toDraftId} from '../lib/articles'
import {API_VERSION, DOCUMENT_TYPES} from '../lib/constants'
import {
  contentFingerprint,
  describePublishProblems,
  fetchArticleSnapshot,
  findPublishProblems,
} from '../lib/publishChecks'
import type {ArticleSnapshot} from '../lib/publishChecks'
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
  /** Only the fields an operation needs, so a just-saved article can be published before the list reloads. */
  article: Pick<ArticleSummary, 'id' | 'title' | 'hasDraft' | 'hasPublished'>
  /** True when the draft was saved from the article form immediately before this publish. */
  afterSave?: boolean
}

export type OperationResult = {ok: true} | {ok: false; message: string}

interface ArticleOperationRunnerProps {
  request: OperationRequest
  onDone: (result: OperationResult) => void
}

/** Give up if Sanity never reports an outcome (offline, or the document pair never loads). */
const TIMEOUT_MS = 20000

const NOT_CONFIRMED =
  'Sanity reported success but the result could not be confirmed. The list was refreshed: check the article before trying again.'

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

  const studioClient = useClient({apiVersion: API_VERSION})
  // `raw` returns drafts too; no CDN, so confirmation reads are never stale.
  const client = useMemo(
    () => studioClient.withConfig({perspective: 'raw', useCdn: false}),
    [studioClient],
  )
  // What Sanity held just before the operation: used to validate it and to confirm its outcome.
  const [snapshot, setSnapshot] = useState<ArticleSnapshot | null>(null)
  const needsSnapshot = action !== 'delete'

  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const started = useRef(false)
  const finished = useRef(false)
  // Set once Sanity reports success and the result is being read back; stops the timeout firing.
  const verifying = useRef(false)
  const snapshotRef = useRef<ArticleSnapshot | null>(null)
  snapshotRef.current = snapshot
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
    if (!needsSnapshot) return
    let cancelled = false
    fetchArticleSnapshot(client, id)
      .then((result) => {
        if (!cancelled) setSnapshot(result)
      })
      .catch((caught) => {
        if (cancelled) return
        console.error('[Content Center] Reading the article before the operation failed.', caught)
        finish({
          ok: false,
          message: `The article could not be read from Sanity, so nothing was ${action === 'publish' ? 'published' : 'unpublished'}. Check your connection and try again.`,
        })
      })
    return () => {
      cancelled = true
    }
    // `finish` only touches refs and a ref'd callback.
  }, [client, id, action, needsSnapshot])

  useEffect(() => {
    if (started.current || finished.current) return
    if (permissionLoading) return
    if (!permission?.granted) {
      if (permission) console.warn('[Content Center] Permission denied:', permission.reason)
      finish({ok: false, message: deniedMessage(action)})
      return
    }

    if (needsSnapshot) {
      if (!snapshot) return
      if (action === 'publish') {
        if (!snapshot.draft) {
          finish({
            ok: false,
            message: snapshot.published
              ? REASONS.publish.ALREADY_PUBLISHED
              : REASONS.publish.TARGET_NOT_FOUND,
          })
          return
        }
        const problems = findPublishProblems(snapshot.draft)
        if (problems.length > 0) {
          finish({ok: false, message: describePublishProblems(snapshot.draft.title, problems)})
          return
        }
      } else if (!snapshot.published) {
        finish({ok: false, message: REASONS.unpublish.NOT_PUBLISHED})
        return
      }
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
  }, [
    action,
    operations,
    operation,
    permission,
    permissionLoading,
    validation,
    versionsToDelete,
    needsSnapshot,
    snapshot,
  ])

  /** Reads the article back from Sanity and checks the operation really had its intended effect. */
  const confirmOutcome = async (): Promise<OperationResult> => {
    if (action === 'delete') return {ok: true}
    const before = snapshotRef.current
    try {
      const after = await fetchArticleSnapshot(client, id)
      if (action === 'publish') {
        if (!after.published) {
          return {
            ok: false,
            message:
              'Sanity reported success, but no published article was found, so nothing is live. The list was refreshed: try publishing again.',
          }
        }
        if (findPublishProblems(after.published).length > 0) {
          return {
            ok: false,
            message:
              'The saved published article is incomplete, so it should not be live. Open it, fix the required fields and publish again.',
          }
        }
        if (
          before?.draft &&
          contentFingerprint(after.published) !== contentFingerprint(before.draft)
        ) {
          return {
            ok: false,
            message:
              'The article was published, but its content differs from the version that was checked: it was changed while publishing. Open it and review the live version.',
          }
        }
        return {ok: true}
      }
      // unpublish
      if (after.published) {
        return {
          ok: false,
          message: 'Sanity reported success, but the article is still published. The list was refreshed: try again.',
        }
      }
      if (!after.draft) {
        return {
          ok: false,
          message:
            'The article was unpublished, but its working draft could not be found. Check the article before editing it.',
        }
      }
      if (
        before?.draft &&
        contentFingerprint(after.draft) !== contentFingerprint(before.draft)
      ) {
        return {
          ok: false,
          message:
            'The article was unpublished, but its working draft differs from the one that existed before. Open the article and review the draft.',
        }
      }
      return {ok: true}
    } catch (caught) {
      console.error('[Content Center] Confirming the operation failed.', caught)
      return {ok: false, message: NOT_CONFIRMED}
    }
  }

  useEffect(() => {
    if (!started.current || finished.current || verifying.current || !event) return
    // The delete operation is reported as `delete` (or its legacy alias `del`).
    const sameAction = action === 'delete' ? event.op === 'delete' || event.op === 'del' : event.op === action
    if (event === previousEvent.current || !sameAction) return
    if (event.type === 'success') {
      // Success is only reported once the document is read back from Sanity.
      verifying.current = true
      void confirmOutcome().then(finish)
    } else {
      console.error('[Content Center] Operation failed.', event.error)
      finish({ok: false, message: event.error.message || `The ${action} did not complete.`})
    }
  }, [event, action])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (verifying.current) return
      finish({
        ok: false,
        message: `The ${action} could not be confirmed. The list was refreshed: check the article before trying again.`,
      })
    }, TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [action])

  return null
}
