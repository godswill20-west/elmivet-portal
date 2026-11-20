// api/global-insight.js
//
// Serves /global-insight/<slug> (vercel.json rewrites that path here, ahead of the SPA fallback).
// It returns the SAME built index.html the site normally serves, with the article's SEO and
// social-sharing tags already in <head>, so Google, WhatsApp, Facebook and LinkedIn see them
// without running any JavaScript. React then loads exactly as before.
//
//   published article  -> 200, article tags injected
//   unknown/unpublished-> 404, normal app HTML (the reader still shows its own "not found" state)
//   Sanity/config error-> 200, normal app HTML unchanged (never a broken page), not cached
//
// No credentials are used: the dataset is public and the query asks for the published perspective.
// Sanity settings are the same public VITE_SANITY_* variables the website already has.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readSanityConfig } from '../src/lib/sanityConfig.js';
import {
  ARTICLE_SEO_QUERY,
  MANAGED_KEYS,
  buildArticleSeo,
  renderHeadBlock,
} from '../src/lib/articleSeo.js';

export const config = { maxDuration: 10 };

const SANITY_TIMEOUT_MS = 4000;
const MAX_SLUG_LENGTH = 200;

const CACHE_OK = 'public, max-age=0, s-maxage=300, stale-while-revalidate=300';
const CACHE_NOT_FOUND = 'public, max-age=0, s-maxage=60';
const CACHE_NONE = 'no-store';

/* ------------------------------------------------------------------ */
/*  The built index.html from THIS deployment                          */
/*                                                                    */
/*  vercel.json lists dist/index.html under functions.includeFiles,   */
/*  so Vercel copies it into the function bundle next to the code, at  */
/*  the same project-relative path. It is located relative to this     */
/*  file (not a hard-coded absolute path), with process.cwd() as a     */
/*  second candidate. No network request is made to fetch it.          */
/* ------------------------------------------------------------------ */
let templateCache = null;

const TEMPLATE_CANDIDATES = [
  () => new URL('../dist/index.html', import.meta.url),
  () => path.join(process.cwd(), 'dist', 'index.html'),
];

