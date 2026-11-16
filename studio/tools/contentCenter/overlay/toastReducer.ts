export type ToastTone = 'default' | 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
  /** True while the toast plays its exit animation. */
  leaving: boolean
}

export type ToastAction =
  {type: 'add'; toast: ToastItem} | {type: 'leave'; id: number} | {type: 'remove'; id: number}

/** At most this many toasts are visible at once; the oldest is dropped first. */
export const MAX_TOASTS = 3

export function toastReducer(state: ToastItem[], action: ToastAction): ToastItem[] {
  switch (action.type) {
    case 'add':
      return [...state, action.toast].slice(-MAX_TOASTS)
    case 'leave':
      return state.map((toast) => (toast.id === action.id ? {...toast, leaving: true} : toast))
    case 'remove':
      return state.filter((toast) => toast.id !== action.id)
    default:
      return state
  }
}