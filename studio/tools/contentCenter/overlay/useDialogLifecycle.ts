import {useLayoutEffect, useRef, useState} from 'react'

import {prefersReducedMotion} from './motion'
import {useOverlay} from './OverlayProvider'

/** Upper bound for the exit animation; the panel's own transitionend normally finishes sooner. */
const EXIT_FALLBACK_MS = 700

interface DialogLifecycleOptions {
  open: boolean
  /** CSS selector of the element to focus when the dialog opens (defaults to the first focusable). */
  initialFocus?: string
}

/**
 * Drives a native <dialog> through mount, enter, exit and unmount.
 *
 * - `open` is the single source of truth. Escape, the scrim and the close button all call onClose.
 * - showModal() gives the focus trap, inert background and focus restoration for free.
 * - `data-state` ("open" | "closed") drives the CSS transitions. The dialog stays mounted until
 *   the exit transition ends, so content never disappears mid-animation.
 */
export function useDialogLifecycle({open, initialFocus}: DialogLifecycleOptions) {
  const {registerLayer} = useOverlay()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)

  // Derive "mounted" during render so the first open commits the <dialog> in the same pass.
  if (open && !mounted) setMounted(true)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!mounted || !dialog) return undefined

    if (open) {
      if (!dialog.open) dialog.showModal()
      const unregister = registerLayer(dialog)
      if (initialFocus) dialog.querySelector<HTMLElement>(initialFocus)?.focus()
      let second = 0
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setVisible(true))
      })
      return () => {
        cancelAnimationFrame(first)
        cancelAnimationFrame(second)
        unregister()
      }
    }

    setVisible(false)
    let done = false
    const finish = () => {
      if (done) return
      done = true
      if (dialog.open) dialog.close()
      setMounted(false)
    }
    if (prefersReducedMotion()) {
      finish()
      return undefined
    }
    const panel = dialog.querySelector('[data-ecc-panel]')
    const onEnd = (event: Event) => {
      if (event.target === panel) finish()
    }
    panel?.addEventListener('transitionend', onEnd)
    const timer = window.setTimeout(finish, EXIT_FALLBACK_MS)
    return () => {
      window.clearTimeout(timer)
      panel?.removeEventListener('transitionend', onEnd)
    }
  }, [mounted, open, initialFocus, registerLayer])

  return {dialogRef, mounted, state: visible && open ? 'open' : 'closed'}
}