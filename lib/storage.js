import { unlink, rm, readdir } from 'fs/promises';
import path from 'path';

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads');

// Maps a public URL like /uploads/<folder>/<file> to a path inside the uploads
// directory, or null for anything else (external URLs, traversal attempts).
function resolveUploadPath(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return null;
  const abs = path.resolve(UPLOADS_ROOT, url.slice('/uploads/'.length));
  return abs.startsWith(UPLOADS_ROOT + path.sep) ? abs : null;
}

/**
 * Deletes uploaded files for the given URLs. Reports exactly what happened so
 * callers never claim a purge that didn't occur:
 *   removed  – files deleted (or already gone)
 *   failed   – files that exist but could not be deleted
 *   external – URLs not stored by this server (nothing to delete here)
 */
export async function removeUploadedFiles(urls) {
  const result = { removed: 0, failed: 0, external: 0 };
  const unique = [...new Set((urls || []).filter(Boolean))];
  for (const url of unique) {
    const abs = resolveUploadPath(url);
    if (!abs) {
      result.external += 1;
      continue;
    }
    try {
      await unlink(abs);
      result.removed += 1;
    } catch (err) {
      if (err.code === 'ENOENT') result.removed += 1;
      else {
        console.error('Failed to delete upload', url, err.message);
        result.failed += 1;
      }
    }
  }
  return result;
}

// Removes an event's upload folder if it is empty afterwards.
export async function removeEventFolderIfEmpty(eventId) {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return;
  const dir = path.join(UPLOADS_ROOT, eventId);
  try {
    if ((await readdir(dir)).length === 0) await rm(dir, { recursive: true });
  } catch {
    // folder missing or not removable: nothing else to do
  }
}
