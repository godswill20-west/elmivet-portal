import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react'
import type {ChangeEvent, DragEvent, FormEvent} from 'react'
import {useClient, useCurrentUser} from 'sanity'

import {Button} from '../components/Button'
import {Icon} from '../components/Icon'
import {API_VERSION} from '../lib/constants'
import {formatDate} from '../lib/format'
import {
  DEFAULT_ORGANOGRAM_TITLE,
  ORGANOGRAM_MAX_LABEL,
  ORGANOGRAM_NOTE_MAX,
  ORGANOGRAM_TITLE_MAX,
  OrganogramUploadError,
  checkOrganogramFile,
  createOrganogramRecord,
  formatFileSize,
  hasPdfSignature,
  loadOrganogramInfo,
  planOrganogram,
  uploadOrganogramPdf,
} from '../lib/organogramUpload'
import type {OrganogramInfo, OrganogramPlan} from '../lib/organogramUpload'
import {Modal} from '../overlay/Modal'
import {useToast} from '../overlay/OverlayProvider'

interface UploadOrganogramModalProps {
  open: boolean
  onClose: () => void
  /** Called after a record was saved, so the version history can refresh. */
  onSaved?: () => void
}

type Phase = 'idle' | 'checking' | 'uploading' | 'saving'

/** The PDF is already in Sanity Assets but its record was not saved: kept so a retry skips the upload. */
interface PendingRecord {
  assetId: string
  plan: OrganogramPlan
  file: File
}

const todayInputValue = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Organogram PDF upload: choose a PDF, check and preview it, upload it to Sanity Assets and
 * create the organogram record (Batch 7.1 fields). It never edits or deletes existing records
 * or assets.
 */
