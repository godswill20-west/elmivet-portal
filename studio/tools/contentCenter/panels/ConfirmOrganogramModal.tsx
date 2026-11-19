import {Button} from '../components/Button'
import {formatDate} from '../lib/format'
import type {OrganogramVersion} from '../lib/organogramVersions'
import {Modal} from '../overlay/Modal'

export type OrganogramConfirmKind = 'makeCurrent' | 'unpublish'

interface ConfirmOrganogramModalProps {
  open: boolean
  kind: OrganogramConfirmKind | null
  /** Kept after closing so the text stays put during the exit animation. */
  version: OrganogramVersion | null
  /** The version that is current right now (replaced by a make-current). */
  current: OrganogramVersion | null
  /** True while the change runs: the dialog cannot be dismissed or confirmed again. */
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

const name = (v: OrganogramVersion) => (v.versionNumber ? `Version ${v.versionNumber}` : v.title)

/** Confirmation before the current organogram changes or is taken out of publication. */
export function ConfirmOrganogramModal({
  open,
  kind,
  version,
  current,
  busy,
  onCancel,
  onConfirm,
}: ConfirmOrganogramModalProps) {
  if (!kind || !version) return null
  const making = kind === 'makeCurrent'
  const replaced = making && current && current.id !== version.id ? current : null

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onCancel}
      size="narrow"
      eyebrow={making ? 'Change current organogram' : 'Unpublish organogram'}
      title={making ? `Make ${name(version)} current?` : 'Unpublish the current organogram?'}
      initialFocus="[data-initial-focus]"
      footer={
        <>
          <span />
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <Button variant="quiet" onClick={onCancel} disabled={busy} data-initial-focus>
              Cancel
            </Button>
            <Button variant="navy" onClick={onConfirm} disabled={busy}>
              {busy ? 'Working…' : making ? 'Make current' : 'Unpublish'}
            </Button>
          </div>
        </>
      }
    >
      <div className="ecc-confirm">
        <div className="ecc-confirm-article">
          <b>{version.title}</b>
          <span>
            {name(version)} · effective {formatDate(version.effectiveDate) ?? 'date not set'}
          </span>
        </div>
        {making ? (
          <p>
            {name(version)} becomes the one current organogram.{' '}
            {replaced
              ? `${name(replaced)}, which is current now, is archived automatically. `
              : 'No version is current at the moment. '}
            Both changes are saved together, or not at all. No PDF is deleted, and you can switch
            back at any time.
          </p>
        ) : (
          <p>
            {name(version)} is archived and no organogram will be current afterwards. The record
            and its PDF are kept, and any version can be made current again.
          </p>
        )}
      </div>
    </Modal>
  )
}
