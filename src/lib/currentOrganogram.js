/**
 * Public "current organogram" lookup. Pure (no imports) so it can be tested on its own.
 *
 * It matches the Content Center's version management: the ONE published organogram whose
 * `status` is "current". Archived versions and records without a status are never returned,
 * and the newest upload is never chosen just because it is newest. If nothing is current the
 * result is null (the About page then shows its "not available" state); there is no fallback file.
 * Order only breaks a tie if bad data ever marks several as current.
 *
 * The query also counts the published "current" records. That is what lets the page tell
 *   - "nothing is current"                       (currentCount === 0  -> null, empty state)
 *   - "something is current but its file is bad" (currentCount > 0 and no match -> error)
 * apart, instead of showing both as the same empty result.
 */
const PUBLISHED_CURRENT = `_type == "organogram" && !(_id in path("drafts.**")) && status == "current"`

export const CURRENT_ORGANOGRAM_QUERY = `{
  "match": *[
    ${PUBLISHED_CURRENT}
    && defined(file.asset._ref)
    && file.asset->mimeType == "application/pdf"
  ] | order(versionNumber desc, effectiveDate desc, _createdAt desc)[0]{
    _id,
    title,
    versionNumber,
    versionLabel,
    effectiveDate,
    publishedAt,
    "url": file.asset->url,
    "fileName": file.asset->originalFilename
  },
  "currentCount": count(*[${PUBLISHED_CURRENT}])
}`

/** Raised when a current organogram exists but cannot be served (no PDF, wrong type, bad URL). */
export class OrganogramDataError extends Error {
  constructor(message) {
    super(message)
    this.name = 'OrganogramDataError'
    this.kind = 'data'
  }
}

const SANITY_FILE_URL = 'https://cdn.sanity.io/files/'

/**
 * Normalises the query result.
 *   - null  -> no published organogram is marked current
 *   - throws OrganogramDataError -> one is marked current, but it has no valid Sanity-hosted PDF
 *   - object -> the current organogram with its version metadata and PDF URL
 * Accepts the legacy bare-document shape too, so older callers and tests keep working.
 */
export function parseCurrentOrganogram(raw) {
  if (raw == null) return null

  const isEnvelope = typeof raw === 'object' && ('match' in raw || 'currentCount' in raw)
  const match = isEnvelope ? raw.match : raw
  const currentCount = isEnvelope ? Number(raw.currentCount) || 0 : match ? 1 : 0

  if (!match) {
    if (currentCount > 0) {
      throw new OrganogramDataError(
        `${currentCount} organogram${currentCount === 1 ? ' is' : 's are'} marked Current in Sanity, ` +
          'but none has a valid PDF file (the file is missing or is not application/pdf). ' +
          'Re-upload the PDF in the Content Center.',
      )
    }
    return null
  }

  if (typeof match.url !== 'string' || !match.url.startsWith(SANITY_FILE_URL)) {
    throw new OrganogramDataError(
      `The current organogram (${match._id || 'unknown id'}) has no Sanity-hosted PDF URL, so it was not shown.`,
    )
  }

  return {
    id: match._id,
    title: match.title || 'Corporate Structure & Governance Organogram',
    versionNumber: typeof match.versionNumber === 'number' ? match.versionNumber : null,
    versionLabel: match.versionLabel || null,
    effectiveDate: match.effectiveDate || null,
    url: match.url,
    fileName: match.fileName || null,
    duplicateCurrent: currentCount > 1,
  }
}
