/**
 * One-time, idempotent migration for Batch 7.1: gives existing organogram documents a
 * versionNumber, a status and a publishedAt, so exactly one is "current" and the rest are
 * "archived". It only PATCHES fields. It never deletes documents or assets and never changes
 * the PDF (`file`) of any record.
 *
 * Run from the studio folder (uses your logged-in Sanity CLI user):
 *   npx sanity exec scripts/migrateOrganogramVersions.js --with-user-token            (dry run)
 *   npx sanity exec scripts/migrateOrganogramVersions.js --with-user-token -- --apply (writes)
 */
import {getCliClient} from 'sanity/cli'
import {
  ORGANOGRAM_STATUS,
  ORGANOGRAM_TYPE,
  pickCurrentOrganogram,
} from '../schemaTypes/organogramVersioning'

const apply = process.argv.includes('--apply')
const client = getCliClient({apiVersion: '2026-01-01'})

const time = (v) => {
  const t = Date.parse(v)
  return Number.isNaN(t) ? 0 : t
}

async function main() {
  const docs = await client.fetch(
    '*[_type == $type && !(_id in path("drafts.**"))]{_id, _rev, _createdAt, title, effectiveDate, publishedAt, versionNumber, status, file}',
    {type: ORGANOGRAM_TYPE},
  )
  console.log(`Found ${docs.length} published organogram record(s).`)
  if (!docs.length) return

  const alreadyCurrent = docs.filter((d) => d.status === ORGANOGRAM_STATUS.current)
  if (alreadyCurrent.length > 1) {
    console.error(
      `STOP: ${alreadyCurrent.length} records are already "current" (${alreadyCurrent
        .map((d) => d._id)
        .join(', ')}). Archive all but one in the Studio, then run again. Nothing was changed.`,
    )
    process.exitCode = 1
    return
  }

  // 1. Version numbers: oldest gets the lowest free number, existing numbers are kept.
  const used = new Set(docs.map((d) => d.versionNumber).filter((n) => Number.isInteger(n)))
  let next = Math.max(0, ...used) + 1
  const needNumber = docs
    .filter((d) => !Number.isInteger(d.versionNumber))
    .sort(
      (a, b) =>
        time(a.effectiveDate) - time(b.effectiveDate) || time(a._createdAt) - time(b._createdAt),
    )
  const assigned = new Map(needNumber.map((d) => [d._id, next++]))
  const numberOf = (d) => (Number.isInteger(d.versionNumber) ? d.versionNumber : assigned.get(d._id))

  // 2. Current: keep an existing one, else the same rule the website query uses.
  const withNumbers = docs.map((d) => ({...d, versionNumber: numberOf(d)}))
  const currentId =
    alreadyCurrent[0]?._id || pickCurrentOrganogram(withNumbers)?._id

  // 3. Patches, only where something is missing.
  const patches = []
  for (const d of docs) {
    const set = {}
    if (!Number.isInteger(d.versionNumber)) set.versionNumber = assigned.get(d._id)
    if (!d.status) set.status = d._id === currentId ? ORGANOGRAM_STATUS.current : ORGANOGRAM_STATUS.archived
    if (!d.publishedAt) set.publishedAt = d.effectiveDate || d._createdAt
    if (set.status === ORGANOGRAM_STATUS.archived && !d.archivedAt) set.archivedAt = new Date().toISOString()
    if (Object.keys(set).length) patches.push({d, set})
  }

  if (!currentId) console.warn('WARNING: no record has a PDF, so none can be made current.')
  for (const {d, set} of patches) console.log(`${apply ? 'PATCH' : 'would patch'} ${d._id}:`, JSON.stringify(set))
  if (!patches.length) console.log('Nothing to migrate. Already up to date.')
  if (!apply) {
    console.log('\nDry run only. Re-run with "-- --apply" to write these changes.')
    return
  }

  const tx = client.transaction()
  for (const {d, set} of patches) tx.patch(d._id, (p) => p.ifRevisionId(d._rev).set(set))
  await tx.commit()
  console.log(`Done. ${patches.length} record(s) updated. No documents or files were deleted.`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
