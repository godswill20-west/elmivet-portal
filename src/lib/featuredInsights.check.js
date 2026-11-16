// Zero-dependency logic checks. Run with:  node --test src/lib/featuredInsights.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FEATURED_MAX,
  buildInsightHref,
  getLayoutVariant,
  isValidSlug,
  normalizeInsights,
} from './featuredInsights.js'
import {MESSY_INSIGHTS, makeInsights} from './featuredInsights.fixtures.js'

test('layout variant for 0, 1, 2, 3, 4, 5, 10 articles', () => {
  const expected = {0: 'none', 1: 'single', 2: 'pair', 3: 'trio', 4: 'carousel', 5: 'carousel', 10: 'carousel'}
  for (const [count, variant] of Object.entries(expected)) {
    assert.equal(getLayoutVariant(normalizeInsights(makeInsights(Number(count))).length), variant, `count ${count}`)
  }
})

test('non-array / empty input yields no articles', () => {
  for (const bad of [null, undefined, {}, 'x', 42]) assert.deepEqual(normalizeInsights(bad), [])
  assert.equal(getLayoutVariant(NaN), 'none')
})

test('never returns more than the cap, even if given 15', () => {
  assert.equal(normalizeInsights(makeInsights(15)).length, FEATURED_MAX)
})

test('preserves the order it was given (query sorts by publishedAt desc)', () => {
  const ids = normalizeInsights(makeInsights(5)).map((p) => p.id)
  assert.deepEqual(ids, ['insight-1', 'insight-2', 'insight-3', 'insight-4', 'insight-5'])
})

test('messy data: unusable items dropped, optional fields defaulted, nothing throws', () => {
  const posts = normalizeInsights(MESSY_INSIGHTS)
  assert.deepEqual(posts.map((p) => p.id), ['m1', 'm2', 'm3'])
  const [a, b, c] = posts
  assert.equal(a.coverImage, '')
  assert.equal(a.excerpt, '')
  assert.equal(a.slug, null)
  assert.equal(a.label, '')
  assert.equal(b.slug, null) // invalid slug rejected
  assert.equal(b.label, 'Regulatory Notice') // falls back to category
  assert.equal(c.coverImage, '') // non-http url rejected
  assert.equal(c.slug, 'ok-slug')
  assert.equal(c.label, '') // whitespace-only tag ignored
})

test('card label prefers tag over category', () => {
  const [first, second] = normalizeInsights(makeInsights(2))
  assert.equal(first.label, 'Custom Label')
  assert.equal(second.label, 'Regulatory Notice')
})

test('slug validation and href fallback', () => {
  assert.ok(isValidSlug('west-africa-port-2026'))
  for (const bad of ['', '  ', null, undefined, 'a/b', 'a b', '../x', '?q=1']) assert.ok(!isValidSlug(bad), String(bad))
  const listPath = '/global-insight'
  assert.equal(buildInsightHref('good-slug', {listPath}), listPath) // detail route not enabled yet
  assert.equal(buildInsightHref('good-slug', {listPath, detailBase: '/global-insight'}), '/global-insight/good-slug')
  assert.equal(buildInsightHref(null, {listPath, detailBase: '/global-insight'}), listPath)
  assert.equal(buildInsightHref('a/b', {listPath, detailBase: '/global-insight'}), listPath)
})
