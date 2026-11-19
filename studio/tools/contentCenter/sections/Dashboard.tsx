import {useCallback, useMemo, useState} from 'react'
import {useClient, useCurrentUser} from 'sanity'

import {useArticles} from '../hooks/useArticles'
import {useOrganogramVersions} from '../hooks/useOrganogramVersions'
import {useOverlayState} from '../hooks/useOverlayState'
import {usePlacements} from '../hooks/usePlacements'
import {buildStats} from '../lib/articles'
import {API_VERSION} from '../lib/constants'
import {addToHomepage, clearInsightPage, removeFromHomepage, setInsightPage} from '../lib/placements'
import type {PlacementAction} from '../lib/placements'
import {formatDate} from '../lib/format'
import {makeOrganogramCurrent, unpublishCurrentOrganogram} from '../lib/organogramVersions'
import type {OrganogramVersion} from '../lib/organogramVersions'
import {stagger} from '../lib/style'
import type {ArticleSummary} from '../lib/types'
import {ArticleOperationRunner} from '../operations/ArticleOperationRunner'
import type {OperationRequest, OperationResult} from '../operations/ArticleOperationRunner'
import {ArticlePermissionProbe} from '../operations/ArticlePermissionProbe'
import {UNKNOWN_PERMISSIONS} from '../operations/permissions'
import type {ArticleAction, ArticlePermissionState} from '../operations/permissions'
import {useToast} from '../overlay/OverlayProvider'
import {ArticleDrawer} from '../panels/ArticleDrawer'
import {ArticleFormModal} from '../panels/ArticleFormModal'
import {ConfirmArticleModal} from '../panels/ConfirmArticleModal'
import {ConfirmOrganogramModal} from '../panels/ConfirmOrganogramModal'
import type {OrganogramConfirmKind} from '../panels/ConfirmOrganogramModal'
import type {ConfirmKind} from '../panels/ConfirmArticleModal'
import {UploadOrganogramModal} from '../panels/UploadOrganogramModal'
import {FeaturedPlacements} from './FeaturedPlacements'
import {FeaturedStory} from './FeaturedStory'
import {Hero} from './Hero'
import {MetricsRow} from './MetricsRow'
import {OrganogramPanel} from './OrganogramPanel'
import {RecentArticles} from './RecentArticles'

const SUCCESS_MESSAGE: Record<ArticleAction, (title: string) => string> = {
  publish: (title) => `Published “${title}”.`,
  unpublish: (title) => `Unpublished “${title}”. It is now a draft.`,
  delete: (title) => `Deleted “${title}”.`,
}

