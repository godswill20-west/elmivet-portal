import {useEffect} from 'react'
import {DOCUMENT_TYPES} from '../lib/constants'
import type {ArticleSummary} from '../lib/types'
import type {ArticlePermissionState} from './permissions'
import {useDocumentPairPermissions} from './sanityInternals'

interface ArticlePermissionProbeProps {
  article: ArticleSummary
  onChange: (state: ArticlePermissionState) => void
}

/**
 * Headless. Asks Sanity whether the signed-in user may publish, unpublish and delete one article
 * (draft-aware, from the user's real grants) and reports the answer. It is mounted only for the
 * article whose menu or drawer is open, so the list does not open a listener per row.
 */
export function ArticlePermissionProbe({article, onChange}: ArticlePermissionProbeProps) {
  const options = {id: article.id, type: DOCUMENT_TYPES.article}
  const [publish, publishLoading] = useDocumentPairPermissions({...options, permission: 'publish'})
  const [unpublish, unpublishLoading] = useDocumentPairPermissions({
    ...options,
    permission: 'unpublish',
  })
  const [remove, removeLoading] = useDocumentPairPermissions({...options, permission: 'delete'})

  const ready = !publishLoading && !unpublishLoading && !removeLoading
  const canPublish = publish?.granted ?? false
  const canUnpublish = unpublish?.granted ?? false
  const canDelete = remove?.granted ?? false

  useEffect(() => {
    onChange({
      articleId: article.id,
      ready,
      publish: canPublish,
      unpublish: canUnpublish,
      delete: canDelete,
    })
  }, [article.id, ready, canPublish, canUnpublish, canDelete, onChange])

  return null
}
