import type {ArticleCategory} from './constants'

export type ArticleStatus = 'published' | 'draft'

/** Illustration used for a cover until a real cover photograph is available. */
export type CoverScene = 'port' | 'vessel' | 'hub'

export interface CoverPalette {
  base: string
  mid: string
  accent: string
}

/** A cover photograph from Sanity. `url` has no size parameters; the view adds them. */
export interface ArticleCover {
  url: string
  alt: string
  /** CSS object-position derived from the image hotspot ("50% 50%" when none is set). */
  objectPosition: string
}

/**
 * One article as the dashboard shows it. A draft and its published counterpart are merged into
 * a single entry: content comes from the draft when one exists (what editors are working on),
 * while the flags below record what exists in each state.
 */
export interface ArticleSummary {
  /** The published document id. Identifies the article; the draft id is `drafts.${id}`. */
  id: string
  title: string
  /** A valid schema category, or null when missing or no longer in the list. */
  category: ArticleCategory | null
  /** What to display for the category ("Uncategorised" when none). */
  categoryLabel: string
  tag: string | null
  /** `published` when a published document exists, otherwise `draft`. */
  status: ArticleStatus
  hasPublished: boolean
  hasDraft: boolean
  /** A published article that also has a draft with edits that are not live yet. */
  hasUnpublishedChanges: boolean
  /** The `isFeatured` value of the content being displayed (draft when one exists). */
  isFeatured: boolean
  /** The `isFeatured` value of the published document: what the public site would use. */
  featuredLive: boolean
  /** Short date for lists, e.g. "12 Nov 2026" or "Edited 12 Nov 2026". */
  dateLabel: string
  /** "12 Nov 2026, 09:30" when published, otherwise "Not published". */
  publishedLabel: string
  editedLabel: string
  excerpt: string
  readTimeMinutes: number | null
  byline: string
  slug: string | null
  cover: ArticleCover | null
  /** Generated illustration shown when the article has no cover image. */
  scene: CoverScene
  palette: CoverPalette
  /** ISO timestamp of the earliest document (draft or published). */
  createdAt: string
  updatedAt: string
  /** Epoch ms used to order featured stories (most recently published first). */
  leadTime: number
}

export interface OrganogramVersion {
  version: number
  effectiveLabel: string
}

export interface OrganogramSummary {
  title: string
  version: number
  effectiveLabel: string
  sizeLabel: string
  uploadedBy: string
  previous: OrganogramVersion[]
}

/** Article counts for the metric cards, derived from the live article list. */
export interface DashboardStats {
  total: number
  published: number
  /** Articles with no published version. */
  drafts: number
  createdThisMonth: number
  /** Articles per month for the last six months, oldest first (drives the sparklines). */
  trend: {total: number[]; published: number[]; drafts: number[]}
}