async function loadTemplate() {
  if (templateCache) return templateCache;

  let lastError = null;
  for (const candidate of TEMPLATE_CANDIDATES) {
    try {
      const html = await readFile(candidate(), 'utf8');
      // Sanity-check that this really is the built app shell before trusting it.
      if (/<\/head>/i.test(html) && /id=["']root["']/i.test(html)) {
        templateCache = html;
        return html;
      }
      lastError = new Error('index.html was found but does not look like the built app shell');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('index.html could not be located');
}

/* ------------------------------------------------------------------ */
/*  HTML injection                                                     */
/* ------------------------------------------------------------------ */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Each pattern also swallows the tag's own indentation and line break so no blank lines are left.
const TITLE_PATTERN = /[ \t]*<title\b[^>]*>[\s\S]*?<\/title>[ \t]*\r?\n?/i;

const MANAGED_PATTERNS = MANAGED_KEYS.map(([tag, attr, key]) =>
  tag === 'link'
    ? new RegExp(`[ \\t]*<link\\b[^>]*?\\s${attr}\\s*=\\s*(["'])${escapeRegex(key)}\\1[^>]*>[ \\t]*\\r?\\n?`, 'gi')
    : new RegExp(`[ \\t]*<meta\\b[^>]*?\\s${attr}\\s*=\\s*(["'])${escapeRegex(key)}\\1[^>]*>[ \\t]*\\r?\\n?`, 'gi'),
);

const VIEWPORT_PATTERN = /<meta\b[^>]*?\sname\s*=\s*(["'])viewport\1[^>]*>/i;
const HEAD_OPEN_PATTERN = /<head\b[^>]*>/i;

/**
 * Removes the generic title/description/Open Graph/Twitter/canonical tags from the template's
 * <head> and writes the article's block in their place (right after the viewport tag, so the
 * tags sit near the top where crawlers that only read the first few KB will find them).
 * Replacer functions are used throughout so "$" in article text can never act as a pattern.
 */
export function injectArticleHead(template, seo) {
  const headEnd = template.search(/<\/head>/i);
  if (headEnd === -1) throw new Error('Template has no </head>');

  let head = template.slice(0, headEnd);
  const rest = template.slice(headEnd);

  head = head.replace(TITLE_PATTERN, () => '');
  for (const pattern of MANAGED_PATTERNS) head = head.replace(pattern, () => '');

  const block = renderHeadBlock(seo);
  const anchor = head.match(VIEWPORT_PATTERN) || head.match(HEAD_OPEN_PATTERN);
  if (!anchor) throw new Error('Template has no <head> to inject into');

  const insertAt = anchor.index + anchor[0].length;
  return `${head.slice(0, insertAt)}\n${block}${head.slice(insertAt)}${rest}`;
}

/* ------------------------------------------------------------------ */
/*  Request helpers                                                    */
/* ------------------------------------------------------------------ */
/** Reads the slug from the rewrite's query string. Returns null when it cannot be a real slug. */
function readSlug(req) {
  let raw = req.query?.slug;
  if (Array.isArray(raw)) raw = raw[0];
  if (typeof raw !== 'string') return { missing: true, slug: null };

  let slug = raw.trim();
  if (/%[0-9a-f]{2}/i.test(slug)) {
    try {
      slug = decodeURIComponent(slug);
    } catch {
      return { missing: false, slug: null };
    }
  }
  if (!slug) return { missing: true, slug: null };
  // eslint-disable-next-line no-control-regex
  if (slug.length > MAX_SLUG_LENGTH || /[\u0000-\u001f\u007f]/.test(slug)) return { missing: false, slug: null };
  return { missing: false, slug };
}

/** Fetches one published article. Resolves to the document or null; throws on any Sanity/network problem. */
async function fetchArticle(sanity, key) {
  const version = sanity.apiVersion.replace(/^v/, '');
  const url = new URL(`https://${sanity.projectId}.api.sanity.io/v${version}/data/query/${sanity.dataset}`);
  url.searchParams.set('query', ARTICLE_SEO_QUERY);
  url.searchParams.set('$key', JSON.stringify(key));
  url.searchParams.set('perspective', 'published');

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(SANITY_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Sanity responded with HTTP ${response.status}`);

  const body = await response.json();
  if (!body || !('result' in body)) throw new Error('Sanity response had no result field');
  return body.result ?? null;
}

function send(res, status, html, { cache, state }) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Elm-Seo', state); // diagnostic only: injected | not-found | fallback-*
  res.end(html);
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.end();
    return;
  }

  let template;
  try {
    template = await loadTemplate();
  } catch (error) {
    // The deployment is missing its own index.html (vercel.json includeFiles not applied). There is
    // nothing safe to serve, so fail loudly instead of guessing; the preview test catches this.
    console.error('[global-insight] built index.html is unavailable:', error?.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', CACHE_NONE);
    res.setHeader('X-Elm-Seo', 'fallback-no-template');
    res.end('Service temporarily unavailable.');
    return;
  }

  const { missing, slug } = readSlug(req);

  // No slug at all (e.g. someone opened /api/global-insight directly): just the normal app.
  if (missing) return send(res, 200, template, { cache: CACHE_NONE, state: 'fallback-no-slug' });

  // A value that can never be a slug cannot be a published article.
  if (!slug) return send(res, 404, template, { cache: CACHE_NOT_FOUND, state: 'not-found' });

  try {
    const { config: sanity, problems } = readSanityConfig(process.env);
    if (!sanity) throw new Error(`Sanity settings missing: ${problems.map((p) => p.key).join(', ')}`);

    const article = await fetchArticle(sanity, slug);
    const seo = article ? buildArticleSeo(article, slug) : null;

    // No published document, or one without a usable title (the reader treats it as not found too).
    if (!seo) return send(res, 404, template, { cache: CACHE_NOT_FOUND, state: 'not-found' });

    return send(res, 200, injectArticleHead(template, seo), { cache: CACHE_OK, state: 'injected' });
  } catch (error) {
    // Temporary problem (Sanity down/slow, bad settings, unexpected data): serve the normal app so
    // the page still works for people, and do not let any cache remember the miss.
    console.error('[global-insight] metadata unavailable, serving the plain app:', error?.message);
    return send(res, 200, template, { cache: CACHE_NONE, state: 'fallback-error' });
  }
}
