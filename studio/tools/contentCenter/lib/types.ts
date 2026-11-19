import type {PortableTextBlock} from '@portabletext/editor'

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
  /**
   * The id of the Sanity image asset the cover points at (the `_ref` of `coverImage.asset`, for
   * example `image-<hash>-1600x900-jpg`), or null when the reference could not be read. Used to
   * tell which asset a cover uses; it is never needed to display the cover.
   */
  assetRef: string | null
}

/** A reference to a Sanity asset document, exactly as stored in `coverImage.asset`. */
export interface SanityAssetReference {
  _type: 'reference'
  _ref: string
}

/**
 * A cover as it is written to a document: a fresh image object with an asset reference and alt
 * text. It carries no hotspot or crop, so writing one resets both.
 */
export interface ArticleCoverImageValue {
  _type: 'image'
  asset: SanityAssetReference
  alt: string
}

/**
 * What a save should do with the article's cover. Exactly one of four states:
 * - `unchanged`: the cover is not touched (no write, no unset).
 * - `set`: a new or replacement cover; `assetRef` and `alt` are both required.
 * - `alt`: only the alt text changes; the asset reference, hotspot and crop are kept.
 * - `remove`: the `coverImage` field is unset. The Sanity asset document is never touched.
 * Fields that do not belong to a state (for example `alt` on `remove`) are rejected, not ignored.
 */
export type ArticleCoverChange =
  | {kind: 'unchanged'}
  | {kind: 'set'; assetRef: string; alt: string}
  | {kind: 'alt'; alt: string}
  | {kind: 'remove'}

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

/** What the Create Article form collects for a new draft. */
export interface ArticleDraftInput {
  headline: string
  category: ArticleCategory | null
  /** Optional card label; empty means "show the category instead". */
  label: string
  summary: string
  /**
   * Portable Text body from the article editor. Optional: a draft may be saved without one, and
   * an empty or whitespace-only body is treated as no body.
   */
  body?: PortableTextBlock[]
  /**
   * What to do with the cover image. Optional: leaving it out means `{kind: 'unchanged'}`, so
   * callers that do not manage covers behave exactly as before.
   */
  coverImage?: ArticleCoverChange
}

/** A new `globalInsight` draft document exactly as it is written to Sanity. */
export interface ArticleDraftDocument {
  _id: string
  _type: 'globalInsight'
  title: string
  excerpt: string
  category: ArticleCategory
  tag?: string
  readTime: number
  author: string
  publishedAt: string
  slug: {_type: 'slug'; current: string}
  /** Present only when the body has meaningful content. */
  body?: PortableTextBlock[]
  /** Present only when a cover was explicitly set (`{kind: 'set'}`). */
  coverImage?: ArticleCoverImageValue
}