import {useId} from 'react'
import type {FormEvent, ReactNode} from 'react'

import {useDialogLifecycle} from './useDialogLifecycle'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Small label above the title (e.g. "New article"). */
  eyebrow: string
  title: string
  size?: 'wide' | 'narrow'
  /** Action bar at the bottom. */
  footer?: ReactNode
  initialFocus?: string
  /** When provided the panel is a <form> and this runs on submit. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}

/** Centered form dialog on a dimmed scrim. Full-screen on small screens. */
export function Modal({
  open,
  onClose,
  eyebrow,
  title,
  size = 'wide',
  footer,
  initialFocus,
  onSubmit,
  children,
}: ModalProps) {
  const titleId = useId()
  const {dialogRef, mounted, state} = useDialogLifecycle({open, initialFocus})
  if (!mounted) return null

  const className = `ecc-modal${size === 'narrow' ? ' ecc-modal--narrow' : ''}`
  const inner = (
    <>
      <div className="ecc-modal-head">
        <div>
          <p className="ecc-kicker">{eyebrow}</p>
          <h2 className="ecc-serif" id={titleId}>
            {title}
          </h2>
        </div>
        <button type="button" className="ecc-close" aria-label="Close form" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
      {footer ? <div className="ecc-modal-foot">{footer}</div> : null}
    </>
  )

  return (
    <dialog
      ref={dialogRef}
      className="ecc-dialog ecc-dialog--modal"
      data-state={state}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="ecc-scrim" aria-hidden="true" onClick={onClose} />
      {onSubmit ? (
        <form className={className} data-ecc-panel onSubmit={onSubmit}>
          {inner}
        </form>
      ) : (
        <div className={className} data-ecc-panel>
          {inner}
        </div>
      )}
    </dialog>
  )
}