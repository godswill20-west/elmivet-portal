import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useClient} from 'sanity'

import {API_VERSION} from '../lib/constants'
import {loadVersions} from '../lib/organogramVersions'
import type {VersionsView} from '../lib/organogramVersions'

export const EMPTY_VERSIONS: VersionsView = {
  versions: [],
  current: null,
  latest: null,
  currentCount: 0,
  legacyCount: 0,
}

export interface OrganogramVersionsState {
  view: VersionsView
  status: 'loading' | 'ready' | 'error'
  error: string | null
  refresh: () => Promise<void>
}

/** Reads every organogram version (drafts included) and re-reads on live changes. */
export function useOrganogramVersions(): OrganogramVersionsState {
  const studioClient = useClient({apiVersion: API_VERSION})
  const client = useMemo(
    () => studioClient.withConfig({perspective: 'raw', useCdn: false}),
    [studioClient],
  )
  const [view, setView] = useState<VersionsView>(EMPTY_VERSIONS)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const latestRequest = useRef(0)

  const refresh = useCallback(async () => {
    const request = ++latestRequest.current
    try {
      const next = await loadVersions(client)
      if (request !== latestRequest.current) return // a newer read is in flight
      setView(next)
      setStatus('ready')
      setError(null)
    } catch (caught) {
      console.error('[Content Center] Loading organogram versions failed.', caught)
      if (request !== latestRequest.current) return
      setError(caught instanceof Error ? caught.message : 'Could not load the organogram versions.')
      setStatus((previous) => (previous === 'ready' ? 'ready' : 'error'))
    }
  }, [client])

  useEffect(() => {
    void refresh()
    const subscription = client
      .listen('*[_type == "organogram"]', {}, {includeResult: false, visibility: 'query'})
      .subscribe({
        next: (event) => {
          if (event.type === 'mutation') void refresh()
        },
        error: (caught) => console.warn('[Content Center] Live organogram updates unavailable.', caught),
      })
    return () => subscription.unsubscribe()
  }, [client, refresh])

  return {view, status, error, refresh}
}
