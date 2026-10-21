import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
import { finalizeEvent, getEventSubmissionEmails } from '../../../../../lib/dataService';
import { sendWallFinalizedEmail } from '../../../../../lib/sendEmail';

export async function POST(request, { params }) {
  try {
    const { finalWallImageUrl, chosenLayoutId } = await request.json();
    if (!(await isOwner(undefined, params.id))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    if (typeof finalWallImageUrl !== 'string' || !finalWallImageUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'A saved artwork image is required.' }, { status: 400 });
    }

    const event = await finalizeEvent(params.id, finalWallImageUrl, chosenLayoutId);

    // Asynchronously email the final tapestry wall to all guests who submitted photos
    if (event) {
      getEventSubmissionEmails(params.id)
        .then(async (guests) => {
          const origin = new URL(request.url).origin;
          const wallUrl = `${origin}/wall/${params.id}`;
          for (const guest of guests) {
            if (!guest.email) continue;
            try {
              await sendWallFinalizedEmail({
                to: guest.email,
                eventName: event.name,
                eventId: params.id,
                wallUrl,
                finalImageUrl,
                polaroidUrl: guest.polaroid_url,
                photoUrl: guest.photo_url,
              });
            } catch (err) {
              console.warn(`[Final Wall Email] Error sending to ${guest.email}:`, err.message);
            }
          }
        })
        .catch((err) => {
          console.warn('[Final Wall Email] Failed fetching guests:', err.message);
        });
    }

    return NextResponse.json({ event, ok: true });
  } catch (err) {
    console.error('Error finalizing event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}