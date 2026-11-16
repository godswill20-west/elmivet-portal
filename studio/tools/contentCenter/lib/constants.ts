/**
 * Shared constants for the Command Center tool.
 * Document type names and the API version live here so views, hooks and queries never
 * hard-code them. Category data is imported from the schema's single source of truth.
 */
import {ARTICLE_CATEGORIES} from '../../../schemaTypes/articleCategories'
import type {ArticleCategory} from '../../../schemaTypes/articleCategories'

/** Sanity API version used by every Command Center query and mutation. */
export const API_VERSION = '2026-01-01'

/** Document type names. These must match the `name` of each schema in studio/schemaTypes. */
export const DOCUMENT_TYPES = {
  article: 'globalInsight',
  organogram: 'organogram',
} as const

export type DocumentTypeName = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES]

export {ARTICLE_CATEGORIES}
export type {ArticleCategory}

/** Narrow an unknown value (e.g. a field read from a document) to a valid article category. */
export const isArticleCategory = (value: unknown): value is ArticleCategory =>
  typeof value === 'string' && (ARTICLE_CATEGORIES as readonly string[]).includes(value)