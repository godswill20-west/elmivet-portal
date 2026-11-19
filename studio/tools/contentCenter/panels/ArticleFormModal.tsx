import type {PortableTextBlock} from '@portabletext/editor'
import {useCallback, useId, useMemo, useRef, useState} from 'react'
import {useClient} from 'sanity'

import {Button} from '../components/Button'
import {
  CoverImageField,
  UNCHANGED_COVER,
  getCoverProblem,
  toCoverChange,
} from '../components/CoverImageField'
import type {CoverDraft} from '../components/CoverImageField'
import {useArticleBody} from '../hooks/useArticleBody'
import {ArticleBodyEditor} from '../editor/ArticleBodyEditor'
import type {ArticleBodyEditorHandle} from '../editor/ArticleBodyEditor'
import {BodyPreview} from '../editor/BodyPreview'
import type {BodyIssue} from '../editor/bodySchema'
import {
  HEADLINE_MAX_LENGTH,
  SUMMARY_MAX_LENGTH,
  TAG_MAX_LENGTH,
  buildArticleEditPatch,
  buildCoverOnlyPatch,
  buildDraftCopyFromPublished,
  buildDraftDocument,
  checkBodyForEdit,
  toDraftId,
  toPublishedId,
  validateDraftInput,
} from '../lib/articles'
import {API_VERSION, ARTICLE_CATEGORIES} from '../lib/constants'
import {CoverUploadError, uploadCoverImage} from '../lib/coverUpload'
import type {ArticleCategory} from '../lib/constants'
import type {ArticleCoverChange, ArticleSummary} from '../lib/types'
import {useToast} from '../overlay/OverlayProvider'
import {Modal} from '../overlay/Modal'

const HEADLINE_MAX = HEADLINE_MAX_LENGTH
const SUMMARY_MAX = SUMMARY_MAX_LENGTH

interface ArticleFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  /** Article to prefill when editing. Saving writes to its draft, never to the published document. */
  article: ArticleSummary | null
  onClose: () => void
  onUnavailable?: (message: string) => void
  /** Called after a new draft was saved to Sanity, so the article list can be re-read. */
  onSaved?: () => void
  /**
   * Called after "Publish" has saved the form to the draft, once the form has closed. The caller
   * runs the real publish (validation, Sanity operation, read-back) and reports its result.
   */
  onPublish?: (article: Pick<ArticleSummary, 'id' | 'title' | 'hasDraft' | 'hasPublished'>) => void
}

/** Turns a Sanity client error into a sentence an editor can act on. */
function describeSaveError(error: unknown): string {
  const statusCode = (error as {statusCode?: number} | null)?.statusCode
  if (statusCode === 401 || statusCode === 403) {
    return 'The draft could not be saved: you do not have permission to create articles.'
  }
  const message = error instanceof Error ? error.message : ''
  return message
    ? `The draft could not be saved: ${message}`
    : 'The draft could not be saved. Check your connection and try again.'
}

/** An error the edit save raises itself when it detects that the article moved on. */
function conflictError(): Error {
  return Object.assign(new Error('Revision conflict'), {statusCode: 409})
}

/** Turns an edit-save failure into a sentence an editor can act on. */
function describeEditSaveError(error: unknown): string {
  const statusCode = (error as {statusCode?: number} | null)?.statusCode
  const message = error instanceof Error ? error.message : ''
  if (statusCode === 409) {
    return 'Nothing was saved: this article was changed by someone else after you opened it. Close this form, reopen the article to see the latest version, and make your edits again.'
  }
  if (statusCode === 401 || statusCode === 403) {
    return 'The draft could not be saved: you do not have permission to edit articles.'
  }
  if (statusCode === 404 || /not found/i.test(message)) {
    return 'Nothing was saved: this article no longer exists in the form you opened. It may have been published or deleted. Close this form and reopen the article.'
  }
  return message
    ? `The draft could not be saved: ${message}`
    : 'The draft could not be saved. Check your connection and try again.'
}

/**
 * Create / Edit Article form. In create mode "Save draft" writes a real `drafts.` document to
 * Sanity, including the Portable Text body from the article editor. In edit mode "Save draft"
 * only ever writes to `drafts.<id>`: it patches an existing draft (guarded by its revision), or,
 * for a published-only article, creates a draft copy. The published document is never written.
 * "Publish" first saves the form exactly like "Save draft" (same revision guards, same cover
 * handling), then hands the saved article to `onPublish`; nothing is published when saving fails. A selected cover image is
 * uploaded to Sanity's asset store when the article is saved and its asset reference and alt text
 * are written to the draft being saved (see saveCover helpers below). Create saves the draft first
 * and then attaches the cover to that exact draft, so a failed upload never loses the draft.
 */