/** The single-page dashboard: sections plus the overlays they open. */
export function Dashboard() {
  const toast = useToast()
  const overlays = useOverlayState()
  const {state} = overlays
  const {articles, status, refreshing, error, refresh} = useArticles()
  const {placements, ready: placementsReady, refresh: refreshPlacements} = usePlacements()
  const studioClient = useClient({apiVersion: API_VERSION})
  const placementClient = useMemo(() => studioClient.withConfig({useCdn: false}), [studioClient])
  const [placementBusy, setPlacementBusy] = useState(false)

  const organograms = useOrganogramVersions()
  const organogramClient = useMemo(
    () => studioClient.withConfig({perspective: 'raw', useCdn: false}),
    [studioClient],
  )
  const currentUser = useCurrentUser()
  const canManageOrganogram = Boolean(
    currentUser?.roles?.some((role) => role.name === 'administrator'),
  )
  const [organogramBusy, setOrganogramBusy] = useState(false)
  // Kept after closing so the dialog text survives its exit animation.
  const [organogramConfirm, setOrganogramConfirm] = useState<{
    kind: OrganogramConfirmKind
    version: OrganogramVersion
  } | null>(null)
  const [organogramConfirmOpen, setOrganogramConfirmOpen] = useState(false)

  const askOrganogram = (kind: OrganogramConfirmKind, version: OrganogramVersion) => {
    if (organogramBusy || !canManageOrganogram) return
    setOrganogramConfirm({kind, version})
    setOrganogramConfirmOpen(true)
  }

  const confirmOrganogram = async () => {
    if (!organogramConfirm || organogramBusy || !canManageOrganogram) return
    setOrganogramBusy(true)
    const {kind, version} = organogramConfirm
    const result =
      kind === 'makeCurrent'
        ? await makeOrganogramCurrent(organogramClient, version.id)
        : await unpublishCurrentOrganogram(organogramClient, version.id)
    toast.show(result.message, {tone: result.ok ? 'success' : 'error'})
    // Re-read either way so the screen always shows what Sanity actually holds.
    await organograms.refresh()
    setOrganogramBusy(false)
    setOrganogramConfirmOpen(false)
  }

  const currentOrganogram = organograms.view.current
  const organogramMetric = {
    loading: organograms.status === 'loading',
    current: currentOrganogram
      ? {
          versionLabel: currentOrganogram.versionNumber
            ? `Version ${currentOrganogram.versionNumber}`
            : currentOrganogram.title,
          effectiveLabel: formatDate(currentOrganogram.effectiveDate),
        }
      : null,
  }

  const [menuArticleId, setMenuArticleId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<ArticlePermissionState>(UNKNOWN_PERMISSIONS)
  const [running, setRunning] = useState<OperationRequest | null>(null)
  // The confirmation dialog keeps its article/kind after closing so the exit animation has content.
  const [confirm, setConfirm] = useState<{kind: ConfirmKind; article: ArticleSummary} | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const drawerArticle = articles.find((article) => article.id === state.drawerArticleId) ?? null
  const permissionTarget =
    (state.drawerOpen ? drawerArticle : articles.find((a) => a.id === menuArticleId)) ?? null

  const stats = useMemo(() => (status === 'ready' ? buildStats(articles) : null), [articles, status])
  // The GlobalInsight featured article: only shown when it is selected AND published.
  const lead = articles.find((a) => a.id === placements.insightPage && a.hasPublished) ?? null
  const placementsLocked = status !== 'ready' || !placementsReady || placementBusy

  const notReady = (message: string) => toast.show(message)

  /** One featured-placement change. Each action writes only its own placement. */
  const changePlacement = async (action: PlacementAction, id: string, title: string) => {
    if (placementsLocked) return
    const adding = action === 'homeAdd' || action === 'insightSet'
    if (adding && !articles.find((a) => a.id === id)?.hasPublished) {
      toast.show(`“${title}” is not published, so it cannot be featured. Publish it first.`, {tone: 'error'})
      return
    }
    setPlacementBusy(true)
    const run = {
      homeAdd: addToHomepage,
      homeRemove: removeFromHomepage,
      insightSet: setInsightPage,
      insightClear: clearInsightPage,
    }[action]
    const result = await run(placementClient, id, title)
    toast.show(result.message, {tone: result.ok ? 'success' : 'error'})
    await refreshPlacements()
    setPlacementBusy(false)
  }

  const edit = (id: string) => {
    overlays.openArticle(id)
    overlays.openModal('edit')
  }

  const start = (action: ArticleAction, article: ArticleSummary) => {
    if (running) return
    if (action === 'publish') setRunning({action, article})
    else {
      setConfirm({kind: action, article})
      setConfirmOpen(true)
    }
  }

  /** Publishes an article whose draft the form has just saved. */
  const publishSaved = (article: OperationRequest['article']) => {
    if (running) {
      toast.show('Your draft was saved. Another operation is running: publish it again in a moment.', {
        tone: 'error',
      })
      return
    }
    setRunning({action: 'publish', article, afterSave: true})
  }

  const confirmAction = () => {
    if (!confirm || running) return
    setRunning({action: confirm.kind, article: confirm.article})
  }

  const onDone = useCallback(
    (request: OperationRequest, result: OperationResult) => {
      setRunning(null)
      if (result.ok) {
        toast.show(SUCCESS_MESSAGE[request.action](request.article.title), {tone: 'success'})
        if (request.action === 'delete') overlays.closeArticle()
        setConfirmOpen(false)
        void refresh()
      } else {
        toast.show(
          request.afterSave
            ? `Your draft was saved, but it was not published. ${result.message}`
            : result.message,
          {tone: 'error'},
        )
        // Keep the confirmation open after a failure so the user can retry or cancel, but re-read
        // the data so nothing on screen contradicts what Sanity actually holds.
        void refresh()
      }
    },
    [toast, overlays, refresh],
  )

  const manualRefresh = async () => {
    const message = await refresh()
    if (message) toast.show(message, {tone: 'error'})
  }

  return (
    <>
      <Hero
        onCreateArticle={() => overlays.openModal('create')}
        onUploadOrganogram={() => overlays.openModal('upload')}
      />

      <main className="ecc-wrap">
        <MetricsRow stats={stats} organogram={organogramMetric} />

        <div className="ecc-grid">
          <div>
            <div className="ecc-sec-head ecc-rise" style={stagger(6)}>
              <h2>Featured story</h2>
              <span className="ecc-kicker" style={{margin: 0}}>
                Featured on the GlobalInsight page
              </span>
            </div>
            <FeaturedStory
              article={lead}
              loading={status === 'loading'}
              unavailable={status === 'error'}
              onOpen={overlays.openArticle}
            />
            <FeaturedPlacements
              articles={articles}
              placements={placements}
              disabled={placementsLocked}
              onAction={(action, id, title) => void changePlacement(action, id, title)}
              onOpen={overlays.openArticle}
            />
            <RecentArticles
              articles={articles}
              placements={placements}
              placementsLocked={placementsLocked}
              onPlacement={(action, article) => void changePlacement(action, article.id, article.title)}
              status={status}
              error={error}
              refreshing={refreshing}
              busyId={running?.article.id ?? null}
              permissions={permissions}
              onRetry={() => void manualRefresh()}
              onRefresh={() => void manualRefresh()}
              onOpen={overlays.openArticle}
              onMenuChange={setMenuArticleId}
              onEdit={edit}
              onAction={start}
            />
          </div>

          <OrganogramPanel
            view={organograms.view}
            status={organograms.status}
            error={organograms.error}
            canManage={canManageOrganogram}
            busy={organogramBusy}
            onUpload={() => overlays.openModal('upload')}
            onMakeCurrent={(version) => askOrganogram('makeCurrent', version)}
            onUnpublish={(version) => askOrganogram('unpublish', version)}
            onRetry={() => void organograms.refresh()}
          />
        </div>
      </main>

      <ArticleDrawer
        article={drawerArticle}
        placements={placements}
        placementsLocked={placementsLocked}
        onPlacement={(action, article) => void changePlacement(action, article.id, article.title)}
        open={state.drawerOpen}
        permissions={permissions}
        busy={running !== null}
        onClose={overlays.closeArticle}
        onEdit={() => overlays.openModal('edit')}
        onAction={start}
      />
      <ConfirmArticleModal
        open={confirmOpen}
        kind={confirm?.kind ?? null}
        article={confirm?.article ?? null}
        busy={running !== null}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmAction}
      />
      <ArticleFormModal
        key={`${state.modalKind}-${state.drawerArticleId}`}
        open={state.modalOpen && (state.modalKind === 'create' || state.modalKind === 'edit')}
        mode={state.modalKind === 'edit' ? 'edit' : 'create'}
        article={drawerArticle}
        onClose={overlays.closeModal}
        onUnavailable={notReady}
        onSaved={() => void refresh()}
        onPublish={publishSaved}
      />
      <UploadOrganogramModal
        open={state.modalOpen && state.modalKind === 'upload'}
        onClose={overlays.closeModal}
        onSaved={() => void organograms.refresh()}
      />
      <ConfirmOrganogramModal
        open={organogramConfirmOpen}
        kind={organogramConfirm?.kind ?? null}
        version={organogramConfirm?.version ?? null}
        current={currentOrganogram}
        busy={organogramBusy}
        onCancel={() => setOrganogramConfirmOpen(false)}
        onConfirm={() => void confirmOrganogram()}
      />

      {permissionTarget ? (
        <ArticlePermissionProbe
          key={permissionTarget.id}
          article={permissionTarget}
          onChange={setPermissions}
        />
      ) : null}
      {running ? (
        <ArticleOperationRunner
          key={`${running.action}-${running.article.id}`}
          request={running}
          onDone={(result) => onDone(running, result)}
        />
      ) : null}
    </>
  )
}