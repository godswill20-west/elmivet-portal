import type {ReactNode} from 'react'

import {useDialogLifecycle} from './useDialogLifecycle'

interface DrawerProps {
  open: boolean
  onClose: () => void
  /** Accessible name of the drawer (e.g. "Article details"). */
  label: string
  /** Content for the top-left of the header, such as a status badge. */
  status?: ReactNode
  /** Sticky action bar at the bottom. */
  footer?: ReactNode
  initialFocus?: string
  children: ReactNode
}

/** Right-hand slide-in panel with a dimmed scrim. Escape, the scrim and the × button close it. */
export function Drawer({
  open,
  onClose,
  label,
  status,
  footer,
  initialFocus,
  children,
}: DrawerProps) {
  const {dialogRef, mounted, state} = useDialogLifecycle({open, initialFocus})
  if (!mounted) return null

  return (
    <dialog
      ref={dialogRef}
      className="ecc-dialog ecc-dialog--drawer"
      data-state={state}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="ecc-scrim" aria-hidden="true" onClick={onClose} />
      <div className="ecc-drawer" data-ecc-panel>
        <div className="ecc-drawer-top">
          <div>{status}</div>
          <button type="button" className="ecc-close" aria-label="Close details" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="ecc-drawer-body">{children}</div>
        {footer ? <div className="ecc-drawer-foot">{footer}</div> : null}
      </div>
    </dialog>
  )
}