import {useId} from 'react'

import {Button} from '../components/Button'
import {Icon} from '../components/Icon'
import {Modal} from '../overlay/Modal'

interface UploadOrganogramModalProps {
  open: boolean
  /** Version number the next upload would receive. */
  nextVersion: number
  onClose: () => void
  onUnavailable: (message: string) => void
}

/**
 * Visual shell for the organogram upload form. The file check, upload and publishing are
 * connected in the organogram step.
 */
export function UploadOrganogramModal({
  open,
  nextVersion,
  onClose,
  onUnavailable,
}: UploadOrganogramModalProps) {
  const ids = {date: useId(), note: useId()}
  const preview = () => onUnavailable('Preview only: nothing was uploaded.')

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="narrow"
      eyebrow={`Version ${nextVersion}`}
      title="Upload Organogram"
      initialFocus="[data-initial-focus]"
      onSubmit={(event) => event.preventDefault()}
      footer={
        <>
          <span />
          <div style={{display: 'flex', gap: 8}}>
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="navy" icon="upload" onClick={preview}>
              Upload &amp; publish
            </Button>
          </div>
        </>
      }
    >
      <div className="ecc-modal-col ecc-modal-col--scroll">
        <div className="ecc-field">
          <button
            type="button"
            className="ecc-drop"
            style={{padding: 34}}
            data-initial-focus
            onClick={preview}
          >
            <span className="ecc-chip">
              <Icon name="doc" />
            </span>
            <b>Drop the PDF here, or browse</b>
            <span>PDF only · the file is checked before upload</span>
          </button>
        </div>
        <div className="ecc-field">
          <label className="ecc-label" htmlFor={ids.date}>
            Effective date
          </label>
          <input id={ids.date} className="ecc-input" type="date" defaultValue="2026-11-14" />
        </div>
        <div className="ecc-field">
          <label className="ecc-label" htmlFor={ids.note}>
            Version note <span>Internal</span>
          </label>
          <textarea
            id={ids.note}
            className="ecc-area"
            rows={2}
            placeholder="What changed in this version?"
          />
        </div>
        <p className="ecc-note" style={{margin: 0}}>
          The previous version stays on record. Only the newest published version appears on the
          About page.
        </p>
      </div>
    </Modal>
  )
}