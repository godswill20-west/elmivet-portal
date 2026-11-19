import type {SanityClient} from 'sanity'

import {
  ORGANOGRAM_STATUS,
  ORGANOGRAM_TYPE,
  nextVersionNumber,
} from '../../../schemaTypes/organogramVersioning'

/** Largest organogram PDF accepted, in bytes. */
export const ORGANOGRAM_MAX_BYTES = 20 * 1024 * 1024
export const ORGANOGRAM_MAX_LABEL = '20 MB'
export const ORGANOGRAM_TITLE_MAX = 120
export const ORGANOGRAM_NOTE_MAX = 300
export const DEFAULT_ORGANOGRAM_TITLE = 'Elmivet Corporate Structure & Governance Organogram'

/** Raised for any failed step. `cancelled` is true when the administrator aborted the upload. */
export class OrganogramUploadError extends Error {
  cancelled: boolean
  constructor(message: string, cancelled = false) {
    super(message)
    this.name = 'OrganogramUploadError'
    this.cancelled = cancelled
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Synchronous checks: extension, MIME type, empty file, size. Returns a message or null. */
export function checkOrganogramFile(file: File): string | null {
  const extension = file.name.includes('.') ? (file.name.split('.').pop() ?? '').toLowerCase() : ''
  const type = file.type.toLowerCase()
  if (extension !== 'pdf') return `“${file.name}” is not a PDF. Only .pdf files are accepted.`
  // Some browsers report an empty type; the file signature check below then decides.
  if (type !== '' && type !== 'application/pdf') {
    return `“${file.name}” is not a PDF (it reports ${file.type}). Only PDF files are accepted.`
  }
  if (file.size === 0) return `“${file.name}” is empty. Choose a different PDF.`
  if (file.size > ORGANOGRAM_MAX_BYTES) {
    return `“${file.name}” is ${formatFileSize(file.size)}. The limit is ${ORGANOGRAM_MAX_LABEL}.`
  }
  return null
}

/** True when the file really starts like a PDF ("%PDF-" within the first 1024 bytes). */
export async function hasPdfSignature(file: File): Promise<boolean> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
    const marker = [0x25, 0x50, 0x44, 0x46, 0x2d] // %PDF-
    for (let i = 0; i + marker.length <= bytes.length; i++) {
      if (marker.every((byte, j) => bytes[i + j] === byte)) return true
    }
    return false
  } catch {
    return false
  }
}

function describeError(error: unknown, fallback: string): string {
  const statusCode = (error as {statusCode?: number} | null)?.statusCode
  if (statusCode === 401 || statusCode === 403) return 'you do not have permission to do this.'
  if (statusCode === 413) return 'the file is too large for Sanity to accept.'
  const message = error instanceof Error ? error.message : ''
  return message || fallback
}

/** What the next upload needs to know about the records that already exist. */
export interface OrganogramInfo {
  /** Published records only. */
  publishedCount: number
  nextVersion: number
  latest: {title: string; versionNumber: number | null; uploadedAt: string} | null
}

interface ExistingRow {
  _id: string
  _createdAt: string
  title?: string
  versionNumber?: number | null
}

/** Reads existing organogram records (drafts included for numbering). Never writes. */
export async function loadOrganogramInfo(client: SanityClient): Promise<OrganogramInfo> {
  let rows: ExistingRow[]
  try {
    rows = await client.fetch<ExistingRow[]>(
      '*[_type == $type]{_id, _createdAt, title, versionNumber} | order(_createdAt desc)',
      {type: ORGANOGRAM_TYPE},
    )
  } catch (caught) {
    console.error('[Content Center] Reading organogram records failed.', caught)
    throw new OrganogramUploadError(
      `Could not read the existing organogram records: ${describeError(caught, 'check your connection.')}`,
    )
  }
  const published = rows.filter((row) => !row._id.startsWith('drafts.'))
  const latest = published[0]
  return {
    publishedCount: published.length,
    nextVersion: nextVersionNumber(rows),
    latest: latest
      ? {
          title: latest.title ?? 'Organogram',
          versionNumber: typeof latest.versionNumber === 'number' ? latest.versionNumber : null,
          uploadedAt: latest._createdAt,
        }
      : null,
  }
}

/** Everything the record needs, fixed once so a retry creates the very same record. */
export interface OrganogramPlan {
  documentId: string
  versionNumber: number
  status: 'current' | 'archived'
}

