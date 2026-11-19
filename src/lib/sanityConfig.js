/* -------------------------------------------------------------------------- */
/*  Sanity connection settings + diagnostics for the public website.          */
/*                                                                            */
/*  Pure module: no React and no Sanity client import, so it can be tested    */
/*  on its own. Values come from public Vite variables only (never a token):  */
/*    VITE_SANITY_PROJECT_ID, VITE_SANITY_DATASET, VITE_SANITY_API_VERSION    */
/* -------------------------------------------------------------------------- */

export const ENV_KEYS = Object.freeze({
  projectId: 'VITE_SANITY_PROJECT_ID',
  dataset: 'VITE_SANITY_DATASET',
  apiVersion: 'VITE_SANITY_API_VERSION',
})

const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const DATASET_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/
const API_VERSION_PATTERN = /^v?\d{4}-\d{2}-\d{2}$/

const clean = (value) => (typeof value === 'string' ? value.trim() : '')

/**
 * Error type used for everything that goes wrong while reading public content.
 *   kind: 'config'     environment variables missing or malformed
 *         'network'    the browser could not reach api.sanity.io / cdn.sanity.io
 *         'permission' 401 / 403 (dataset not public, or wrong project)
 *         'query'      400 (GROQ or parameter problem) or other 4xx
 *         'server'     5xx from Sanity
 *         'data'       the request worked but the content is unusable (e.g. bad organogram file)
 *         'unknown'    anything else
 */
export class SanityContentError extends Error {
  constructor(kind, message, { cause, status, label, problems } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'SanityContentError'
    this.kind = kind
    this.status = status ?? null
    this.label = label ?? null // which request failed, e.g. "current organogram"
    this.problems = problems ?? null // config problems: [{key, issue}]
  }
}

/**
 * Validates the three public variables. Returns { config, problems }. `config` is null
 * whenever there is at least one problem, so a half-configured client is never created.
 */
export function readSanityConfig(env = {}) {
  const raw = {
    projectId: clean(env[ENV_KEYS.projectId]),
    dataset: clean(env[ENV_KEYS.dataset]),
    apiVersion: clean(env[ENV_KEYS.apiVersion]),
  }
  const patterns = {
    projectId: [PROJECT_ID_PATTERN, 'must be the lowercase Sanity project ID (letters, numbers, hyphens)'],
    dataset: [DATASET_PATTERN, 'must be a dataset name such as "production"'],
    apiVersion: [API_VERSION_PATTERN, 'must be a date such as "2026-01-01"'],
  }

  const problems = []
  for (const field of Object.keys(raw)) {
    const key = ENV_KEYS[field]
    if (!raw[field]) problems.push({ key, issue: 'is missing' })
    else if (!patterns[field][0].test(raw[field])) {
      problems.push({ key, issue: `is invalid (${patterns[field][1]})` })
    }
  }

  return { config: problems.length ? null : raw, problems }
}

export function describeConfigProblems(problems) {
  const list = problems.map((p) => `${p.key} ${p.issue}`).join('; ')
  return (
    `Sanity is not configured: ${list}. Copy .env.example to .env for local work, or add the ` +
    'variables in Vercel (Project Settings > Environment Variables) and redeploy, because ' +
    'Vite inlines VITE_* values at build time.'
  )
}

/**
 * Turns whatever @sanity/client (or fetch) threw into a SanityContentError whose message says
 * what actually happened. Already-classified errors are returned untouched.
 */
export function toContentError(error, label) {
  if (error instanceof SanityContentError) return error

  // A domain error that carries its own kind (e.g. OrganogramDataError)
  if (error && typeof error.kind === 'string' && error.kind === 'data') {
    return new SanityContentError('data', error.message, { cause: error, label })
  }

  const status = Number(error?.statusCode ?? error?.response?.statusCode) || null
  const detail =
    error?.details?.description ||
    error?.response?.body?.error?.description ||
    error?.response?.body?.message ||
    ''
  const base = error?.message ? String(error.message) : 'Unknown error'
  const suffix = detail && !base.includes(detail) ? ` (${detail})` : ''
  const where = label ? ` while loading ${label}` : ''

  if (status === 401 || status === 403) {
    return new SanityContentError(
      'permission',
      `Sanity refused the request${where} (HTTP ${status}). The dataset must be Public, and the project ID must be correct.${suffix}`,
      { cause: error, status, label },
    )
  }
  if (status && status >= 500) {
    return new SanityContentError(
      'server',
      `Sanity had a server problem${where} (HTTP ${status}). Try again shortly.${suffix}`,
      { cause: error, status, label },
    )
  }
  if (status) {
    return new SanityContentError(
      'query',
      `Sanity rejected the request${where} (HTTP ${status}): ${base}${suffix}`,
      { cause: error, status, label },
    )
  }

  const looksLikeNetwork =
    error instanceof TypeError ||
    /network|failed to fetch|load failed|fetch failed|timeout|timed out|ENOTFOUND|ECONN/i.test(base)
  if (looksLikeNetwork) {
    return new SanityContentError(
      'network',
      `Could not reach Sanity${where}. Check the connection (or an ad/privacy blocker). ${base}`,
      { cause: error, label },
    )
  }
  return new SanityContentError('unknown', `Unexpected error${where}: ${base}`, { cause: error, label })
}

const HEADLINES = {
  config: 'The website is not connected to its content source.',
  network: 'We could not reach the content service.',
  permission: 'The content service refused the request.',
  query: 'The content request was rejected.',
  server: 'The content service is having problems.',
  data: 'The content could not be used.',
  unknown: 'Something went wrong while loading content.',
}

/** UI-friendly summary: { kind, headline, detail, status }. `detail` is the diagnostic line. */
export function describeSanityError(error) {
  const err = error instanceof SanityContentError ? error : toContentError(error)
  return {
    kind: err.kind,
    headline: HEADLINES[err.kind] || HEADLINES.unknown,
    detail: err.message,
    status: err.status,
  }
}
