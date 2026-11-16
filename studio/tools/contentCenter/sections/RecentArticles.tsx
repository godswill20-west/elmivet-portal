import {useEffect, useId, useState} from 'react'
import type {KeyboardEvent} from 'react'

import {Button} from '../components/Button'
import {CoverArt} from '../components/CoverArt'
import {Icon} from '../components/Icon'
import {ArticleStatusBadge} from '../components/StatusBadge'
import type {ArticlesStatus} from '../hooks/useArticles'
import {
  DEFAULT_FILTERS,
  FEATURED_TEXT,
  featuredState,
  filterArticles,
  hasActiveFilters,
} from '../lib/articles'
import type {ArticleFilters, StatusFilter} from '../lib/articles'
import {ARTICLE_CATEGORIES} from '../lib/constants'
import {stagger} from '../lib/style'
import type {ArticleSummary} from '../lib/types'
import {availableActions, canPerform, deniedMessage, publishLabel} from '../operations/permissions'
import type {ArticleAction, ArticlePermissionState} from '../operations/permissions'
import {RowMenu} from './RowMenu'
import type {RowMenuItem} from './RowMenu'

const TABS: {id: StatusFilter; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'published', label: 'Published'},
  {id: 'draft', label: 'Drafts'},
]

/** Rows shown before "Show more", and how many each click adds. */
const PAGE_SIZE = 8

const EMPTY_STATUS_COPY: Record<StatusFilter, {title: string; text: string}> = {
  all: {
    title: 'No articles yet',
    text: 'Articles created in Sanity appear here, with their drafts and published versions.',
  },
  published: {
    title: 'Nothing published yet',
    text: 'Published articles appear here and on the GlobalInsight page.',
  },
  draft: {title: 'No drafts', text: 'Articles that have not been published appear here.'},
}

interface RecentArticlesProps {
  articles: ArticleSummary[]
  status: ArticlesStatus
  /** Why the first load failed (shown with a retry). */
  error: string | null
  refreshing: boolean
  /** Id of the article an operation is running on (all actions pause meanwhile). */
  busyId: string | null
  permissions: ArticlePermissionState
  onRetry: () => void
  onRefresh: () => void
  onOpen: (id: string) => void
  /** Called when a row's actions menu opens or closes, so permissions are checked for it. */
  onMenuChange: (id: string | null) => void
  onEdit: (id: string) => void
  onAction: (action: ArticleAction, article: ArticleSummary) => void
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading articles">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="ecc-row ecc-row--skeleton" style={stagger(index)}>
          <div className="ecc-thumb ecc-skel" />
          <div>
            <span className="ecc-skel ecc-skel-line ecc-skel-line--title" />
            <span className="ecc-skel ecc-skel-line ecc-skel-line--short" />
          </div>
          <span className="ecc-skel ecc-skel-pill" />
          <span className="ecc-skel ecc-skel-line ecc-skel-line--date" />
          <span />
        </div>
      ))}
    </div>
  )
}

