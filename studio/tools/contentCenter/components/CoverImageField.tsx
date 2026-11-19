import {useEffect, useId, useRef, useState} from 'react'
import type {ChangeEvent, DragEvent} from 'react'

import {coverSrc} from '../lib/articles'
import type {ArticleCover, ArticleCoverChange} from '../lib/types'
import {Button} from './Button'
import {Icon} from './Icon'

/* ------------------------------- Constants ------------------------------------- */

/** Largest cover image the form accepts, in bytes. */
export const COVER_MAX_BYTES = 10 * 1024 * 1024
export const COVER_MAX_LABEL = '10 MB'
export const COVER_ALT_MAX_LENGTH = 200

const ACCEPTED_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_EXTENSIONS: readonly string[] = ['jpg', 'jpeg', 'png', 'webp']
/** Value for the file input's `accept` attribute. */
const ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

export const COVER_ALT_REQUIRED_TEXT = 'Describe the image: alt text is required for a new cover.'
export const COVER_ALT_EMPTY_UPDATE_TEXT =
  'Alt text cannot be empty. Enter a description, or remove the cover.'

/* ------------------------------- State ----------------------------------------- */

/**
 * What the form currently intends to do with the cover. It mirrors ArticleCoverChange with one
 * difference: a newly selected image has no Sanity asset yet, so `new` holds the local File
 * instead of an asset reference. Nothing here has been uploaded or saved.
 *
 * - `unchanged`: the cover is left alone.
 * - `new`: a local image was selected (a first cover, or a replacement). The File is kept for
 *   the save handler; a replacement starts a fresh image, so hotspot and crop are not kept.
 * - `alt`: the existing image stays and only its alt text changed.
 * - `remove`: the existing cover will be unset. The Sanity asset itself is never deleted.
 */
export type CoverDraft =
  | {kind: 'unchanged'}
  | {kind: 'new'; file: File; alt: string}
  | {kind: 'alt'; alt: string}
  | {kind: 'remove'}

export const UNCHANGED_COVER: CoverDraft = {kind: 'unchanged'}

/** True when the draft would change something if it were saved. */
export function hasCoverChange(draft: CoverDraft): boolean {
  return draft.kind !== 'unchanged'
}

/** A message for the first problem that would block saving the cover, or null. */
export function getCoverProblem(draft: CoverDraft): string | null {
  if (draft.kind === 'new' && draft.alt.trim() === '') return COVER_ALT_REQUIRED_TEXT
  if (draft.kind === 'alt' && draft.alt.trim() === '') return COVER_ALT_EMPTY_UPDATE_TEXT
  return null
}

/**
 * Converts the draft into the ArticleCoverChange the data layer understands. A `new` draft has no
 * Sanity asset until the save handler uploads its File, so the caller passes the asset id Sanity
 * returned; without one this returns null rather than inventing a reference.
 */
export function toCoverChange(draft: CoverDraft, uploadedAssetRef?: string): ArticleCoverChange | null {
  switch (draft.kind) {
    case 'unchanged':
      return {kind: 'unchanged'}
    case 'alt':
      return {kind: 'alt', alt: draft.alt.trim()}
    case 'remove':
      return {kind: 'remove'}
    case 'new':
      return uploadedAssetRef ? {kind: 'set', assetRef: uploadedAssetRef, alt: draft.alt.trim()} : null
  }
}

