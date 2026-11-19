/**
 * Featured placements: which articles the public site features, per placement.
 *
 * Two INDEPENDENT selections live in one document (`featuredPlacements`, id below):
 *   - `homepage`:   an array of weak references, several articles (Homepage Featured Stories)
 *   - `insightPage`: one weak reference, or empty (GlobalInsight page featured article)
 * Every write touches exactly one of those two fields, and only the single entry asked for, so
 * a change to one placement can never alter the other or any unrelated selection. Publishing,
 * unpublishing and editing articles never write here. Pure helpers first, then the writes.
 */
import type {SanityClient} from 'sanity'

import {toPublishedId} from './articles'

export const PLACEMENTS_TYPE = 'featuredPlacements'
export const PLACEMENTS_ID = 'featuredPlacements'
/** The most articles the homepage section shows. Keep equal to FEATURED_MAX in src/lib/featuredInsights.js. */
export const HOMEPAGE_MAX = 10

export type PlacementKind = 'homepage' | 'insightPage'

export interface Placements {
  rev: string | null
  /** Published ids of the homepage selection, in the order they were added. */
  homepage: string[]
  /** Published id of the GlobalInsight featured article, or null when the position is empty. */
  insightPage: string | null
}

export const EMPTY_PLACEMENTS: Placements = {rev: null, homepage: [], insightPage: null}

/** A placements document exactly as Sanity returns it. */
export interface RawPlacements {
  _rev?: string
  homepage?: ({_ref?: string | null} | null)[] | null
  insightPage?: {_ref?: string | null} | null
}

export const PLACEMENTS_QUERY = `*[_id == "${PLACEMENTS_ID}"][0]{_rev, homepage, insightPage}`

export function parsePlacements(raw: RawPlacements | null | undefined): Placements {
  if (!raw) return EMPTY_PLACEMENTS
  const seen = new Set<string>()
  const homepage: string[] = []
  for (const item of Array.isArray(raw.homepage) ? raw.homepage : []) {
    const ref = typeof item?._ref === 'string' ? toPublishedId(item._ref) : ''
    if (ref && !seen.has(ref)) {
      seen.add(ref)
      homepage.push(ref)
    }
  }
  const insight = raw.insightPage?._ref
  return {
    rev: raw._rev ?? null,
    homepage,
    insightPage: typeof insight === 'string' && insight ? toPublishedId(insight) : null,
  }
}

const reference = (id: string) => ({_type: 'reference', _ref: id, _weak: true})

/** Turns a failed write into a sentence an editor can act on. */
export function describePlacementError(error: unknown): string {
  const statusCode = (error as {statusCode?: number} | null)?.statusCode
  if (statusCode === 401 || statusCode === 403) {
    return 'You do not have permission to change featured placements. Ask an administrator for access.'
  }
  if (statusCode === 409) {
    return 'The featured placements were changed by someone else, so nothing was saved. The list has been refreshed: try again.'
  }
  const message = error instanceof Error ? error.message : ''
  return message ? `Nothing was changed: ${message}` : 'Nothing was changed. Check your connection and try again.'
}

/** Creates the document if it does not exist yet. Never overwrites an existing one. */
async function ensureDocument(client: SanityClient): Promise<void> {
  await client.createIfNotExists({_id: PLACEMENTS_ID, _type: PLACEMENTS_TYPE, homepage: []})
}

async function readFresh(client: SanityClient): Promise<Placements> {
  const raw = await client.fetch<RawPlacements | null>(PLACEMENTS_QUERY)
  return parsePlacements(raw)
}

/**
 * Applies one change to ONE field, guarded by the revision just read, so a concurrent change
 * is rejected (409) instead of overwritten. Returns the message to show on success.
 */
async function change(
  client: SanityClient,
  decide: (current: Placements) => {error: string} | {ok: string; apply: (p: ReturnType<SanityClient['patch']>) => ReturnType<SanityClient['patch']>},
): Promise<{ok: true; message: string} | {ok: false; message: string}> {
  try {
    await ensureDocument(client)
    const current = await readFresh(client)
    const decision = decide(current)
    if ('error' in decision) return {ok: false, message: decision.error}
    let patch = client.patch(PLACEMENTS_ID)
    if (current.rev) patch = patch.ifRevisionId(current.rev)
    await decision.apply(patch).commit()
    return {ok: true, message: decision.ok}
  } catch (caught) {
    console.error('[Content Center] Changing featured placements failed.', caught)
    return {ok: false, message: describePlacementError(caught)}
  }
}

export const addToHomepage = (client: SanityClient, id: string, title: string) =>
  change(client, (current) =>
    current.homepage.includes(id)
      ? {error: `“${title}” is already in Homepage Featured Stories.`}
      : current.homepage.length >= HOMEPAGE_MAX
        ? {error: `Homepage Featured Stories holds at most ${HOMEPAGE_MAX} articles. Remove one first.`}
        : {
            ok: `“${title}” added to Homepage Featured Stories.`,
            apply: (patch) =>
              patch
                .setIfMissing({homepage: []})
                .insert('after', 'homepage[-1]', [{_key: crypto.randomUUID().slice(0, 12), ...reference(id)}]),
          },
  )

export const removeFromHomepage = (client: SanityClient, id: string, title: string) =>
  change(client, (current) =>
    !current.homepage.includes(id)
      ? {error: `“${title}” is not in Homepage Featured Stories.`}
      : {
          ok: `“${title}” removed from Homepage Featured Stories.`,
          // Removes only the entries pointing at this article; the rest of the array is untouched.
          apply: (patch) => patch.unset([`homepage[_ref=="${id}"]`]),
        },
  )

export const setInsightPage = (client: SanityClient, id: string, title: string) =>
  change(client, (current) =>
    current.insightPage === id
      ? {error: `“${title}” is already the GlobalInsight featured article.`}
      : {
          ok: `“${title}” is now the GlobalInsight featured article.`,
          apply: (patch) => patch.set({insightPage: reference(id)}),
        },
  )

export const clearInsightPage = (client: SanityClient, id: string, title: string) =>
  change(client, (current) =>
    current.insightPage !== id
      ? {error: `“${title}” is not the GlobalInsight featured article.`}
      : {
          ok: `“${title}” removed from the GlobalInsight page. The position is now empty.`,
          apply: (patch) => patch.unset(['insightPage']),
        },
  )

export type PlacementAction = 'homeAdd' | 'homeRemove' | 'insightSet' | 'insightClear'

export const inHomepage = (placements: Placements, id: string): boolean => placements.homepage.includes(id)
export const isInsightFeature = (placements: Placements, id: string): boolean => placements.insightPage === id

/** Short labels for where an article is selected (empty when it is not featured anywhere). */
export function placementLabels(id: string, placements: Placements): string[] {
  return [
    ...(inHomepage(placements, id) ? ['Homepage'] : []),
    ...(isInsightFeature(placements, id) ? ['GlobalInsight page'] : []),
  ]
}
