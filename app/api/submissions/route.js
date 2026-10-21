import { NextResponse } from 'next/server';
import { hashPhone, hashEmail } from '../../../lib/hashPhone';
import { sendGuestLink } from '../../../lib/sendEmail';
import {
  getSubmissionByPhone,
  getSubmissionByEmail,
  getSubmissionByToken,
  createOrUpdateSubmission,
  getEventById,
} from '../../../lib/dataService';
import { submissionSchema, formatZodErrors } from '../../../lib/validation';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const token = searchParams.get('token');

    if (!eventId && !token) {
      return NextResponse.json({ error: 'eventId or token is required' }, { status: 400 });
    }

    if (token) {
      const submission = await getSubmissionByToken(token);
      return NextResponse.json({
        existing: submission,
        hasEmail: !!submission?.email,
        email: submission?.email,
        accessToken: token,
      });
    }

    if (email) {
      const result = await getSubmissionByEmail(eventId, email);
      return NextResponse.json(result);
    }

    if (phone) {
      const phone_hash = hashPhone(phone);
      const result = await getSubmissionByPhone(eventId, phone_hash);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'email or phone is required' }, { status: 400 });
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

    const { eventId, email, phone, caption, photoUrl, polaroidUrl, reuseConsent } = parsed.data;

    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (event.status !== 'open') {
      return NextResponse.json({ error: 'This event is no longer accepting photos' }, { status: 403 });
    }

    // Hash email (primary) or fallback to phone
    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const identifierHash = normalizedEmail ? hashEmail(normalizedEmail) : hashPhone(phone || '');

    const { submission, accessToken } = await createOrUpdateSubmission({
      eventId,
      phoneHash: identifierHash,
      caption: caption || '',
      photoUrl,
      polaroidUrl,
      reuseConsent: !!reuseConsent,
      email: normalizedEmail || undefined,
    });

    let emailSent = false;
    let emailError = null;

    if (normalizedEmail) {
      try {
        const origin = new URL(request.url).origin;
        const link = accessToken
          ? `${origin}/event/${eventId}/me?token=${accessToken}`
          : `${origin}/event/${eventId}/me`;
        const wallLink = `${origin}/wall/${eventId}`;

        const emailResult = await sendGuestLink({
          to: normalizedEmail,
          link,
          wallLink,
          eventName: event.name,
          eventId,
          polaroidUrl,
          photoUrl,
          wallImageUrl: event.final_wall_image_url || null,
          isEdit: body.isEdit || false,
        });
        emailSent = !!emailResult?.sent;
      } catch (e) {
        console.warn('Optional email send skipped:', e.message);
        emailError = e.message;
      }
    }

    return NextResponse.json({
      submission,
      accessToken,
      emailSent,
      emailError,
      success: true,
    });
  } catch (err) {
    console.error('Error saving submission:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}