/** Returns a message when the file cannot be used as a cover, or null when it is acceptable. */
export function checkCoverFile(file: File): string | null {
  const extension = file.name.includes('.') ? (file.name.split('.').pop() ?? '').toLowerCase() : ''
  const typeOk = ACCEPTED_TYPES.includes(file.type.toLowerCase())
  const extensionOk = ACCEPTED_EXTENSIONS.includes(extension)
  // Browsers sometimes report an empty type; trust the extension only in that case.
  const accepted = file.type === '' ? extensionOk : typeOk && (extension === '' || extensionOk)
  if (!accepted) {
    return `“${file.name}” is not supported. Choose a JPG, PNG or WebP image.`
  }
  if (file.size === 0) return `“${file.name}” is empty. Choose a different image.`
  if (file.size > COVER_MAX_BYTES) {
    return `“${file.name}” is ${formatBytes(file.size)}. Cover images can be up to ${COVER_MAX_LABEL}.`
  }
  return null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ------------------------------- Component ------------------------------------- */

interface CoverImageFieldProps {
  /** The current cover intent. The parent owns it so the save handler can read it. */
  value: CoverDraft
  onChange: (next: CoverDraft) => void
  /** The cover the article already has (edit mode), or null. */
  existing: ArticleCover | null
  /** Show alt-text problems even before the field was touched (set after a save attempt). */
  showErrors?: boolean
  disabled?: boolean
}

/**
 * Cover photograph field for Create and Edit Article. It only selects and previews images and
 * records the intended change: it never uploads anything to Sanity.
 */
export function CoverImageField({
  value,
  onChange,
  existing,
  showErrors = false,
  disabled = false,
}: CoverImageFieldProps) {
  const ids = {alt: useId(), label: useId(), file: useId()}
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [altTouched, setAltTouched] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const selectedFile = value.kind === 'new' ? value.file : null

  // The temporary preview URL lives exactly as long as the selected File and is revoked when the
  // file changes, is cleared, or the field unmounts.
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [selectedFile])

  const removed = value.kind === 'remove'
  const hasExisting = existing !== null
  const showingExisting = hasExisting && !removed && value.kind !== 'new'
  const showingNew = value.kind === 'new'

  const altValue =
    value.kind === 'new' || value.kind === 'alt' ? value.alt : (existing?.alt ?? '')
  const altEditable = showingNew || showingExisting
  const altProblem = getCoverProblem(value)
  const altErrorVisible = altProblem !== null && (altTouched || showErrors)
  const noExistingAlt = showingExisting && value.kind === 'unchanged' && altValue.trim() === ''

  const openPicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  const acceptFile = (file: File | undefined) => {
    if (!file) return
    const problem = checkCoverFile(file)
    if (problem) {
      // The current selection is kept: a rejected file never replaces it.
      setFileError(problem)
      return
    }
    setFileError(null)
    setAltTouched(false)
    // A new image always starts with empty alt text: the old description would not match it.
    onChange({kind: 'new', file, alt: value.kind === 'new' ? value.alt : ''})
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Clearing the value lets the same file be chosen again after it was discarded.
    event.target.value = ''
    acceptFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    const files = event.dataTransfer.files
    if (files.length > 1) {
      setFileError('Drop one image at a time.')
      return
    }
    acceptFile(files[0])
  }

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    if (!disabled) setDragging(true)
  }

  const handleAlt = (next: string) => {
    if (value.kind === 'new') {
      onChange({...value, alt: next})
      return
    }
    if (!existing) return
    // Typing the original text back is no change at all.
    if (next === existing.alt) onChange(UNCHANGED_COVER)
    else onChange({kind: 'alt', alt: next})
  }

  /** Drops a selected local image. With an existing cover that goes back to it, unchanged. */
  const discardSelection = () => {
    setFileError(null)
    setAltTouched(false)
    onChange(UNCHANGED_COVER)
  }

  const removeExisting = () => {
    setFileError(null)
    setAltTouched(false)
    onChange({kind: 'remove'})
  }

  const undoRemoval = () => {
    setFileError(null)
    onChange(UNCHANGED_COVER)
  }

  const fileInput = (
    <input
      ref={inputRef}
      id={ids.file}
      type="file"
      className="ecc-cover-file"
      accept={ACCEPT_ATTRIBUTE}
      tabIndex={-1}
      aria-hidden="true"
      disabled={disabled}
      onChange={handleInput}
    />
  )

  const hint = `JPG, PNG or WebP · up to ${COVER_MAX_LABEL} · 16:9 landscape, 1600 × 900 px or larger`

  return (
    <div className="ecc-field ecc-cover" role="group" aria-labelledby={ids.label}>
      <span className="ecc-label" id={ids.label}>
        Cover photograph{' '}
        <span>{showingNew ? 'New image' : removed ? 'Will be removed' : 'Optional'}</span>
      </span>
      {fileInput}

      {showingNew || showingExisting ? (
        <div className="ecc-cover-card">
          <div className="ecc-cover-frame">
            {showingNew ? (
              previewUrl ? (
                <img src={previewUrl} alt="Preview of the selected cover image" />
              ) : (
                <span className="ecc-cover-wait">Preparing preview…</span>
              )
            ) : existing ? (
              <img
                src={coverSrc(existing.url, 960)}
                alt={existing.alt || 'Current cover image'}
                style={{objectPosition: existing.objectPosition}}
              />
            ) : null}
          </div>

          <div className="ecc-cover-meta">
            {showingNew && selectedFile ? (
              <p className="ecc-cover-file-info">
                <b>{selectedFile.name}</b> · {formatBytes(selectedFile.size)} · selected from your
                device, not uploaded yet
              </p>
            ) : (
              <p className="ecc-cover-file-info">Current cover image</p>
            )}

            <div className="ecc-cover-actions">
              <Button variant="quiet" icon="upload" onClick={openPicker} disabled={disabled}>
                Replace image
              </Button>
              {showingNew && hasExisting ? (
                <Button variant="quiet" onClick={discardSelection} disabled={disabled}>
                  Keep current image
                </Button>
              ) : null}
              <Button
                variant="quiet"
                onClick={showingNew && !hasExisting ? discardSelection : removeExisting}
                disabled={disabled}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`ecc-drop${dragging ? ' ecc-drop--active' : ''}`}
          onClick={openPicker}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={disabled}
        >
          <span className="ecc-chip">
            <Icon name="upload" />
          </span>
          <b>{removed ? 'Choose a new cover image' : 'Drop an image or browse'}</b>
          <span>{hint}</span>
        </button>
      )}

      {removed ? (
        <div className="ecc-cover-removed" role="status">
          <span>
            The current cover will be removed when this is saved. The image stays in the media
            library.
          </span>
          <Button variant="quiet" onClick={undoRemoval} disabled={disabled}>
            Undo removal
          </Button>
        </div>
      ) : null}

      {fileError ? (
        <p className="ecc-cover-error" role="alert">
          {fileError}
        </p>
      ) : null}

      {altEditable ? (
        <div className="ecc-cover-alt">
          <label className="ecc-label" htmlFor={ids.alt}>
            Alt text{' '}
            <span>
              {altValue.length} / {COVER_ALT_MAX_LENGTH}
            </span>
          </label>
          <input
            id={ids.alt}
            className="ecc-input"
            maxLength={COVER_ALT_MAX_LENGTH}
            placeholder="e.g. Elmivet container vessel docked at Tin Can Island Port"
            value={altValue}
            disabled={disabled}
            aria-invalid={altErrorVisible}
            aria-describedby={`${ids.alt}-help`}
            onChange={(event) => handleAlt(event.target.value)}
            onBlur={() => setAltTouched(true)}
          />
          <p
            id={`${ids.alt}-help`}
            className={altErrorVisible ? 'ecc-cover-error' : 'ecc-note'}
            role={altErrorVisible ? 'alert' : undefined}
          >
            {altErrorVisible
              ? altProblem
              : noExistingAlt
                ? 'This cover has no alt text yet. Add a short description for screen readers.'
                : 'Describe what the image shows, for screen readers and search engines.'}
          </p>
        </div>
      ) : null}

      {!showingNew && !showingExisting && !removed ? (
        <p className="ecc-note ecc-cover-empty-note">No cover image yet. Alt text is required once one is chosen.</p>
      ) : null}
    </div>
  )
}