/**
 * Decides the id, version number and status of the new record.
 * Existing records are never changed. The new record becomes "current" only when no published
 * organogram exists at all; otherwise it is stored as "archived" and promoting it is a later
 * step, so the live organogram is untouched by an upload.
 */
export function planOrganogram(info: OrganogramInfo, uuid: string): OrganogramPlan {
  return {
    // No dot in the id: Sanity only lets unauthenticated readers (the public website) read documents
    // whose _id has no dot, so a dotted id would hide the organogram from the site.
    documentId: uuid,
    versionNumber: info.nextVersion,
    status: info.publishedCount === 0 ? ORGANOGRAM_STATUS.current : ORGANOGRAM_STATUS.archived,
  }
}

const FILE_ASSET_ID = /^file-[a-f0-9]+-pdf$/

export interface UploadedPdf {
  assetId: string
}

interface UploadEvent {
  type?: string
  percent?: number
  stage?: string
  body?: {document?: {_id?: string; mimeType?: string}}
}

/**
 * Uploads the PDF to Sanity's file asset store with the Studio's own authenticated client and
 * returns the asset id Sanity assigned. `onProgress` receives 0-100. Aborting the signal stops
 * the transfer. The asset is never deleted by this app.
 */
export function uploadOrganogramPdf(
  client: SanityClient,
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<UploadedPdf> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new OrganogramUploadError('Upload cancelled.', true))
      return
    }
    let settled = false
    const finish = (action: () => void) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      action()
    }
    const subscription = client.observable.assets
      .upload('file', file, {filename: file.name, contentType: 'application/pdf'})
      .subscribe({
        next: (raw: unknown) => {
          const event = raw as UploadEvent
          if (event.type === 'progress' && typeof event.percent === 'number') {
            onProgress(Math.min(100, Math.max(0, Math.round(event.percent))))
            return
          }
          if (event.type === 'response') {
            const asset = event.body?.document
            const assetId = asset?._id
            if (
              typeof assetId !== 'string' ||
              !FILE_ASSET_ID.test(assetId) ||
              asset?.mimeType !== 'application/pdf'
            ) {
              finish(() =>
                reject(new OrganogramUploadError('Sanity returned an unexpected response for the upload.')),
              )
              return
            }
            onProgress(100)
            finish(() => resolve({assetId}))
          }
        },
        error: (caught: unknown) => {
          console.error('[Content Center] Uploading the organogram PDF failed.', caught)
          finish(() =>
            reject(
              new OrganogramUploadError(
                `The PDF could not be uploaded: ${describeError(caught, 'check your connection and try again.')}`,
              ),
            ),
          )
        },
        complete: () => {
          finish(() =>
            reject(new OrganogramUploadError('The upload ended without a confirmation from Sanity.')),
          )
        },
      })
    function onAbort() {
      subscription.unsubscribe()
      finish(() => reject(new OrganogramUploadError('Upload cancelled.', true)))
    }
    signal.addEventListener('abort', onAbort)
  })
}

export interface OrganogramRecordInput {
  plan: OrganogramPlan
  assetId: string
  title: string
  /** yyyy-mm-dd from the date input. */
  effectiveDate: string
  note: string
}

/**
 * Creates the published organogram document with the Batch 7.1 fields. `createIfNotExists` on
 * a fixed id makes a retry safe: a record that was actually saved is never duplicated.
 */
export async function createOrganogramRecord(
  client: SanityClient,
  {plan, assetId, title, effectiveDate, note}: OrganogramRecordInput,
): Promise<void> {
  const note_ = note.trim()
  try {
    await client.createIfNotExists({
      _id: plan.documentId,
      _type: ORGANOGRAM_TYPE,
      title: title.trim(),
      file: {_type: 'file', asset: {_type: 'reference', _ref: assetId}},
      effectiveDate: `${effectiveDate}T00:00:00.000Z`,
      publishedAt: new Date().toISOString(),
      versionNumber: plan.versionNumber,
      versionLabel: `Version ${plan.versionNumber}`,
      status: plan.status,
      ...(note_ ? {versionNote: note_} : {}),
    })
  } catch (caught) {
    console.error('[Content Center] Creating the organogram record failed.', caught)
    throw new OrganogramUploadError(
      `The PDF was uploaded, but the organogram record could not be saved: ${describeError(caught, 'check your connection and try again.')}`,
    )
  }
}
