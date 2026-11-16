import type {ReactNode} from 'react'

const PATHS = {
  doc: <path d="M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  pen: <path d="M4 20l4-1 11-11-3-3L5 16z M14 7l3 3" />,
  org: (
    <>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-4h12v4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  dots: (
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

/** Decorative inline icon. Always pair it with visible text or an aria-label on its button. */
export function Icon({name}: {name: IconName}) {
  return (
    <svg className="ecc-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  )
}