export function RecentArticles({
  articles,
  status,
  error,
  refreshing,
  busyId,
  permissions,
  onRetry,
  onRefresh,
  onOpen,
  onMenuChange,
  onEdit,
  onAction,
}: RecentArticlesProps) {
  const [filters, setFilters] = useState<ArticleFilters>(DEFAULT_FILTERS)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const panelId = useId()
  const searchId = useId()
  const categoryId = useId()

  // Changing the search or a filter starts again from the first page of results.
  useEffect(() => setLimit(PAGE_SIZE), [filters])

  const matching = filterArticles(articles, filters)
  const visible = matching.slice(0, limit)
  const filtered = hasActiveFilters(filters)
  const clear = () => setFilters(DEFAULT_FILTERS)

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = TABS[(index + step + TABS.length) % TABS.length]
    if (!next) return
    setFilters((current) => ({...current, status: next.id}))
    document.getElementById(`${panelId}-tab-${next.id}`)?.focus()
  }

  const menuItems = (article: ArticleSummary): RowMenuItem[] => {
    const available = availableActions(article)
    const busy = busyId !== null
    const item = (action: ArticleAction, label: string, danger = false): RowMenuItem => {
      const allowed = canPerform(permissions, article, action)
      return {
        label,
        danger,
        disabled: busy || !allowed,
        title: !allowed ? deniedMessage(action) : undefined,
        onSelect: () => onAction(action, article),
      }
    }
    return [
      {label: 'View details', onSelect: () => onOpen(article.id)},
      {label: 'Edit article', onSelect: () => onEdit(article.id)},
      ...(available.publish ? [item('publish', publishLabel(article))] : []),
      ...(available.unpublish ? [item('unpublish', 'Unpublish')] : []),
      item('delete', 'Delete', true),
    ]
  }

  const renderBody = () => {
    if (status === 'loading') return <Skeleton />

    if (status === 'error') {
      return (
        <div className="ecc-empty ecc-empty--error" role="alert">
          <span className="ecc-chip">
            <Icon name="doc" />
          </span>
          <strong>Articles could not be loaded</strong>
          <p>{error ?? 'Something went wrong while contacting Sanity.'}</p>
          <Button variant="navy" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )
    }

    if (visible.length === 0) {
      const onlyStatus = filters.status !== 'all' && !filters.query.trim() && filters.category === 'all'
      const copy =
        articles.length === 0
          ? EMPTY_STATUS_COPY.all
          : onlyStatus
            ? EMPTY_STATUS_COPY[filters.status]
            : {
                title: 'No matching articles',
                text: 'Nothing matches the current search and filters. Try a different title or clear the filters.',
              }
      return (
        <div className="ecc-empty">
          <span className="ecc-chip">
            <Icon name="doc" />
          </span>
          <strong>{copy.title}</strong>
          <p>{copy.text}</p>
          {filtered && articles.length > 0 ? (
            <Button variant="quiet" onClick={clear}>
              Clear filters
            </Button>
          ) : null}
        </div>
      )
    }

    return (
      <>
        {visible.map((article, index) => (
          <div key={article.id} className="ecc-row ecc-rise" style={stagger(Math.min(index, 8))}>
            <CoverArt
              className="ecc-thumb"
              scene={article.scene}
              palette={article.palette}
              cover={article.cover}
              imageWidth={200}
            />
            <button type="button" className="ecc-row-main" onClick={() => onOpen(article.id)}>
              <span className="ecc-row-title">{article.title}</span>
              <span className="ecc-row-cat">
                {article.categoryLabel}
                {featuredState(article) !== 'none' ? ` · ${FEATURED_TEXT[featuredState(article)]}` : ''}
                {article.hasUnpublishedChanges ? ' · Unpublished changes' : ''}
              </span>
            </button>
            <ArticleStatusBadge status={article.status} />
            <span className="ecc-row-date">{article.dateLabel}</span>
            <RowMenu
              label={`Actions for ${article.title}`}
              items={menuItems(article)}
              onOpenChange={(open) => onMenuChange(open ? article.id : null)}
            />
          </div>
        ))}
        {matching.length > visible.length ? (
          <div className="ecc-more">
            <Button variant="quiet" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
              Show more ({matching.length - visible.length} more)
            </Button>
          </div>
        ) : null}
      </>
    )
  }

  const controlsDisabled = status !== 'ready' || articles.length === 0

  return (
    <div className="ecc-card ecc-list ecc-rise" style={stagger(8)}>
      <div className="ecc-list-head">
        <div className="ecc-sec-head" style={{margin: 0}}>
          <h2>Recent articles</h2>
          {refreshing ? (
            <span className="ecc-refreshing" role="status">
              Refreshing…
            </span>
          ) : null}
        </div>
        <div className="ecc-list-tools">
          <div className="ecc-tabs" role="tablist" aria-label="Filter articles by status">
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                id={`${panelId}-tab-${tab.id}`}
                type="button"
                role="tab"
                className="ecc-tab"
                aria-selected={filters.status === tab.id}
                aria-controls={panelId}
                tabIndex={filters.status === tab.id ? 0 : -1}
                onClick={() => setFilters((current) => ({...current, status: tab.id}))}
                onKeyDown={(event) => onTabKeyDown(event, index)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button variant="quiet" onClick={onRefresh} disabled={refreshing || status === 'loading'}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="ecc-toolbar" role="search">
        <label className="ecc-sr" htmlFor={searchId}>
          Search articles by title
        </label>
        <input
          id={searchId}
          type="search"
          className="ecc-input ecc-search"
          placeholder="Search by title"
          value={filters.query}
          disabled={controlsDisabled}
          onChange={(event) => setFilters((current) => ({...current, query: event.target.value}))}
        />
        <label className="ecc-sr" htmlFor={categoryId}>
          Filter by category
        </label>
        <select
          id={categoryId}
          className="ecc-input ecc-select"
          value={filters.category}
          disabled={controlsDisabled}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              category: event.target.value as ArticleFilters['category'],
            }))
          }
        >
          <option value="all">All categories</option>
          {ARTICLE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {filtered ? (
          <Button variant="quiet" onClick={clear}>
            Clear filters
          </Button>
        ) : null}
      </div>
      <p className="ecc-sr" role="status">
        {status === 'ready' ? `${matching.length} of ${articles.length} articles shown` : ''}
      </p>

      <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-tab-${filters.status}`}>
        {renderBody()}
      </div>
    </div>
  )
}
