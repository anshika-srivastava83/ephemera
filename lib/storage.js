import { del } from '@vercel/blob';

const BLOB_HOST_SUFFIX = '.blob.vercel-storage.com';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** True for https URLs served from this project's Vercel Blob store. */
export function isBlobUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/** True when the URL is a Blob upload stored under `<eventId>/…`. */
export function isEventUpload(url, eventId) {
  if (!isBlobUrl(url) || !isUuid(eventId)) return false;
  return decodeURIComponent(new URL(url).pathname).startsWith(`/${eventId}/`);
}

/**
 * Deletes uploaded files from Vercel Blob. Reports exactly what happened so
 * callers never claim a purge that didn't occur:
 *   removed  – blobs deleted (deleting a missing blob is a no-op)
 *   failed   – blobs that could not be deleted
 *   external – URLs not stored in our Blob store (e.g. demo photos)
 */
export async function removeUploadedFiles(urls) {
  const result = { removed: 0, failed: 0, external: 0 };
  const unique = [...new Set((urls || []).filter(Boolean))];
  const blobUrls = [];
  for (const url of unique) {
    if (isBlobUrl(url)) blobUrls.push(url);
    else result.external += 1;
  }

  // Delete in chunks so one bad batch doesn't hide the rest
  for (let i = 0; i < blobUrls.length; i += 100) {
    const chunk = blobUrls.slice(i, i + 100);
    try {
      await del(chunk);
      result.removed += chunk.length;
    } catch (err) {
      console.error('Failed to delete blobs', err.message);
      result.failed += chunk.length;
    }
  }
  return result;
}
