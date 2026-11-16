/**
 * The only file in the Content Center that imports Sanity APIs marked `@internal`.
 *
 * Sanity 6.23 offers no public, draft-aware equivalent of these hooks. They are the same ones the
 * Studio's own Publish, Unpublish and Delete actions use, so they are stable in practice, but
 * Sanity does not promise to keep them across releases. Keeping every import here means a future
 * Sanity change breaks one file (and `npm run typecheck` will say so) instead of many.
 *
 * Maintainable alternative if they ever change: the Actions API through the public client
 * (`client.action({actionType: 'sanity.action.document.publish' | '...unpublish' | '...delete'})`),
 * which the server authorises, plus the public `validateDocument` before publishing.
 */
export {
  useDocumentOperation,
  useDocumentOperationEvent,
  useDocumentPairPermissions,
  useValidationStatus,
} from 'sanity'
