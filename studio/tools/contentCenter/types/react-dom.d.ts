/**
 * Minimal typing for the one react-dom function the tool uses. The project declares
 * @types/react but not @types/react-dom; if that package is added later, delete this file.
 */
declare module 'react-dom' {
  import type {ReactNode, ReactPortal} from 'react'

  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
    key?: string | null,
  ): ReactPortal
}