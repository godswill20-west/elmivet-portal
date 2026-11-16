import {Button} from '../components/Button'
import {CoverArt} from '../components/CoverArt'
import {ArticleStatusBadge, UnpublishedChangesBadge} from '../components/StatusBadge'
import {FEATURED_TEXT, featuredState} from '../lib/articles'
import {Drawer} from '../overlay/Drawer'
import type {ArticleSummary} from '../lib/types'
import {availableActions, canPerform, deniedMessage, publishLabel} from '../operations/permissions'
import type {ArticleAction, ArticlePermissionState} from '../operations/permissions'

interface ArticleDrawerProps {
  /** The article to show. Kept after closing so content stays visible during the exit animation. */
  article: ArticleSummary | null
  open: boolean
  permissions: ArticlePermissionState
  /** True while any publish, unpublish or delete is running. */
  busy: boolean
  onClose: () => void
  onEdit: () => void
  onAction: (action: ArticleAction, article: ArticleSummary) => void
}

export function ArticleDrawer({
  article,
  open,
  permissions,
  busy,
  onClose,
  onEdit,
  onAction,
}: ArticleDrawerProps) {
  if (!article) return null
  const available = availableActions(article)

  const actionButton = (action: ArticleAction, label: string, variant: 'red' | 'quiet') => {
    const allowed = canPerform(permissions, article, action)
    return (
      <Button
        variant={variant}
        disabled={busy || !allowed}
        title={!allowed ? deniedMessage(action) : undefined}
        onClick={() => onAction(action, article)}
      >
        {label}
      </Button>
    )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      label={`Article details: ${article.title}`}
      status={
        <span className="ecc-drawer-status">
          <ArticleStatusBadge status={article.status} />
          {article.hasUnpublishedChanges ? <UnpublishedChangesBadge /> : null}
        </span>
      }
      footer={
        <>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            {actionButton('delete', 'Delete', 'red')}
            {available.publish ? actionButton('publish', publishLabel(article), 'quiet') : null}
            {available.unpublish ? actionButton('unpublish', 'Unpublish', 'quiet') : null}
          </div>
          <Button variant="navy" icon="pen" onClick={onEdit}>
            Edit Article
          </Button>
        </>
      }
    >
      <CoverArt
        className="ecc-drawer-art"
        scene={article.scene}
        palette={article.palette}
        cover={article.cover}
        imageWidth={900}
      >
        <span className="ecc-tag">{article.tag ?? article.categoryLabel}</span>
      </CoverArt>
      <h2>{article.title}</h2>
      {article.excerpt ? <p>{article.excerpt}</p> : <p className="ecc-note">No summary yet.</p>}
      <div className="ecc-facts">
        <div className="ecc-fact">
          <span>Category</span>
          <b>{article.categoryLabel}</b>
        </div>
        <div className="ecc-fact">
          <span>Published</span>
          <b>{article.publishedLabel}</b>
        </div>
        <div className="ecc-fact">
          <span>Featured</span>
          <b>{FEATURED_TEXT[featuredState(article)]}</b>
        </div>
        <div className="ecc-fact">
          <span>Read time</span>
          <b>{article.readTimeMinutes ? `${article.readTimeMinutes} minutes` : 'Not set'}</b>
        </div>
        <div className="ecc-fact">
          <span>Byline</span>
          <b>{article.byline}</b>
        </div>
        <div className="ecc-fact">
          <span>Last edited</span>
          <b>{article.editedLabel}</b>
        </div>
        <div className="ecc-fact" style={{gridColumn: '1 / -1'}}>
          <span>Slug</span>
          <b>{article.slug ?? 'Not set'}</b>
        </div>
      </div>
    </Drawer>
  )
}
