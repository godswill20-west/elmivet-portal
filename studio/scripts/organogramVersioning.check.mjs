// Offline check of the "exactly one current" rules. No network, no dependencies.
//   node scripts/organogramVersioning.check.mjs
import assert from 'node:assert/strict'
import {copyFileSync, mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'

// The module is plain ESM in a .js file; copy to .mjs so Node loads it without a package type.
const dir = mkdtempSync(join(tmpdir(), 'org-'))
copyFileSync(new URL('../schemaTypes/organogramVersioning.js', import.meta.url), join(dir, 'v.mjs'))
const m = await import(pathToFileURL(join(dir, 'v.mjs')).href)

const f = {asset: {_ref: 'file-abc-pdf'}}
const d = (o) => ({file: f, _createdAt: '2026-01-01T00:00:00Z', ...o})

// current wins over a newer-looking legacy record
assert.equal(
  m.pickCurrentOrganogram([
    d({_id: 'a', status: 'current', versionNumber: 1, effectiveDate: '2025-01-01'}),
    d({_id: 'b', versionNumber: 9, effectiveDate: '2026-06-01'}),
  ])._id,
  'a',
)
// archived is never chosen, even if newest
assert.equal(
  m.pickCurrentOrganogram([
    d({_id: 'a', status: 'archived', versionNumber: 5}),
    d({_id: 'b', status: 'current', versionNumber: 4}),
  ])._id,
  'b',
)
// legacy fallback = newest effectiveDate (old behaviour)
assert.equal(
  m.pickCurrentOrganogram([
    d({_id: 'old', effectiveDate: '2024-01-01'}),
    d({_id: 'new', effectiveDate: '2025-01-01'}),
  ])._id,
  'new',
)
// drafts and file-less records ignored
assert.equal(m.pickCurrentOrganogram([d({_id: 'drafts.x', status: 'current'}), {_id: 'y', status: 'current'}]), null)
// deterministic tie-break
assert.equal(
  m.pickCurrentOrganogram([
    d({_id: 'p', status: 'current', versionNumber: 2}),
    d({_id: 'q', status: 'current', versionNumber: 3}),
  ])._id,
  'q',
)
assert.equal(m.nextVersionNumber([{versionNumber: 2}, {}, {versionNumber: 7}]), 8)
assert.equal(m.nextVersionNumber([]), 1)
assert.equal(m.publishedId('drafts.abc'), 'abc')

// publish mutations: archive old current, create new current, no deletes
const muts = m.buildPublishMutations({
  newDocument: {title: 'T', versionNumber: 3},
  previousCurrentIds: ['a'],
  now: '2026-11-18T00:00:00Z',
})
assert.equal(muts.length, 2)
assert.deepEqual(muts[0].patch.set, {status: 'archived', archivedAt: '2026-11-18T00:00:00Z'})
assert.equal(muts[1].create.status, 'current')
assert.ok(!muts.some((x) => 'delete' in x))
console.log('organogramVersioning: all checks passed')
