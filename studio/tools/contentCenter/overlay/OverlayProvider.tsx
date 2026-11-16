import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import type {ReactNode} from 'react'

import {ToastViewport} from './ToastViewport'
import {toastReducer} from './toastReducer'
import type {ToastTone} from './toastReducer'

export interface ToastOptions {
  tone?: ToastTone
  /** How long the toast stays before it leaves. Errors stay longer by default. */
  durationMs?: number
}

export interface ToastApi {
  show: (message: string, options?: ToastOptions) => number
  dismiss: (id: number) => void
}

interface OverlayContextValue {
  toast: ToastApi
  /** Called by open dialogs so toasts render inside the top-most one. Returns an unregister function. */
  registerLayer: (element: HTMLElement) => () => void
}

const OverlayContext = createContext<OverlayContextValue | null>(null)

const LEAVE_MS = 300
const DEFAULT_DURATION_MS = 3200
const ERROR_DURATION_MS = 6000

export function useOverlay(): OverlayContextValue {
  const value = useContext(OverlayContext)
  if (!value) throw new Error('useOverlay must be used inside <OverlayProvider>.')
  return value
}

export const useToast = (): ToastApi => useOverlay().toast

/**
 * Renders the Content Center frame and owns the overlay infrastructure: the stack of open
 * dialogs and the toast queue. A dialog opened with showModal() makes everything outside it
 * inert, so toasts are portalled into the top-most dialog (or the frame when none is open).
 * That keeps them visible, clickable and announced to screen readers.
 */
export function OverlayProvider({children}: {children: ReactNode}) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null)
  const [layers, setLayers] = useState<HTMLElement[]>([])
  const [toasts, dispatch] = useReducer(toastReducer, [])
  const nextId = useRef(1)
  const timers = useRef(new Set<number>())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const dismiss = useCallback((id: number) => {
    dispatch({type: 'leave', id})
    timers.current.add(window.setTimeout(() => dispatch({type: 'remove', id}), LEAVE_MS))
  }, [])

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = nextId.current++
      const tone = options.tone ?? 'default'
      dispatch({type: 'add', toast: {id, message, tone, leaving: false}})
      const duration =
        options.durationMs ?? (tone === 'error' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS)
      timers.current.add(window.setTimeout(() => dismiss(id), duration))
      return id
    },
    [dismiss],
  )

  const registerLayer = useCallback((element: HTMLElement) => {
    setLayers((current) => [...current, element])
    return () => setLayers((current) => current.filter((item) => item !== element))
  }, [])

  const value = useMemo(
    () => ({toast: {show, dismiss}, registerLayer}),
    [show, dismiss, registerLayer],
  )
  const target = layers[layers.length - 1] ?? frame

  return (
    <OverlayContext.Provider value={value}>
      <div className="ecc-frame" ref={setFrame}>
        <div className="ecc-scroll">{children}</div>
      </div>
      <ToastViewport toasts={toasts} target={target} onDismiss={dismiss} />
    </OverlayContext.Provider>
  )
}