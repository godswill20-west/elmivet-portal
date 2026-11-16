/**
 * Single source of truth for article categories.
 * Plain JavaScript so the JS schemas and the TypeScript Studio tool can both import it
 * (the tool needs `allowJs` in studio/tsconfig.json, added in Step 2).
 */
export const ARTICLE_CATEGORIES = /** @type {const} */ ([
  'Regulatory Notice',
  'Port Operations',
  'Global Logistics',
  'Guangdong Hub',
])

/** @typedef {(typeof ARTICLE_CATEGORIES)[number]} ArticleCategory */