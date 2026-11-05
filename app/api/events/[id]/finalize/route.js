import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
import { finalizeEvent, getEventSubmissionEmails } from '../../../../../lib/dataService';
import { sendWallFinalizedEmail } from '../../../../../lib/sendEmail';
import { isEventUpload } from '../../../../../lib/storage';

// Serverless functions are frozen once the response is sent, so the guest
// emails are sent before responding. Allow time for large guest lists.
export const maxDuration = 60;
const EMAIL_CONCURRENCY = 5;

export async function POST(request, { params }) {
  try {
    const { finalWallImageUrl, chosenLayoutId } = await request.json();
    if (!(await isOwner(undefined, params.id))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    if (!isEventUpload(finalWallImageUrl, params.id)) {
      return NextResponse.json({ error: 'A saved artwork image is required.' }, { status: 400 });
    }

    const event = await finalizeEvent(params.id, finalWallImageUrl, chosenLayoutId);

    let emailsSent = 0;
    let emailsFailed = 0;
    if (event) {
      try {
        const guests = (await getEventSubmissionEmails(params.id)).filter((g) => g.email);
        const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        const wallUrl = `${origin}/wall/${params.id}`;
        const queue = [...guests];
        const worker = async () => {
          while (queue.length) {
            const guest = queue.shift();
            try {
              const r = await sendWallFinalizedEmail({
                to: guest.email,
                eventName: event.name,
                eventId: params.id,
                wallUrl,
                finalImageUrl: finalWallImageUrl,
                polaroidUrl: guest.polaroid_url,
                photoUrl: guest.photo_url,
              });
              if (r.sent) emailsSent += 1;
            } catch (err) {
              emailsFailed += 1;
              console.warn('[Final Wall Email] Failed for a guest:', err.message);
            }
          }
        };
        await Promise.all(Array.from({ length: EMAIL_CONCURRENCY }, worker));
      } catch (err) {
        console.warn('[Final Wall Email] Failed fetching guests:', err.message);
      }
    }

    return NextResponse.json({ event, ok: true, emailsSent, emailsFailed });
  } catch (err) {
    console.error('Error finalizing event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}