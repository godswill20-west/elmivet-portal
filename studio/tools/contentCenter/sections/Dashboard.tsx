import {useCallback, useMemo, useState} from 'react'

import {useArticles} from '../hooks/useArticles'
import {useOverlayState} from '../hooks/useOverlayState'
import {buildStats, featuredStories} from '../lib/articles'
import {SAMPLE_ORGANOGRAM} from '../lib/sampleContent'
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
import type {ConfirmKind} from '../panels/ConfirmArticleModal'
import {UploadOrganogramModal} from '../panels/UploadOrganogramModal'
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
  const featured = useMemo(() => featuredStories(articles), [articles])
  const lead = featured[0] ?? null

  const notReady = (message: string) => toast.show(message)

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
        toast.show(result.message, {tone: 'error'})
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
        <MetricsRow stats={stats} organogram={SAMPLE_ORGANOGRAM} />

        <div className="ecc-grid">
          <div>
            <div className="ecc-sec-head ecc-rise" style={stagger(6)}>
              <h2>Featured story</h2>
              <span className="ecc-kicker" style={{margin: 0}}>
                Lead on GlobalInsight
                {featured.length > 1 ? ` · ${featured.length} featured` : ''}
              </span>
            </div>
            <FeaturedStory
              article={lead}
              loading={status === 'loading'}
              unavailable={status === 'error'}
              onOpen={overlays.openArticle}
            />
            <RecentArticles
              articles={articles}
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
            organogram={SAMPLE_ORGANOGRAM}
            onReplace={() => overlays.openModal('upload')}
          />
        </div>
      </main>

      <ArticleDrawer
        article={drawerArticle}
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
      />
      <UploadOrganogramModal
        open={state.modalOpen && state.modalKind === 'upload'}
        nextVersion={SAMPLE_ORGANOGRAM.version + 1}
        onClose={overlays.closeModal}
        onUnavailable={notReady}
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
