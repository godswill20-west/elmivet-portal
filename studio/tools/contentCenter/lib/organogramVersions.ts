import type {SanityClient} from 'sanity'

import {ORGANOGRAM_STATUS, ORGANOGRAM_TYPE} from '../../../schemaTypes/organogramVersioning'

/* -------------------------------------------------------------------------- */
/*  Reading                                                                   */
/* -------------------------------------------------------------------------- */

export type VersionStatus = 'current' | 'archived' | 'legacy'

export interface OrganogramVersion {
  id: string
  rev: string
  createdAt: string
  title: string
  versionNumber: number | null
  versionLabel: string | null
  /** `legacy` = a record from before Batch 7.1 that has no status yet. */
  status: VersionStatus
  publishedAt: string | null
  effectiveDate: string | null
  archivedAt: string | null
  assetId: string | null
  mimeType: string | null
  url: string | null
  fileName: string | null
  size: number | null
  /** Why this version cannot be made current, or null when it can. */
  problem: string | null
  /** The unpublished draft of this record, when someone has edited it in the desk. */
  draft: {id: string; rev: string} | null
}

export interface VersionsView {
  /** Newest first, ordered by version metadata. */
  versions: OrganogramVersion[]
  /** The single current version, or null when none is current. */
  current: OrganogramVersion | null
  /** Highest version number: the most recent upload. May differ from `current`. */
  latest: OrganogramVersion | null
  /** More than one record flagged current (should never happen; shown as a warning). */
  currentCount: number
  /** Records without a status (not migrated yet). */
  legacyCount: number
}

interface RawRow {
  _id: string
  _rev: string
  _createdAt: string
  title?: string | null
  versionNumber?: number | null
  versionLabel?: string | null
  status?: string | null
  publishedAt?: string | null
  effectiveDate?: string | null
  archivedAt?: string | null
  assetId?: string | null
  mimeType?: string | null
  url?: string | null
  fileName?: string | null
  size?: number | null
}

/** Run with the `raw` perspective so drafts are included. */
export const VERSIONS_QUERY = `*[_type == "${ORGANOGRAM_TYPE}"]{
  _id, _rev, _createdAt, title, versionNumber, versionLabel, status, publishedAt,
  effectiveDate, archivedAt,
  "assetId": file.asset._ref,
  "mimeType": file.asset->mimeType,
  "url": file.asset->url,
  "fileName": file.asset->originalFilename,
  "size": file.asset->size
}`

const DRAFT_PREFIX = 'drafts.'
const time = (value: string | null | undefined): number => {
  const t = value ? Date.parse(value) : NaN
  return Number.isNaN(t) ? 0 : t
}

/** Why a record cannot be the current organogram, or null when it is valid. */
export function eligibilityProblem(row: {
  assetId?: string | null
  mimeType?: string | null
  url?: string | null
  versionNumber?: number | null
  title?: string | null
}): string | null {
  if (!row.assetId || !row.url) return 'No PDF is attached.'
  if (row.mimeType !== 'application/pdf') return 'The attached file is not a PDF.'
  if (!Number.isInteger(row.versionNumber) || (row.versionNumber as number) < 1) {
    return 'No version number yet. Run the organogram migration first.'
  }
  if (!row.title || !row.title.trim()) return 'No title.'
  return null
}

function toStatus(value: string | null | undefined): VersionStatus {
  if (value === ORGANOGRAM_STATUS.current) return 'current'
  if (value === ORGANOGRAM_STATUS.archived) return 'archived'
  return 'legacy'
}

export function buildView(rows: RawRow[]): VersionsView {
  const drafts = new Map<string, {id: string; rev: string}>()
  for (const row of rows) {
    if (row._id.startsWith(DRAFT_PREFIX)) {
      drafts.set(row._id.slice(DRAFT_PREFIX.length), {id: row._id, rev: row._rev})
    }
  }
  const versions: OrganogramVersion[] = rows
    .filter((row) => !row._id.startsWith(DRAFT_PREFIX))
    .map((row) => ({
      id: row._id,
      rev: row._rev,
      createdAt: row._createdAt,
      title: row.title?.trim() || 'Organogram',
      versionNumber: typeof row.versionNumber === 'number' ? row.versionNumber : null,
      versionLabel: row.versionLabel ?? null,
      status: toStatus(row.status),
      publishedAt: row.publishedAt ?? null,
      effectiveDate: row.effectiveDate ?? null,
      archivedAt: row.archivedAt ?? null,
      assetId: row.assetId ?? null,
      mimeType: row.mimeType ?? null,
      url: row.url ?? null,
      fileName: row.fileName ?? null,
      size: typeof row.size === 'number' ? row.size : null,
      problem: eligibilityProblem(row),
      draft: drafts.get(row._id) ?? null,
    }))
    .sort(
      (a, b) =>
        (b.versionNumber ?? -1) - (a.versionNumber ?? -1) ||
        time(b.effectiveDate) - time(a.effectiveDate) ||
        time(b.createdAt) - time(a.createdAt),
    )

  const flaggedCurrent = versions.filter((v) => v.status === 'current')
  return {
    versions,
    current: flaggedCurrent[0] ?? null,
    latest: versions[0] ?? null,
    currentCount: flaggedCurrent.length,
    legacyCount: versions.filter((v) => v.status === 'legacy').length,
  }
}

export async function loadVersions(client: SanityClient): Promise<VersionsView> {
  const rows = await client.fetch<RawRow[]>(VERSIONS_QUERY)
  return buildView(rows)
}

