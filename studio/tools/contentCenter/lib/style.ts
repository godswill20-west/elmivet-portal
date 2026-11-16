import type {CSSProperties} from 'react'

/** Staggers an entrance animation: element n starts n * 70ms after the first. */
export const stagger = (n: number): CSSProperties => ({'--ecc-stagger': n}) as CSSProperties