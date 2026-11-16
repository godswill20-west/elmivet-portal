import {createPortal} from 'react-dom'

import type {ToastItem} from './toastReducer'

interface ToastViewportProps {
  toasts: ToastItem[]
  /** The element toasts render into: the top-most open dialog, or the frame. */
  target: HTMLElement | null
  onDismiss: (id: number) => void
}

export function ToastViewport({toasts, target, onDismiss}: ToastViewportProps) {
  if (!target) return null

  return createPortal(
    <div className="ecc-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`ecc-toast ecc-toast--${toast.tone}${toast.leaving ? ' is-leaving' : ''}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          <span>{toast.message}</span>
          {toast.tone === 'error' ? (
            <button
              type="button"
              className="ecc-toast-close"
              aria-label="Dismiss message"
              onClick={() => onDismiss(toast.id)}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>,
    target,
  )
}