export function ArticleFormModal({
  open,
  mode,
  article,
  onClose,
  onSaved,
  onPublish,
}: ArticleFormModalProps) {
  const editing = mode === 'edit' && article !== null
  const ids = {headline: useId(), label: useId(), summary: useId(), body: useId()}
  const [headline, setHeadline] = useState(editing ? article.title : '')
  const [summary, setSummary] = useState(editing ? article.excerpt : '')
  const [category, setCategory] = useState<ArticleCategory | null>(
    editing ? article.category : null,
  )
  const [label, setLabel] = useState(editing ? (article.tag ?? '') : '')
  // The body as last reported by the editor. It seeds the editor when the dialog reopens (the
  // other fields survive a cancel, so the body does too) and feeds the live preview. It can lag
  // the editor by up to a second, so saving and closing read the editor itself (see readBody).
  const [body, setBody] = useState<PortableTextBlock[] | undefined>(undefined)
  const [editorKey, setEditorKey] = useState(0)
  // Edit mode only: the body as last reported by the editor, wrapped so that "emptied" (undefined)
  // can be told apart from "not touched yet" (null). It drives the live preview.
  const [editedBody, setEditedBody] = useState<{value: PortableTextBlock[] | undefined} | null>(
    null,
  )
  const [bodyBlocked, setBodyBlocked] = useState(false)
  // What the form intends to do with the cover. A newly selected image keeps its File here for
  // the save handler; nothing is uploaded or written to Sanity by this state.
  const [cover, setCover] = useState<CoverDraft>(UNCHANGED_COVER)
  const [coverShowErrors, setCoverShowErrors] = useState(false)
  // An image already uploaded for the pending File, so a retry after a failed save never uploads
  // it twice. It is tied to that File object: choosing another image makes it stale.
  const uploadedCover = useRef<{file: File; assetRef: string} | null>(null)
  // Create mode only: the draft this form already created. While set, saving continues with THAT
  // draft (never creates another) and the pending cover belongs to it. Cleared by closing the form.
  const [createdDraft, setCreatedDraft] = useState<{draftId: string; rev: string} | null>(null)
  const [coverSaveError, setCoverSaveError] = useState<string | null>(null)
  const bodyHandleRef = useRef<ArticleBodyEditorHandle | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const toast = useToast()
  const studioClient = useClient({apiVersion: API_VERSION})
  const client = useMemo(() => studioClient.withConfig({useCdn: false}), [studioClient])
  // Edit mode fetches this one article's full body (draft first, else published) when opened.
  const loadedBody = useArticleBody(open && editing ? article.id : null)
  const shownBody = editing ? loadedBody.body : body
  const previewBody = editing && editedBody ? editedBody.value : shownBody
  const handleEditedBody = useCallback(
    (value: PortableTextBlock[] | undefined) => setEditedBody({value}),
    [],
  )

  /** The editor's content right now, or the last reported body when no editor is mounted. */
  const readBody = (): PortableTextBlock[] | undefined => bodyHandleRef.current?.getValue() ?? body

  const handleBodyInvalid = useCallback((issues: BodyIssue[]) => {
    setBodyBlocked(issues.some((issue) => issue.severity === 'error'))
  }, [])

  /** Keeps what was typed, so reopening the form after Cancel, Escape or × shows it again. */
  const close = () => {
    if (!editing && createdDraft) {
      // The draft already exists in the list. Start the next new article from a clean form so
      // this draft's pending cover can never carry over to it.
      resetCreateForm()
    } else if (!editing) setBody(readBody())
    else {
      setEditedBody(null)
      // Cancelling an edit discards any cover change; nothing was saved.
      resetCover()
    }
    onClose()
  }

  const resetCover = () => {
    setCover(UNCHANGED_COVER)
    setCoverShowErrors(false)
    setCoverSaveError(null)
    uploadedCover.current = null
  }

  /** Empties the Create form completely, including any pending cover and the created-draft link. */
  const resetCreateForm = () => {
    setHeadline('')
    setSummary('')
    setCategory(null)
    setLabel('')
    setBody(undefined)
    setBodyBlocked(false)
    setCreatedDraft(null)
    resetCover()
    // A new key mounts an empty editor, so no content carries over into the next form.
    setEditorKey((current) => current + 1)
  }

  /**
   * Turns the pending cover into the change the data layer writes. A new image is uploaded first
   * (or its earlier upload is reused) and the real asset id Sanity returned becomes the reference.
   * Throws CoverUploadError when the upload fails.
   */
  const resolveCoverChange = async (): Promise<ArticleCoverChange> => {
    if (cover.kind !== 'new') return toCoverChange(cover) ?? {kind: 'unchanged'}
    const earlier = uploadedCover.current
    let assetRef = earlier && earlier.file === cover.file ? earlier.assetRef : null
    if (!assetRef) {
      assetRef = await uploadCoverImage(client, cover.file)
      uploadedCover.current = {file: cover.file, assetRef}
    }
    return {kind: 'set', assetRef, alt: cover.alt.trim()}
  }

  /** Confirms the document Sanity returned really holds the cover that was just written. */
  const assertCoverSaved = (doc: unknown, change: ArticleCoverChange) => {
    const saved = (doc as {coverImage?: {asset?: {_ref?: string}; alt?: string}} | null)?.coverImage
    const ok =
      change.kind === 'set'
        ? saved?.asset?._ref === change.assetRef && saved?.alt === change.alt.trim()
        : change.kind === 'alt'
          ? saved?.alt === change.alt.trim()
          : change.kind === 'remove'
            ? !saved
            : true
    if (!ok) throw new Error('Sanity did not confirm the cover image on the saved article.')
  }

  const coverChangeNote = (change: ArticleCoverChange): string | null =>
    change.kind === 'set'
      ? 'Cover image saved.'
      : change.kind === 'alt'
        ? 'Cover alt text saved.'
        : change.kind === 'remove'
          ? 'Cover image removed.'
          : null

  /** Blocks saving while the cover change is incomplete (for example a new image without alt text). */
  const coverBlocksSave = (): boolean => {
    const problem = getCoverProblem(cover)
    if (!problem) return false
    setCoverShowErrors(true)
    toast.show(problem, {tone: 'error'})
    return true
  }

  /**
   * Edit mode "Save draft". Writes only to `drafts.<id>`, only the fields this form edits, and
   * only when nothing changed in Sanity since the article was loaded.
   */
  const saveEdit = async (thenPublish = false) => {
    if (!article) return
    if (savingRef.current) return
    if (loadedBody.status !== 'ready') {
      toast.show(
        loadedBody.status === 'error'
          ? 'The article could not be loaded, so nothing was saved. Use “Try again” first.'
          : 'The article is still loading. Try again in a moment.',
        {tone: 'error'},
      )
      return
    }

    // The body is only written when the editor can edit it, it holds content, and it changed.
    let editedValue: PortableTextBlock[] | undefined
    let writeBody = false
    if (!bodyBlocked) {
      const handle = bodyHandleRef.current
      if (!handle) {
        toast.show('The article body editor is not ready yet, so nothing was saved.', {
          tone: 'error',
        })
        return
      }
      // Read at click time: the last onChange value can miss the final words typed.
      editedValue = handle.getValue() ?? undefined
      const check = checkBodyForEdit(loadedBody.body, editedValue)
      if (!check.ok) {
        toast.show(check.message, {tone: 'error'})
        return
      }
      writeBody = check.write
    }

    if (coverBlocksSave()) return

    const input = {headline, category, label, summary, body: editedValue}
    const problem = validateDraftInput(input)
    if (problem) {
      toast.show(problem, {tone: 'error'})
      return
    }

    const copiedFromPublished = loadedBody.source !== 'draft'
    savingRef.current = true
    setSaving(true)
    try {
      // Upload first: if it fails nothing at all is written, so the article and the form stay
      // exactly as they were and the selection can be retried.
      const coverChange = await resolveCoverChange()
      const patch = buildArticleEditPatch({...input, coverImage: coverChange}, writeBody)
      let savedDoc: unknown
      if (!copiedFromPublished) {
        // A draft exists: patch it. `ifRevisionId` fails with a 409 if it changed after loading.
        if (!loadedBody.draftRev) throw conflictError()
        const operation = client
          .patch(toDraftId(article.id))
          .ifRevisionId(loadedBody.draftRev)
          .set(patch.set)
        savedDoc = await (patch.unset.length > 0 ? operation.unset(patch.unset) : operation).commit()
      } else {
        // Published only: copy it into a draft. The published document is read, never written.
        const published = await client.getDocument(toPublishedId(article.id))
        if (!published) {
          throw new Error('The published article no longer exists, so nothing was saved.')
        }
        if (!loadedBody.publishedRev || published._rev !== loadedBody.publishedRev) {
          throw conflictError()
        }
        // `create` fails with a 409 if someone created a draft after this form was opened.
        savedDoc = await client.create(buildDraftCopyFromPublished(published, patch))
      }
      assertCoverSaved(savedDoc, coverChange)
      const title = String(patch.set.title)
      const notes = [
        copiedFromPublished ? 'The published article is unchanged.' : null,
        bodyBlocked ? 'The body was left unchanged.' : null,
        coverChangeNote(coverChange),
      ].filter(Boolean)
      if (!thenPublish) {
        toast.show(
          `${copiedFromPublished ? 'Draft copy of' : 'Draft'} “${title}” saved.${notes.length ? ` ${notes.join(' ')}` : ''}`,
          {tone: 'success'},
        )
      }
      setEditedBody(null)
      // The cover change is saved, so it is no longer pending.
      resetCover()
      onSaved?.()
      onClose()
      if (thenPublish) {
        onPublish?.({id: article.id, title, hasDraft: true, hasPublished: article.hasPublished})
      }
    } catch (caught) {
      console.error('[Content Center] Saving the article edits failed.', caught)
      if (caught instanceof CoverUploadError) {
        const message = `Nothing was saved: the cover image could not be uploaded (${caught.message}) Your image and alt text are still selected. Try saving again.`
        setCoverSaveError(message)
        toast.show(message, {tone: 'error'})
      } else {
        const reused = uploadedCover.current !== null && cover.kind === 'new'
        toast.show(
          `${describeEditSaveError(caught)}${reused ? ' The cover image was uploaded and will be reused when you try again.' : ''}`,
          {tone: 'error'},
        )
      }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const saveDraft = async (thenPublish = false) => {
    if (editing) return saveEdit(thenPublish)
    // The ref blocks a second click that lands before React re-renders the disabled button.
    if (savingRef.current) return
    if (bodyBlocked) {
      toast.show('The article body cannot be edited here, so the draft was not saved.', {
        tone: 'error',
      })
      return
    }
    if (coverBlocksSave()) return
    // Read at click time: the last onChange value can miss the final words typed.
    const input = {headline, category, label, summary, body: readBody()}
    const problem = validateDraftInput(input)
    if (problem) {
      toast.show(problem, {tone: 'error'})
      return
    }

    savingRef.current = true
    setSaving(true)
    setCoverSaveError(null)
    // Set once the draft exists, so a failure afterwards is reported as a cover failure.
    let created: {draftId: string; rev: string; title: string} | null = null
    try {
      if (!createdDraft) {
        // `create` (not createOrReplace) fails if the id exists, and the `drafts.` id keeps the
        // document unpublished. The cover is attached afterwards, to this exact document.
        const doc = buildDraftDocument({...input, coverImage: {kind: 'unchanged'}})
        const result = await client.create(doc)
        created = {draftId: doc._id, rev: result._rev, title: doc.title}
        // From here on this form is bound to this draft: a retry never creates another one.
        setCreatedDraft({draftId: doc._id, rev: result._rev})
        onSaved?.()
        if (cover.kind === 'new') {
          const coverChange = await resolveCoverChange()
          const patch = buildCoverOnlyPatch(coverChange)
          const saved = await client
            .patch(doc._id)
            .ifRevisionId(result._rev)
            .set(patch.set)
            .commit()
          assertCoverSaved(saved, coverChange)
        }
      } else {
        // Retry for the draft this form already created: save the form's fields and the cover to
        // that draft, guarded by the revision this form last saw.
        const coverChange = await resolveCoverChange()
        created = {...createdDraft, title: input.headline.trim()}
        const patch = buildArticleEditPatch(
          {...input, body: bodyBlocked ? undefined : input.body, coverImage: coverChange},
          true,
        )
        const operation = client.patch(createdDraft.draftId).ifRevisionId(createdDraft.rev).set(patch.set)
        const saved = await (patch.unset.length > 0 ? operation.unset(patch.unset) : operation).commit()
        assertCoverSaved(saved, coverChange)
      }
      const title = created?.title ?? input.headline.trim()
      if (!thenPublish) {
        toast.show(`Draft “${title}” saved.${cover.kind === 'new' ? ' Cover image saved.' : ''}`, {
          tone: 'success',
        })
      }
      const publishId = created ? toPublishedId(created.draftId) : null
      resetCreateForm()
      onSaved?.()
      onClose()
      if (thenPublish && publishId) {
        onPublish?.({id: publishId, title, hasDraft: true, hasPublished: false})
      }
    } catch (caught) {
      console.error('[Content Center] Saving the draft failed.', caught)
      if (created) {
        // The draft exists; only the cover failed. Keep the File, preview and alt text.
        const detail =
          caught instanceof CoverUploadError
            ? `the image could not be uploaded (${caught.message})`
            : describeEditSaveError(caught).replace(/^The draft could not be saved: /, '')
        const reused = uploadedCover.current !== null ? ' The image was uploaded and will be reused.' : ''
        const message = `The draft “${created.title}” was saved, but its cover image was not: ${detail}${reused} Your image and alt text are still selected. Click “Retry cover” to try again; no second draft will be created.`
        setCoverSaveError(message)
        toast.show(message, {tone: 'error'})
        onSaved?.()
      } else {
        toast.show(describeSaveError(caught), {tone: 'error'})
      }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      eyebrow={editing ? 'Editing' : 'New article'}
      title={editing ? 'Edit Article' : 'Create Article'}
      initialFocus="[data-initial-focus]"
      onSubmit={(event) => event.preventDefault()}
      footer={
        <>
          <span className="ecc-note">
            Unsupported formatting is flagged, never silently removed.
          </span>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <Button variant="quiet" onClick={close}>
              Cancel
            </Button>
            <Button onClick={() => void saveDraft()} disabled={saving} aria-busy={saving}>
              {saving ? 'Saving…' : createdDraft ? 'Retry cover' : 'Save draft'}
            </Button>
            <Button
              variant="navy"
              onClick={() => void saveDraft(true)}
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? 'Working…' : 'Publish'}
            </Button>
          </div>
        </>
      }
    >
      <div className="ecc-modal-body">
        <div className="ecc-modal-col">
          <div className="ecc-field">
            <label className="ecc-label" htmlFor={ids.headline}>
              Headline{' '}
              <span>
                {headline.length} / {HEADLINE_MAX}
              </span>
            </label>
            <input
              id={ids.headline}
              className="ecc-input ecc-input--title"
              data-initial-focus
              maxLength={HEADLINE_MAX}
              placeholder="A clear, specific headline"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
            />
          </div>

          <div className="ecc-field" role="group" aria-labelledby={`${ids.label}-cat`}>
            <span className="ecc-label" id={`${ids.label}-cat`}>
              Category
            </span>
            <div className="ecc-chips">
              {ARTICLE_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="ecc-choice"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="ecc-field">
            <label className="ecc-label" htmlFor={ids.label}>
              Card label <span>Optional</span>
            </label>
            <input
              id={ids.label}
              className="ecc-input"
              maxLength={TAG_MAX_LENGTH}
              placeholder="e.g. Customs &amp; Compliance"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="ecc-field">
            <label className="ecc-label" htmlFor={ids.summary}>
              Executive summary{' '}
              <span>
                {summary.length} / {SUMMARY_MAX}
              </span>
            </label>
            <textarea
              id={ids.summary}
              className="ecc-area"
              rows={3}
              maxLength={SUMMARY_MAX}
              placeholder="Two or three sentences for the article card"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>

          {coverSaveError ? (
            <p className="ecc-cover-error" role="alert">
              {coverSaveError}
            </p>
          ) : null}
          <CoverImageField
            value={cover}
            onChange={setCover}
            existing={editing ? article.cover : null}
            showErrors={coverShowErrors}
            disabled={saving}
          />
        </div>

        <div className="ecc-modal-col">
          <div className="ecc-field" style={{margin: 0}}>
            <span className="ecc-label" id={ids.body}>
              Article body <span>Live preview</span>
            </span>
            {editing && loadedBody.status !== 'ready' ? (
              loadedBody.status === 'error' ? (
                <div className="ecc-empty ecc-empty--error" role="alert">
                  <strong>The article body could not be loaded</strong>
                  <p>{loadedBody.error}</p>
                  <Button variant="quiet" onClick={loadedBody.retry}>
                    Try again
                  </Button>
                </div>
              ) : (
                <div className="ecc-empty" role="status" aria-live="polite">
                  <strong>Loading article body…</strong>
                </div>
              )
            ) : (
              <ArticleBodyEditor
                key={editing ? `edit-${article.id}` : `create-${editorKey}`}
                value={shownBody}
                onChange={editing ? handleEditedBody : setBody}
                onInvalid={handleBodyInvalid}
                handleRef={bodyHandleRef}
                readOnly={false}
                ariaLabel="Article body"
              />
            )}
          </div>
          <div className="ecc-preview" aria-live="polite">
            <BodyPreview value={previewBody} emptyMessage="The formatted article appears here as you write." />
          </div>
        </div>
      </div>
    </Modal>
  )
}