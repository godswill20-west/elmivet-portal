import type {ArticleSummary} from '../lib/types'

export type ArticleAction = 'publish' | 'unpublish' | 'delete'

/** What the signed-in user may do with one article, as reported by Sanity's grants. */
export interface ArticlePermissionState {
  articleId: string | null
  /** False until Sanity has answered for `articleId`. */
  ready: boolean
  publish: boolean
  unpublish: boolean
  delete: boolean
}

export const UNKNOWN_PERMISSIONS: ArticlePermissionState = {
  articleId: null,
  ready: false,
  publish: true,
  unpublish: true,
  delete: true,
}

/**
 * Whether to offer an action. While permissions are still loading (or belong to another
 * article) the action stays enabled; it is verified again before it runs, so this is a
 * convenience for the interface and never the security check.
 */
export function canPerform(
  permissions: ArticlePermissionState,
  article: ArticleSummary,
  action: ArticleAction,
): boolean {
  if (!permissions.ready || permissions.articleId !== article.id) return true
  return permissions[action]
}

const VERB: Record<ArticleAction, string> = {
  publish: 'publish',
  unpublish: 'unpublish',
  delete: 'delete',
}

export const deniedMessage = (action: ArticleAction): string =>
  `You do not have permission to ${VERB[action]} this article. Ask an administrator for access.`

/** What each action can be asked of, given the article's current state. */
export const availableActions = (article: ArticleSummary) => ({
  publish: article.hasDraft,
  unpublish: article.hasPublished,
  delete: true,
})

export const publishLabel = (article: ArticleSummary): string =>
  article.hasPublished ? 'Publish changes' : 'Publish'
