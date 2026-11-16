import {useState} from 'react'
import type {CSSProperties, ReactNode} from 'react'

import {coverSrc} from '../lib/articles'
import type {ArticleCover, CoverPalette, CoverScene} from '../lib/types'

const SCENES: Record<CoverScene, ReactNode> = {
  port: (
    <>
      <rect width="400" height="250" fill="var(--ecc-c1)" />
      <circle cx="318" cy="64" r="36" fill="var(--ecc-c3)" opacity=".9" />
      <path d="M0 176h400v74H0z" fill="var(--ecc-c2)" />
      <g fill="var(--ecc-c3)">
        <rect x="34" y="134" width="64" height="42" />
        <rect x="102" y="134" width="64" height="42" opacity=".75" />
        <rect x="68" y="92" width="64" height="42" opacity=".9" />
      </g>
      <path
        d="M236 176V62h64l34 114M236 62l-38-14"
        stroke="var(--ecc-c3)"
        strokeWidth="6"
        fill="none"
      />
    </>
  ),
  vessel: (
    <>
      <rect width="400" height="250" fill="var(--ecc-c1)" />
      <path d="M0 190q50-14 100 0t100 0 100 0 100 0v60H0z" fill="var(--ecc-c2)" />
      <path d="M60 170h280l-30 34H96z" fill="var(--ecc-c3)" />
      <g fill="var(--ecc-c3)" opacity=".85">
        <rect x="110" y="132" width="50" height="38" />
        <rect x="164" y="132" width="50" height="38" opacity=".7" />
        <rect x="218" y="132" width="50" height="38" />
        <rect x="137" y="94" width="50" height="38" opacity=".9" />
      </g>
      <circle cx="70" cy="60" r="26" fill="var(--ecc-c3)" opacity=".8" />
    </>
  ),
  hub: (
    <>
      <rect width="400" height="250" fill="var(--ecc-c1)" />
      <g fill="none" stroke="var(--ecc-c3)" strokeWidth="2" opacity=".8">
        <circle cx="270" cy="130" r="40" />
        <circle cx="270" cy="130" r="80" />
        <circle cx="270" cy="130" r="120" />
        <path d="M60 200L270 130 120 60" />
      </g>
      <circle cx="270" cy="130" r="9" fill="var(--ecc-c3)" />
      <circle cx="60" cy="200" r="6" fill="var(--ecc-c2)" />
      <circle cx="120" cy="60" r="6" fill="var(--ecc-c2)" />
    </>
  ),
}

interface CoverArtProps {
  scene: CoverScene
  palette: CoverPalette
  /** Layout class from the stylesheet: ecc-art, ecc-thumb or ecc-drawer-art. */
  className: string
  /** The article's cover photograph. When present (and it loads) it replaces the illustration. */
  cover?: ArticleCover | null
  /** Width requested from the image CDN, in CSS pixels (double it for sharp high-DPI screens). */
  imageWidth?: number
  /** Overlay content such as the category tag. */
  children?: ReactNode
}

/**
 * The article cover: the uploaded photograph when there is one, otherwise a generated
 * illustration in the same wrapper (drafts may not have a cover yet, or the image may fail).
 */
export function CoverArt({
  scene,
  palette,
  className,
  cover = null,
  imageWidth = 800,
  children,
}: CoverArtProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = cover !== null && failedUrl !== cover.url
  const vars = {
    '--ecc-c1': palette.base,
    '--ecc-c2': palette.mid,
    '--ecc-c3': palette.accent,
  } as CSSProperties

  return (
    <div className={className} style={vars}>
      {showImage ? (
        <img
          src={coverSrc(cover.url, imageWidth)}
          alt={cover.alt}
          loading="lazy"
          style={{objectPosition: cover.objectPosition}}
          onError={() => setFailedUrl(cover.url)}
        />
      ) : (
        <svg
          viewBox="0 0 400 250"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          focusable="false"
        >
          {SCENES[scene]}
        </svg>
      )}
      {children}
    </div>
  )
}