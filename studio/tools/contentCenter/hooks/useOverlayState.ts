import {useMemo, useReducer} from 'react'

export type ModalKind = 'create' | 'edit' | 'upload'

/**
 * `*Open` flags are separate from the ids/kinds so content stays rendered while an overlay
 * plays its exit animation. Opening the edit modal leaves the article drawer open beneath it.
 */
export interface OverlayState {
  drawerArticleId: string | null
  drawerOpen: boolean
  modalKind: ModalKind | null
  modalOpen: boolean
}

export type OverlayAction =
  | {type: 'openArticle'; id: string}
  | {type: 'closeArticle'}
  | {type: 'openModal'; kind: ModalKind}
  | {type: 'closeModal'}

export const initialOverlayState: OverlayState = {
  drawerArticleId: null,
  drawerOpen: false,
  modalKind: null,
  modalOpen: false,
}

export function overlayReducer(state: OverlayState, action: OverlayAction): OverlayState {
  switch (action.type) {
    case 'openArticle':
      return {...state, drawerArticleId: action.id, drawerOpen: true}
    case 'closeArticle':
      return {...state, drawerOpen: false}
    case 'openModal':
      return {...state, modalKind: action.kind, modalOpen: true}
    case 'closeModal':
      return {...state, modalOpen: false}
    default:
      return state
  }
}

export function useOverlayState() {
  const [state, dispatch] = useReducer(overlayReducer, initialOverlayState)
  const actions = useMemo(
    () => ({
      openArticle: (id: string) => dispatch({type: 'openArticle', id}),
      closeArticle: () => dispatch({type: 'closeArticle'}),
      openModal: (kind: ModalKind) => dispatch({type: 'openModal', kind}),
      closeModal: () => dispatch({type: 'closeModal'}),
    }),
    [],
  )
  return {state, ...actions}
}