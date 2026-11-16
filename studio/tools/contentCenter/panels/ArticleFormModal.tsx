import {useId, useState} from 'react'

import {Button} from '../components/Button'
import {Icon} from '../components/Icon'
import {ARTICLE_CATEGORIES} from '../lib/constants'
import type {ArticleCategory} from '../lib/constants'
import type {ArticleSummary} from '../lib/types'
import {Modal} from '../overlay/Modal'

const HEADLINE_MAX = 110
const SUMMARY_MAX = 260
const TOOLS = ['H', 'B', 'I', '“ ”', '• List', 'Link', 'Image']

interface ArticleFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  /** Article to prefill when editing. Visual shell only: nothing is saved. */
  article: ArticleSummary | null
  onClose: () => void
  onUnavailable: (message: string) => void
}

/**
 * Visual shell for the Create / Edit Article form. The fields, counters and category choice work
 * locally so the design can be reviewed; saving, publishing, the writing surface and the cover
 * upload are connected in the article step.
 */
export function ArticleFormModal({
  open,
  mode,
  article,
  onClose,
  onUnavailable,
}: ArticleFormModalProps) {
  const editing = mode === 'edit' && article !== null
  const ids = {headline: useId(), label: useId(), summary: useId(), body: useId()}
  const [headline, setHeadline] = useState(editing ? article.title : '')
  const [summary, setSummary] = useState(editing ? article.excerpt : '')
  const [category, setCategory] = useState<ArticleCategory | null>(
    editing ? article.category : null,
  )
  const preview = () => onUnavailable('Preview only: nothing was saved.')

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={editing ? 'Editing' : 'New article'}
      title={editing ? 'Edit Article' : 'Create Article'}
      initialFocus="[data-initial-focus]"
      onSubmit={(event) => event.preventDefault()}
      footer={
        <>
          <span className="ecc-note">
            Unsupported formatting is flagged, never silently removed.
          </span>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={preview}>Save draft</Button>
            <Button variant="navy" onClick={preview}>
              Publish
            </Button>
          </div>
        </>
      }
    >
      <div className="ecc-modal-body">
        <div className="ecc-modal-col">
          <div className="ecc-field">
            <label className="ecc-label" htmlFor={ids.headline}>
              Headline{' '}
              <span>
                {headline.length} / {HEADLINE_MAX}
              </span>
            </label>
            <input
              id={ids.headline}
              className="ecc-input ecc-input--title"
              data-initial-focus
              maxLength={HEADLINE_MAX}
              placeholder="A clear, specific headline"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
            />
          </div>

          <div className="ecc-field" role="group" aria-labelledby={`${ids.label}-cat`}>
            <span className="ecc-label" id={`${ids.label}-cat`}>
              Category
            </span>
            <div className="ecc-chips">
              {ARTICLE_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="ecc-choice"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="ecc-field">
            <label className="ecc-label" htmlFor={ids.label}>
              Card label <span>Optional</span>
            </label>
            <input
              id={ids.label}
              className="ecc-input"
              placeholder="e.g. Customs &amp; Compliance"
            />
          </div>

          <div className="ecc-field">
            <label className="ecc-label" htmlFor={ids.summary}>
              Executive summary{' '}
              <span>
                {summary.length} / {SUMMARY_MAX}
              </span>
            </label>
            <textarea
              id={ids.summary}
              className="ecc-area"
              rows={3}
              maxLength={SUMMARY_MAX}
              placeholder="Two or three sentences for the article card"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>

          <div className="ecc-field">
            <span className="ecc-label">Cover photograph</span>
            <button type="button" className="ecc-drop" onClick={preview}>
              <span className="ecc-chip">
                <Icon name="upload" />
              </span>
              <b>Drop an image or browse</b>
              <span>16:9 landscape, 1600 × 900 px or larger · alt text required</span>
            </button>
          </div>
        </div>

        <div className="ecc-modal-col">
          <div className="ecc-field" style={{margin: 0}}>
            <label className="ecc-label" htmlFor={ids.body}>
              Article body <span>Live preview</span>
            </label>
            <div className="ecc-toolbar" role="toolbar" aria-label="Formatting">
              {TOOLS.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  className="ecc-tool"
                  disabled
                  title="Available with the article editor"
                >
                  {tool}
                </button>
              ))}
            </div>
            <textarea id={ids.body} className="ecc-area ecc-write" disabled />
          </div>
          <div className="ecc-preview" aria-live="polite">
            <p className="ecc-note">The formatted article appears here as you write.</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}