/* -------------------------------------------------------------------------- */
/*  Changing the current version                                              */
/* -------------------------------------------------------------------------- */

export interface OperationResult {
  ok: boolean
  message: string
}

const label = (v: OrganogramVersion): string =>
  v.versionNumber ? `Version ${v.versionNumber}` : v.title

function describe(error: unknown): string {
  const statusCode = (error as {statusCode?: number} | null)?.statusCode
  if (statusCode === 409) {
    return 'The organogram records changed while this was running. Nothing was changed. The list has been refreshed: please try again.'
  }
  if (statusCode === 401 || statusCode === 403) return 'You do not have permission to change organograms.'
  const message = error instanceof Error ? error.message : ''
  return message || 'Check your connection and try again. Nothing was changed.'
}

/**
 * Archives every non-archived record in `archive`, and optionally sets `target` current, in ONE
 * Sanity transaction. Each patch carries the revision just read (`ifRevisionId`), so if anyone
 * edits a record in between, the whole transaction is rejected and nothing changes. Documents
 * and PDF assets are never deleted. Drafts of the touched records get the same status so a later
 * publish of a draft cannot bring back an old status.
 */
async function commitStatusChange(
  client: SanityClient,
  archive: OrganogramVersion[],
  target: OrganogramVersion | null,
): Promise<void> {
  const now = new Date().toISOString()
  const archived = {status: ORGANOGRAM_STATUS.archived, archivedAt: now}
  const tx = client.transaction()
  for (const v of archive) {
    tx.patch(v.id, (p) => p.ifRevisionId(v.rev).set(archived))
    if (v.draft) {
      const draft = v.draft
      tx.patch(draft.id, (p) => p.ifRevisionId(draft.rev).set(archived))
    }
  }
  if (target) {
    tx.patch(target.id, (p) =>
      p.ifRevisionId(target.rev).set({status: ORGANOGRAM_STATUS.current}).unset(['archivedAt']),
    )
    if (target.draft) {
      const draft = target.draft
      tx.patch(draft.id, (p) =>
        p.ifRevisionId(draft.rev).set({status: ORGANOGRAM_STATUS.current}).unset(['archivedAt']),
      )
    }
  }
  await tx.commit({visibility: 'sync'})
}

/**
 * Makes `id` the current organogram and archives whatever was current (and any unmigrated record
 * that was acting as current), atomically. Afterwards it re-reads and confirms exactly one is
 * current. A failure changes nothing.
 */
export async function makeOrganogramCurrent(client: SanityClient, id: string): Promise<OperationResult> {
  try {
    const view = await loadVersions(client)
    const target = view.versions.find((v) => v.id === id)
    if (!target) return {ok: false, message: 'That version no longer exists. The list was refreshed.'}
    if (target.status === 'current' && view.currentCount === 1) {
      return {ok: false, message: `${label(target)} is already the current organogram.`}
    }
    if (target.problem) {
      return {ok: false, message: `${label(target)} cannot be made current: ${target.problem}`}
    }
    const archive = view.versions.filter((v) => v.id !== target.id && v.status !== 'archived')
    await commitStatusChange(client, archive, target)

    const after = await loadVersions(client)
    if (after.currentCount !== 1 || after.current?.id !== target.id) {
      return {
        ok: false,
        message: `${label(target)} was saved, but the check afterwards did not find exactly one current version. Please review the version history.`,
      }
    }
    const replaced = archive.filter((v) => v.status === 'current')
    return {
      ok: true,
      message: replaced.length
        ? `${label(target)} is now the current organogram. ${replaced.map(label).join(', ')} was archived and its PDF kept.`
        : `${label(target)} is now the current organogram.`,
    }
  } catch (caught) {
    console.error('[Content Center] Making an organogram current failed.', caught)
    return {ok: false, message: `Could not change the current organogram. ${describe(caught)}`}
  }
}

/**
 * Removes the current organogram from publication: it is archived (record and PDF kept) and no
 * version is current afterwards. Any unmigrated record is archived in the same transaction so
 * nothing else can silently take over.
 */
export async function unpublishCurrentOrganogram(client: SanityClient, id: string): Promise<OperationResult> {
  try {
    const view = await loadVersions(client)
    const target = view.versions.find((v) => v.id === id)
    if (!target) return {ok: false, message: 'That version no longer exists. The list was refreshed.'}
    if (target.status !== 'current') {
      return {ok: false, message: `${label(target)} is not the current organogram, so there is nothing to unpublish.`}
    }
    const archive = view.versions.filter((v) => v.status !== 'archived')
    await commitStatusChange(client, archive, null)

    const after = await loadVersions(client)
    if (after.currentCount !== 0 || after.legacyCount !== 0) {
      return {
        ok: false,
        message: 'The change was saved, but a current version still appears to exist. Please review the version history.',
      }
    }
    return {
      ok: true,
      message: `${label(target)} was removed from publication and archived. No organogram is current now. Its PDF is kept.`,
    }
  } catch (caught) {
    console.error('[Content Center] Unpublishing the organogram failed.', caught)
    return {ok: false, message: `Could not unpublish the organogram. ${describe(caught)}`}
  }
}

/** Download link for the Sanity CDN: asks the browser to save the PDF under a readable name. */
export function downloadUrl(v: OrganogramVersion): string | null {
  if (!v.url) return null
  const name = v.fileName || `organogram-version-${v.versionNumber ?? 'file'}.pdf`
  return `${v.url}?dl=${encodeURIComponent(name)}`
}
