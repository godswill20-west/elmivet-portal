import {CoverArt} from '../components/CoverArt'
import {Icon} from '../components/Icon'
import {ArticleStatusBadge, UnpublishedChangesBadge} from '../components/StatusBadge'
import {stagger} from '../lib/style'
import type {ArticleSummary} from '../lib/types'

interface FeaturedStoryProps {
  /** The lead story, or null when no published article is featured. */
  article: ArticleSummary | null
  loading: boolean
  /** Why nothing is shown when the list could not be loaded (replaces the empty message). */
  unavailable: boolean
  onOpen: (id: string) => void
}

export function FeaturedStory({article, loading, unavailable, onOpen}: FeaturedStoryProps) {
  if (loading) {
    return (
      <div
        className="ecc-card ecc-feature ecc-feature--skeleton ecc-rise"
        style={stagger(7)}
        aria-busy="true"
      >
        <div className="ecc-art ecc-skel" />
        <div className="ecc-feature-body">
          <span className="ecc-skel ecc-skel-line ecc-skel-line--short" />
          <span className="ecc-skel ecc-skel-line ecc-skel-line--title" />
          <span className="ecc-skel ecc-skel-line" />
          <span className="ecc-skel ecc-skel-line ecc-skel-line--short" />
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="ecc-card ecc-rise" style={stagger(7)}>
        <div className="ecc-empty">
          <span className="ecc-chip">
            <Icon name="doc" />
          </span>
          <strong>{unavailable ? 'Featured story unavailable' : 'No featured story'}</strong>
          <p>
            {unavailable
              ? 'It appears here once the articles load.'
              : 'No article is selected for the GlobalInsight featured position. Choose one under Featured placements below.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <article className="ecc-card ecc-feature ecc-rise" style={stagger(7)}>
      <CoverArt
        className="ecc-art"
        scene={article.scene}
        palette={article.palette}
        cover={article.cover}
        imageWidth={1000}
      >
        <span className="ecc-tag">{article.categoryLabel}</span>
      </CoverArt>
      <div className="ecc-feature-body">
        <span className="ecc-lead">Lead story</span>
        <h3>
          <button type="button" className="ecc-feature-link" onClick={() => onOpen(article.id)}>
            {article.title}
          </button>
        </h3>
        {article.excerpt ? <p>{article.excerpt}</p> : null}
        <div className="ecc-meta">
          <ArticleStatusBadge status={article.status} />
          {article.hasUnpublishedChanges ? <UnpublishedChangesBadge /> : null}
          <span>{article.dateLabel}</span>
          {article.readTimeMinutes ? <span>{article.readTimeMinutes} min read</span> : null}
        </div>
      </div>
    </article>
  )
}
