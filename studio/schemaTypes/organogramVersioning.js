/**
 * Single source of truth for organogram version management (Batch 7.1).
 * Pure data and helpers only: no Studio, React or network imports, so the schema, the
 * migration script and any future upload handler or public query can share the same rules.
 *
 * Model
 *  - Every upload is its own `organogram` document. Publishing a new version never edits the
 *    PDF of an older one; the older document is only flipped from "current" to "archived".
 *  - `status` is "current" or "archived". Exactly one PUBLISHED document should be "current".
 *  - Documents created before this batch have no `status`. They stay valid and are treated as
 *    "legacy" until the migration script gives them a status and a version number.
 */

export const ORGANOGRAM_TYPE = 'organogram'

export const ORGANOGRAM_STATUS = Object.freeze({
  current: 'current',
  archived: 'archived',
})

export const ORGANOGRAM_STATUS_OPTIONS = [
  {title: 'Current (shown on the website)', value: ORGANOGRAM_STATUS.current},
  {title: 'Archived (kept for history)', value: ORGANOGRAM_STATUS.archived},
]

/** Fields every consumer needs. The PDF URL is resolved from the asset reference. */
export const ORGANOGRAM_PROJECTION = `{
  _id,
  _createdAt,
  title,
  versionLabel,
  versionNumber,
  status,
  publishedAt,
  effectiveDate,
  archivedAt,
  versionNote,
  "fileAssetRef": file.asset._ref,
  "fileUrl": file.asset->url,
  "fileName": file.asset->originalFilename,
  "fileSize": file.asset->size
}`

/**
 * The ONE current organogram. Deterministic, so two requests never disagree:
 *  1. only published documents (drafts are excluded) that actually have a PDF,
 *  2. archived versions are excluded,
 *  3. a document marked "current" wins over an unmigrated legacy document,
 *  4. ties are broken by versionNumber, then effectiveDate, then creation time.
 * Before the migration runs this returns the newest legacy record, exactly like the old rule
 * ("newest published organogram by effective date").
 */
export const CURRENT_ORGANOGRAM_QUERY = `*[
  _type == "organogram"
  && !(_id in path("drafts.**"))
  && defined(file.asset._ref)
  && status != "archived"
] | order(
  select(status == "current" => 1, 0) desc,
  versionNumber desc,
  effectiveDate desc,
  _createdAt desc
)[0]${ORGANOGRAM_PROJECTION}`

/** Every published version, newest first. Includes archived versions. */
export const ORGANOGRAM_VERSIONS_QUERY = `*[
  _type == "organogram"
  && !(_id in path("drafts.**"))
] | order(
  versionNumber desc,
  effectiveDate desc,
  _createdAt desc
)${ORGANOGRAM_PROJECTION}`

/** Archived versions only, newest first. */
export const ARCHIVED_ORGANOGRAMS_QUERY = `*[
  _type == "organogram"
  && !(_id in path("drafts.**"))
  && status == "archived"
] | order(
  versionNumber desc,
  effectiveDate desc,
  _createdAt desc
)${ORGANOGRAM_PROJECTION}`

/** Integrity probe: healthy when currentCount == 1 and the other counts are 0. */
export const ORGANOGRAM_INTEGRITY_QUERY = `{
  "currentCount": count(*[_type == "organogram" && !(_id in path("drafts.**")) && status == "current"]),
  "legacyCount": count(*[_type == "organogram" && !(_id in path("drafts.**")) && !defined(status)]),
  "missingVersionNumber": count(*[_type == "organogram" && !(_id in path("drafts.**")) && !defined(versionNumber)]),
  "total": count(*[_type == "organogram" && !(_id in path("drafts.**"))])
}`

/** Published id for a document id (drafts. prefix removed). */
export const publishedId = (id) => (typeof id === 'string' ? id.replace(/^drafts\./, '') : id)

const time = (value) => {
  const t = Date.parse(value)
  return Number.isNaN(t) ? 0 : t
}

/**
 * Same ordering as CURRENT_ORGANOGRAM_QUERY, for code that already holds the documents.
 * `docs` are published documents; drafts and archived or file-less records are ignored.
 */
export function pickCurrentOrganogram(docs) {
  const candidates = (docs || []).filter(
    (d) =>
      d &&
      !String(d._id || '').startsWith('drafts.') &&
      d.file?.asset?._ref &&
      d.status !== ORGANOGRAM_STATUS.archived,
  )
  candidates.sort(
    (a, b) =>
      (b.status === ORGANOGRAM_STATUS.current ? 1 : 0) -
        (a.status === ORGANOGRAM_STATUS.current ? 1 : 0) ||
      (b.versionNumber || 0) - (a.versionNumber || 0) ||
      time(b.effectiveDate) - time(a.effectiveDate) ||
      time(b._createdAt) - time(a._createdAt),
  )
  return candidates[0] || null
}

/** Next free version number for a set of existing documents (used by later batches). */
export const nextVersionNumber = (docs) =>
  (docs || []).reduce((max, d) => Math.max(max, Number(d?.versionNumber) || 0), 0) + 1

/**
 * The write that publishes a new version safely, as plain mutations for a single transaction:
 * archive the previous current document(s) and create the new current one. Nothing is deleted
 * and no existing PDF is touched. Used by the upload batch; exported here so the rule lives in
 * one place.
 */
export function buildPublishMutations({newDocument, previousCurrentIds = [], now}) {
  const stamp = now || new Date().toISOString()
  return [
    ...previousCurrentIds.map((id) => ({
      patch: {id, set: {status: ORGANOGRAM_STATUS.archived, archivedAt: stamp}},
    })),
    {create: {...newDocument, _type: ORGANOGRAM_TYPE, status: ORGANOGRAM_STATUS.current}},
  ]
}
