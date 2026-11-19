import {useCallback, useEffect, useMemo, useState} from 'react'
import {useClient} from 'sanity'

import {API_VERSION} from '../lib/constants'
import {EMPTY_PLACEMENTS, PLACEMENTS_ID, PLACEMENTS_QUERY, parsePlacements} from '../lib/placements'
import type {Placements, RawPlacements} from '../lib/placements'

export interface PlacementsState {
  placements: Placements
  /** False until the first successful read; writes are held back until then. */
  ready: boolean
  /** Re-reads the selections (called after every change and on live updates). */
  refresh: () => Promise<void>
}

/** Reads the featured selections with the Studio's own client and keeps them live. */
export function usePlacements(): PlacementsState {
  const studioClient = useClient({apiVersion: API_VERSION})
  const client = useMemo(
    () => studioClient.withConfig({perspective: 'raw', useCdn: false}),
    [studioClient],
  )
  const [placements, setPlacements] = useState(EMPTY_PLACEMENTS)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const raw = await client.fetch<RawPlacements | null>(PLACEMENTS_QUERY)
      setPlacements(parsePlacements(raw))
      setReady(true)
    } catch (caught) {
      console.error('[Content Center] Loading featured placements failed.', caught)
    }
  }, [client])

  useEffect(() => {
    void refresh()
    const subscription = client
      .listen(`*[_id == "${PLACEMENTS_ID}"]`, {}, {includeResult: false, visibility: 'query'})
      .subscribe({
        next: (event) => {
          if (event.type === 'mutation') void refresh()
        },
        error: (caught) => console.warn('[Content Center] Live placement updates unavailable.', caught),
      })
    return () => subscription.unsubscribe()
  }, [client, refresh])

  return {placements, ready, refresh}
}
