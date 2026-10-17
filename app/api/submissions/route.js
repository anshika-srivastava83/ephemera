import { NextResponse } from 'next/server';
import { hashPhone } from '../../../lib/hashPhone';
import { sendGuestLink } from '../../../lib/sendEmail';
import {
  getSubmissionByPhone,
  createOrUpdateSubmission,
  getEventById,
} from '../../../lib/dataService';
import { submissionSchema, formatZodErrors } from '../../../lib/validation';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const phone = searchParams.get('phone');
    if (!eventId || !phone) {
      return NextResponse.json({ error: 'eventId and phone are required' }, { status: 400 });
    }

    const phone_hash = hashPhone(phone);
    const result = await getSubmissionByPhone(eventId, phone_hash);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Error fetching submission:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Server-side Zod validation
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Please correct the highlighted errors.',
          fieldErrors: formatZodErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    const { eventId, phone, caption, photoUrl, polaroidUrl, reuseConsent, email } = parsed.data;

    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (event.status !== 'open') {
      return NextResponse.json({ error: 'This event is no longer accepting photos' }, { status: 403 });
    }

    const phone_hash = hashPhone(phone);
    const { submission, accessToken } = await createOrUpdateSubmission({
      eventId,
      phoneHash: phone_hash,
      caption: caption || '',
      photoUrl,
      polaroidUrl,
      reuseConsent: !!reuseConsent,
      email: email ? email.trim() : undefined,
    });

    let emailSent = false;
    if (accessToken && email) {
      try {
        const origin = new URL(request.url).origin;
        const link = `${origin}/event/${eventId}/me?token=${accessToken}`;
        await sendGuestLink({ to: email.trim(), link, eventName: event.name });
        emailSent = true;
      } catch (e) {
        console.warn('Optional email send skipped:', e.message);
      }
    }

    return NextResponse.json({ submission, emailSent, success: true });
  } catch (err) {
    console.error('Error saving submission:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}