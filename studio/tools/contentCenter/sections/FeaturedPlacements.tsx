import {useState} from 'react'

import {Button} from '../components/Button'
import {HOMEPAGE_MAX} from '../lib/placements'
import type {PlacementAction, Placements} from '../lib/placements'
import {stagger} from '../lib/style'
import type {ArticleSummary} from '../lib/types'

interface FeaturedPlacementsProps {
  articles: ArticleSummary[]
  placements: Placements
  /** False while articles or selections are still loading, or an operation is running. */
  disabled: boolean
  onAction: (action: PlacementAction, id: string, title: string) => void
  onOpen: (id: string) => void
}

/** The two independent featured placements, each with its own selection controls. */
export function FeaturedPlacements({articles, placements, disabled, onAction, onOpen}: FeaturedPlacementsProps) {
  const [homeChoice, setHomeChoice] = useState('')
  const [insightChoice, setInsightChoice] = useState('')

  const byId = new Map(articles.map((article) => [article.id, article]))
  const published = articles.filter((article) => article.hasPublished)
  const homeOptions = published.filter((article) => !placements.homepage.includes(article.id))
  const insightOptions = published.filter((article) => article.id !== placements.insightPage)
  const insightArticle = placements.insightPage ? byId.get(placements.insightPage) : undefined
  const homeFull = placements.homepage.length >= HOMEPAGE_MAX

  const entry = (id: string, remove: () => void) => {
    const article = byId.get(id)
    const title = article?.title ?? 'Deleted article'
    return (
      <li key={id} className="ecc-place-item">
        <div className="ecc-place-text">
          {article ? (
            <button type="button" className="ecc-place-link" onClick={() => onOpen(id)}>
              {title}
            </button>
          ) : (
            <span className="ecc-place-link">{title}</span>
          )}
          <span className="ecc-place-sub">
            {!article
              ? 'No longer exists. Remove it to clear the selection.'
              : article.hasPublished
                ? 'Live on the website'
                : 'Not published: hidden from the website until it is published again'}
          </span>
        </div>
        <Button variant="quiet" disabled={disabled} onClick={remove}>
          Remove
        </Button>
      </li>
    )
  }

  const picker = (
    label: string,
    value: string,
    setValue: (value: string) => void,
    options: ArticleSummary[],
    buttonLabel: string,
    onPick: (article: ArticleSummary) => void,
    blocked?: string,
  ) => (
    <div className="ecc-place-add">
      <select
        aria-label={label}
        value={value}
        disabled={disabled || options.length === 0 || Boolean(blocked)}
        onChange={(event) => setValue(event.target.value)}
      >
        <option value="">
          {blocked ?? (options.length === 0 ? 'No other published articles' : 'Choose a published article…')}
        </option>
        {options.map((article) => (
          <option key={article.id} value={article.id}>
            {article.title}
          </option>
        ))}
      </select>
      <Button
        variant="navy"
        disabled={disabled || !value || Boolean(blocked)}
        onClick={() => {
          const article = options.find((candidate) => candidate.id === value)
          if (!article) return
          setValue('')
          onPick(article)
        }}
      >
        {buttonLabel}
      </Button>
    </div>
  )

  return (
    <div className="ecc-card ecc-places ecc-rise" style={stagger(8)}>
      <section aria-labelledby="ecc-place-home">
        <div className="ecc-sec-head">
          <h2 id="ecc-place-home">Homepage Featured Stories</h2>
          <span className="ecc-kicker" style={{margin: 0}}>
            {placements.homepage.length} of {HOMEPAGE_MAX} selected
          </span>
        </div>
        {placements.homepage.length === 0 ? (
          <p className="ecc-note">No articles are selected for the homepage.</p>
        ) : (
          <ul className="ecc-place-list">
            {placements.homepage.map((id) =>
              entry(id, () => onAction('homeRemove', id, byId.get(id)?.title ?? 'Deleted article')),
            )}
          </ul>
        )}
        {picker(
          'Add a published article to Homepage Featured Stories',
          homeChoice,
          setHomeChoice,
          homeOptions,
          'Add to homepage',
          (article) => onAction('homeAdd', article.id, article.title),
          homeFull ? `Limit of ${HOMEPAGE_MAX} reached. Remove one first.` : undefined,
        )}
      </section>

      <section aria-labelledby="ecc-place-insight" className="ecc-place-sep">
        <div className="ecc-sec-head">
          <h2 id="ecc-place-insight">GlobalInsight page featured article</h2>
          <span className="ecc-kicker" style={{margin: 0}}>
            {placements.insightPage ? '1 selected' : 'Empty'}
          </span>
        </div>
        {placements.insightPage ? (
          <ul className="ecc-place-list">
            {entry(placements.insightPage, () =>
              onAction('insightClear', placements.insightPage as string, insightArticle?.title ?? 'Deleted article'),
            )}
          </ul>
        ) : (
          <p className="ecc-note">No article is selected. The featured position on the GlobalInsight page is empty.</p>
        )}
        {picker(
          placements.insightPage
            ? 'Replace the GlobalInsight featured article'
            : 'Choose the GlobalInsight featured article',
          insightChoice,
          setInsightChoice,
          insightOptions,
          placements.insightPage ? 'Replace' : 'Set as featured',
          (article) => onAction('insightSet', article.id, article.title),
        )}
      </section>
    </div>
  )
}
