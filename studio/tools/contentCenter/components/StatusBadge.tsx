import type {ReactNode} from 'react'

import type {ArticleStatus} from '../lib/types'

interface StatusBadgeProps {
  tone: 'live' | 'draft'
  children: ReactNode
}

export function StatusBadge({tone, children}: StatusBadgeProps) {
  return (
    <span className={`ecc-badge ecc-badge--${tone}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  )
}

/** Badge for an article's publishing status. */
export function ArticleStatusBadge({status}: {status: ArticleStatus}) {
  return status === 'published' ? (
    <StatusBadge tone="live">Published</StatusBadge>
  ) : (
    <StatusBadge tone="draft">Draft</StatusBadge>
  )
}

/** Shown beside "Published" when a draft holds edits that are not live yet. */
export function UnpublishedChangesBadge() {
  return <StatusBadge tone="draft">Unpublished changes</StatusBadge>
}