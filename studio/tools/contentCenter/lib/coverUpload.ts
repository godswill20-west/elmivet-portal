import type {SanityClient} from 'sanity'

import {COVER_ASSET_REF_PATTERN} from './articles'

/** Raised when the image could not be uploaded to Sanity's asset store. Nothing was saved. */
export class CoverUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CoverUploadError'
  }
}

function describeUploadError(error: unknown): string {
  const statusCode = (error as {statusCode?: number} | null)?.statusCode
  if (statusCode === 401 || statusCode === 403) {
    return 'you do not have permission to upload images.'
  }
  if (statusCode === 413) return 'the image is too large for Sanity to accept.'
  const message = error instanceof Error ? error.message : ''
  return message || 'check your connection and try again.'
}

/**
 * Uploads the selected File to Sanity's image asset store with the Studio's own authenticated
 * client (the signed-in user's session and permissions; no token is involved) and returns the
 * real asset id Sanity assigned (`image-<hash>-<width>x<height>-<ext>`). That id is the `_ref` of
 * `coverImage.asset`. Throws CoverUploadError on failure; the asset is never deleted by this app.
 */
export async function uploadCoverImage(client: SanityClient, file: File): Promise<string> {
  let assetId: unknown
  try {
    const asset = await client.assets.upload('image', file, {
      filename: file.name,
      contentType: file.type || undefined,
    })
    assetId = asset?._id
  } catch (caught) {
    console.error('[Content Center] Uploading the cover image failed.', caught)
    throw new CoverUploadError(describeUploadError(caught))
  }
  if (typeof assetId !== 'string' || !COVER_ASSET_REF_PATTERN.test(assetId)) {
    throw new CoverUploadError('Sanity returned an unexpected response for the upload.')
  }
  return assetId
}
