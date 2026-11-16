const DATE = new Intl.DateTimeFormat('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const toDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "12 Nov 2026", or null for a missing or invalid timestamp. */
export const formatDate = (iso: string | null | undefined): string | null => {
  const date = toDate(iso)
  return date ? DATE.format(date) : null
}

/** "12 Nov 2026, 09:30", or null for a missing or invalid timestamp. */
export const formatDateTime = (iso: string | null | undefined): string | null => {
  const date = toDate(iso)
  return date ? DATE_TIME.format(date) : null
}

/** Epoch milliseconds, or 0 for a missing or invalid timestamp. */
export const toTime = (iso: string | null | undefined): number => toDate(iso)?.getTime() ?? 0
