import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { getEventById } from '../../../lib/dataService';
import { isUuid } from '../../../lib/storage';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB hard ceiling (browser pre-shrinks photos)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Client-upload token endpoint for Vercel Blob. The browser uploads straight
 * to Blob storage, so photos never pass through (or get limited by) this
 * serverless function. We only decide *whether* an upload may happen.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Uploads must live under <eventId>/ and the event must exist.
        const [eventId, ...rest] = pathname.split('/');
        if (!isUuid(eventId) || rest.length !== 1 || !/^[a-zA-Z0-9_-]{1,60}\.(jpg|png)$/.test(rest[0])) {
          throw new Error('Invalid upload path');
        }
        const event = await getEventById(eventId);
        if (!event) throw new Error('Event not found');

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true, // never overwrite another guest's photo
          tokenPayload: JSON.stringify({ eventId }),
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do: the submission record is created by /api/submissions.
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    console.error('Upload token error:', error.message);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 400 });
  }
}