export function UploadOrganogramModal({open, onClose, onSaved}: UploadOrganogramModalProps) {
  const toast = useToast()
  const ids = {title: useId(), date: useId(), note: useId(), file: useId()}
  const studioClient = useClient({apiVersion: API_VERSION})
  const client = useMemo(() => studioClient.withConfig({useCdn: false}), [studioClient])
  const currentUser = useCurrentUser()
  const isAdministrator = Boolean(currentUser?.roles?.some((role) => role.name === 'administrator'))

  const inputRef = useRef<HTMLInputElement | null>(null)
  const busyRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [title, setTitle] = useState(DEFAULT_ORGANOGRAM_TITLE)
  const [date, setDate] = useState(todayInputValue)
  const [note, setNote] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingRecord | null>(null)
  const [info, setInfo] = useState<OrganogramInfo | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)

  const busy = phase !== 'idle'

  // Existing records are read (never written) each time the dialog opens.
  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setInfo(null)
    setInfoError(null)
    loadOrganogramInfo(client).then(
      (result) => !cancelled && setInfo(result),
      (caught: unknown) =>
        !cancelled &&
        setInfoError(caught instanceof Error ? caught.message : 'Could not read existing records.'),
    )
    return () => {
      cancelled = true
    }
  }, [open, client])

  // The preview URL lives exactly as long as the selected file.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => () => abortRef.current?.abort(), [])

  const resetForm = useCallback(() => {
    setFile(null)
    setFileError(null)
    setTitle(DEFAULT_ORGANOGRAM_TITLE)
    setDate(todayInputValue())
    setNote('')
    setError(null)
    setProgress(0)
    setPending(null)
  }, [])

  const handleClose = () => {
    if (phase === 'saving') return // a record write is in flight: let it finish
    if (phase === 'uploading') abortRef.current?.abort()
    // A PDF that is already uploaded keeps its form so the record can be retried later.
    if (!pending) resetForm()
    onClose()
  }

  const cancelUpload = () => abortRef.current?.abort()

  const chooseFile = async (candidate: File | undefined) => {
    if (!candidate || busy) return
    const problem = checkOrganogramFile(candidate)
    if (problem) {
      setFileError(problem) // the current selection is kept
      return
    }
    if (!(await hasPdfSignature(candidate))) {
      setFileError(`“${candidate.name}” does not look like a real PDF file.`)
      return
    }
    setFileError(null)
    setError(null)
    setProgress(0)
    setPending(null) // a different file needs its own upload
    setFile(candidate)
  }

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    event.target.value = ''
    void chooseFile(picked)
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDragging(false)
    if (busy) return
    if (event.dataTransfer.files.length > 1) {
      setFileError('Drop one PDF at a time.')
      return
    }
    void chooseFile(event.dataTransfer.files[0])
  }

  const clearFile = () => {
    if (busy) return
    setFile(null)
    setFileError(null)
    setError(null)
    setProgress(0)
    setPending(null)
  }

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (busyRef.current) return // no duplicate submissions
    if (!isAdministrator) return
    const target = pending?.file ?? file
    if (!target) {
      setError('Choose an organogram PDF first.')
      return
    }
    const problem = checkOrganogramFile(target)
    if (problem) {
      setError(problem)
      return
    }
    if (!title.trim()) {
      setError('Enter a document title.')
      return
    }
    if (title.trim().length > ORGANOGRAM_TITLE_MAX) {
      setError(`The title can be up to ${ORGANOGRAM_TITLE_MAX} characters.`)
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      setError('Choose a valid effective date.')
      return
    }
    if (note.length > ORGANOGRAM_NOTE_MAX) {
      setError(`The version note can be up to ${ORGANOGRAM_NOTE_MAX} characters.`)
      return
    }

    busyRef.current = true
    setError(null)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      let record = pending
      if (!record) {
        setPhase('checking')
        if (!(await hasPdfSignature(target))) {
          throw new OrganogramUploadError(`“${target.name}” does not look like a real PDF file.`)
        }
        const fresh = await loadOrganogramInfo(client)
        const plan = planOrganogram(fresh, crypto.randomUUID())
        setPhase('uploading')
        setProgress(0)
        const uploaded = await uploadOrganogramPdf(client, target, setProgress, controller.signal)
        record = {assetId: uploaded.assetId, plan, file: target}
        setPending(record)
      }
      setPhase('saving')
      await createOrganogramRecord(client, {
        plan: record.plan,
        assetId: record.assetId,
        title,
        effectiveDate: date,
        note,
      })
      toast.show(
        record.plan.status === 'current'
          ? `Organogram version ${record.plan.versionNumber} uploaded and set as current.`
          : `Organogram version ${record.plan.versionNumber} uploaded and saved. The current organogram was not changed.`,
        {tone: 'success'},
      )
      resetForm()
      onSaved?.()
      onClose()
    } catch (caught) {
      if (caught instanceof OrganogramUploadError && caught.cancelled) {
        setProgress(0)
        setError(null)
      } else {
        setError(
          caught instanceof Error ? caught.message : 'Something went wrong. Please try again.',
        )
      }
    } finally {
      abortRef.current = null
      busyRef.current = false
      setPhase('idle')
    }
  }

  const submitLabel =
    phase === 'checking'
      ? 'Checking…'
      : phase === 'uploading'
        ? `Uploading ${progress}%`
        : phase === 'saving'
          ? 'Saving record…'
          : pending
            ? 'Retry saving record'
            : 'Upload & save'

  const shownFile = pending?.file ?? file
  const nextVersion = pending?.plan.versionNumber ?? info?.nextVersion
  const latestDate = info?.latest ? formatDate(info.latest.uploadedAt) : null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="narrow"
      eyebrow={nextVersion ? `Version ${nextVersion}` : 'New version'}
      title="Upload Organogram"
      initialFocus="[data-initial-focus]"
      onSubmit={(event) => void submit(event)}
      footer={
        <>
          <span />
          <div style={{display: 'flex', gap: 8}}>
            <Button variant="quiet" onClick={phase === 'uploading' ? cancelUpload : handleClose} disabled={phase === 'saving'}>
              {phase === 'uploading' ? 'Cancel upload' : 'Cancel'}
            </Button>
            <Button
              variant="navy"
              icon="upload"
              type="submit"
              disabled={busy || !isAdministrator || !shownFile}
              aria-busy={busy}
            >
              {submitLabel}
            </Button>
          </div>
        </>
      }
    >
      <div className="ecc-modal-col ecc-modal-col--scroll">
        {!isAdministrator && currentUser ? (
          <p className="ecc-cover-error" role="alert" style={{margin: 0}}>
            Only administrators can upload an organogram.
          </p>
        ) : null}

        <div className="ecc-field">
          <input
            ref={inputRef}
            id={ids.file}
            type="file"
            className="ecc-cover-file"
            accept=".pdf,application/pdf"
            tabIndex={-1}
            aria-hidden="true"
            disabled={busy || !isAdministrator}
            onChange={onInput}
          />
          {shownFile ? (
            <div className="ecc-cover-card">
              <div className="ecc-pdf-frame">
                {previewUrl ? (
                  <iframe src={previewUrl} title="Preview of the selected organogram PDF" />
                ) : (
                  <span className="ecc-cover-wait">Preparing preview…</span>
                )}
              </div>
              <div className="ecc-cover-meta">
                <p className="ecc-cover-file-info">
                  <b>{shownFile.name}</b> · {formatFileSize(shownFile.size)} ·{' '}
                  {pending ? 'uploaded, record not saved yet' : 'selected from your device, not uploaded yet'}
                </p>
                {busy ? (
                  <div
                    className="ecc-progress"
                    role="progressbar"
                    aria-label="Upload progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={phase === 'uploading' ? progress : phase === 'saving' ? 100 : 0}
                  >
                    <span style={{width: `${phase === 'saving' ? 100 : progress}%`}} />
                  </div>
                ) : null}
                <div className="ecc-cover-actions">
                  <Button variant="quiet" icon="upload" onClick={() => inputRef.current?.click()} disabled={busy}>
                    Replace file
                  </Button>
                  <Button variant="quiet" onClick={clearFile} disabled={busy}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`ecc-drop${dragging ? ' ecc-drop--active' : ''}`}
              style={{padding: 34}}
              data-initial-focus
              disabled={!isAdministrator}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault()
                if (isAdministrator) setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span className="ecc-chip">
                <Icon name="doc" />
              </span>
              <b>Drop the PDF here, or browse</b>
              <span>PDF only · up to {ORGANOGRAM_MAX_LABEL}</span>
            </button>
          )}
          {fileError ? (
            <p className="ecc-cover-error" role="alert">
              {fileError}
            </p>
          ) : null}
        </div>

        <div className="ecc-field">
          <label className="ecc-label" htmlFor={ids.title}>
            Document title
          </label>
          <input
            id={ids.title}
            className="ecc-input"
            value={title}
            maxLength={ORGANOGRAM_TITLE_MAX}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="ecc-field">
          <label className="ecc-label" htmlFor={ids.date}>
            Effective date
          </label>
          <input
            id={ids.date}
            className="ecc-input"
            type="date"
            value={date}
            disabled={busy}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="ecc-field">
          <label className="ecc-label" htmlFor={ids.note}>
            Version note <span>Internal</span>
          </label>
          <textarea
            id={ids.note}
            className="ecc-area"
            rows={2}
            maxLength={ORGANOGRAM_NOTE_MAX}
            placeholder="What changed in this version?"
            value={note}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {error ? (
          <p className="ecc-cover-error" role="alert" style={{margin: 0}}>
            {error}
          </p>
        ) : null}

        <p className="ecc-note" style={{margin: 0}}>
          {infoError
            ? infoError
            : info?.latest
              ? `Latest on record: ${info.latest.title}${info.latest.versionNumber ? ` (version ${info.latest.versionNumber})` : ''}${latestDate ? `, saved ${latestDate}` : ''}. `
              : info
                ? 'No organogram is on record yet; this upload will become the current one. '
                : 'Reading existing records… '}
          Each upload is saved as a new version and existing versions are never replaced or deleted.
          Use “Make current” in the version history to publish a version.
        </p>
      </div>
    </Modal>
  )
}
