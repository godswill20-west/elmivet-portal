import {Button} from '../components/Button'
import {Modal} from '../overlay/Modal'
import type {ArticleSummary} from '../lib/types'

export type ConfirmKind = 'delete' | 'unpublish'

interface ConfirmArticleModalProps {
  open: boolean
  kind: ConfirmKind | null
  /** Kept after closing so the text stays put during the exit animation. */
  article: ArticleSummary | null
  /** True while the operation runs: the dialog cannot be dismissed or confirmed again. */
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Confirmation for the two operations that take an article away from readers. */
export function ConfirmArticleModal({
  open,
  kind,
  article,
  busy,
  onCancel,
  onConfirm,
}: ConfirmArticleModalProps) {
  if (!kind || !article) return null
  const deleting = kind === 'delete'

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onCancel}
      size="narrow"
      eyebrow={deleting ? 'Delete article' : 'Unpublish article'}
      title={deleting ? 'Delete this article?' : 'Unpublish this article?'}
      initialFocus="[data-initial-focus]"
      footer={
        <>
          <span className="ecc-note">{deleting ? 'This cannot be undone here.' : ''}</span>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <Button variant="quiet" onClick={onCancel} disabled={busy} data-initial-focus>
              Cancel
            </Button>
            <Button variant={deleting ? 'red' : 'navy'} onClick={onConfirm} disabled={busy}>
              {busy
                ? deleting
                  ? 'Deleting…'
                  : 'Unpublishing…'
                : deleting
                  ? 'Delete article'
                  : 'Unpublish'}
            </Button>
          </div>
        </>
      }
    >
      <div className="ecc-confirm">
        <div className="ecc-confirm-article">
          <b>{article.title}</b>
          <span>
            {article.categoryLabel} · {article.hasPublished ? 'Published' : 'Draft'}
            {article.hasUnpublishedChanges ? ' with unpublished changes' : ''}
          </span>
        </div>
        {deleting ? (
          <p>
            <strong className="ecc-confirm-warn">Deletion is permanent.</strong> The article is
            removed from Sanity
            {article.hasPublished && article.hasDraft
              ? ', including its published version and its draft'
              : article.hasPublished
                ? ', including its published version'
                : ', including its draft'}
            .{article.hasPublished ? ' It disappears from the website immediately.' : ''}
          </p>
        ) : (
          <p>
            The article leaves the website immediately. Its content is kept as a draft, so you can
            publish it again later.
          </p>
        )}
      </div>
    </Modal>
  )
}
