'use client';

import { upload } from '@vercel/blob/client';

const MAX_DIMENSION = 1600; // plenty for a screen/projector wall and a 440pt polaroid
const JPEG_QUALITY = 0.82;
const SKIP_BELOW_BYTES = 1024 * 1024; // already small enough: upload as-is

// Downscales large photos in the browser. Phone photos are often 5-12MB, and
// shrinking them here keeps uploads fast on cellular and cuts storage costs.
// PNGs (Polaroid composites, master tapestries) are uploaded untouched.
async function shrinkPhoto(file) {
  if (!file.type || file.type === 'image/png' || !file.type.startsWith('image/')) return file;
  if (typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < SKIP_BELOW_BYTES) {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // unsupported format (e.g. HEIC): let the server-side checks decide
  }
}

/**
 * Uploads an image straight from the browser to Vercel Blob (bypassing the
 * 4.5MB serverless request-body limit). Returns the public https URL.
 */
export async function uploadImage(fileOrBlob, filename, folder) {
  const prepared = await shrinkPhoto(fileOrBlob);
  const isPng = prepared.type === 'image/png';
  const base =
    (filename || 'photo').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'snap';
  const pathname = `${folder}/${base}.${isPng ? 'png' : 'jpg'}`;

  const blob = await upload(pathname, prepared, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    contentType: isPng ? 'image/png' : prepared.type || 'image/jpeg',
    multipart: prepared.size > 8 * 1024 * 1024,
  });
  return blob.url;
}
