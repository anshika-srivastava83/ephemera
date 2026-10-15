import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { hashPhone } from '../../../lib/hashPhone';
import { sendGuestLink } from '../../../lib/sendEmail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/submissions?eventId=...&phone=...
// Used by the submit page to check "have I already submitted?" and show
// the existing photo/caption with replace-or-cancel options.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  const phone = searchParams.get('phone');
  if (!eventId || !phone) {
    return NextResponse.json({ error: 'eventId and phone are required' }, { status: 400 });
  }

  const phone_hash = hashPhone(phone);
  const { data, error } = await supabaseAdmin()
    .from('submissions')
    .select('id, caption, photo_url, polaroid_url, status')
    .eq('event_id', eventId)
    .eq('phone_hash', phone_hash)
    .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let hasEmail = false;
  if (data) {
    const { data: contact } = await supabaseAdmin()
      .from('submission_contacts')
      .select('submission_id')
      .eq('submission_id', data.id)
      .maybeSingle();
    hasEmail = !!contact;
  }
  return NextResponse.json({ existing: data || null, hasEmail });
}

// POST /api/submissions  { eventId, phone, caption, photoUrl, polaroidUrl, reuseConsent }
// Creates a new submission, or replaces the existing one for that phone
// number. Always goes back to 'pending' so it re-enters the moderation queue.
export async function POST(request) {
  const { eventId, phone, caption, photoUrl, polaroidUrl, reuseConsent, email } = await request.json();

  if (!eventId || !phone || !photoUrl || !polaroidUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (caption.length > 120) {
    return NextResponse.json({ error: 'Caption is too long' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: event, error: eventError } = await db
    .from('events')
    .select('name, status, max_submissions')
    .eq('id', eventId)
    .single();
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
  if (event.status !== 'open') {
    return NextResponse.json({ error: 'This event is no longer accepting photos' }, { status: 403 });
  }

  const phone_hash = hashPhone(phone);

  // Only block brand-new submissions once the cap is hit -- someone
  // replacing their own existing photo should never be blocked by this.
  const { data: existingSubmission } = await db
    .from('submissions')
    .select('id')
    .eq('event_id', eventId)
    .eq('phone_hash', phone_hash)
    .maybeSingle();

  if (!existingSubmission) {
    const { count, error: countError } = await db
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

    if (count >= (event.max_submissions || 500)) {
      return NextResponse.json(
        { error: 'This event has reached its submission limit' },
        { status: 403 }
      );
    }
  }

    let hasContact = false;
  if (existingSubmission) {
    const { data: contact } = await db
      .from('submission_contacts')
      .select('submission_id')
      .eq('submission_id', existingSubmission.id)
      .maybeSingle();
    hasContact = !!contact;
  }
  const emailOk = typeof email === 'string' && EMAIL_RE.test(email.trim());
  if (!hasContact && !emailOk) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  const { data, error } = await db
    .from('submissions')
    .upsert(
      {
        event_id: eventId,
        phone_hash,
        caption,
        photo_url: photoUrl,
        polaroid_url: polaroidUrl,
        reuse_consent: !!reuseConsent,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,phone_hash' }
    )
    .select()
    .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let emailSent = false;
  if (!hasContact && emailOk) {
    const { data: contact, error: contactError } = await db
      .from('submission_contacts')
      .upsert({ submission_id: data.id, email: email.trim() }, { onConflict: 'submission_id' })
      .select('access_token')
      .single();
    if (!contactError && contact) {
      try {
        const link = `${new URL(request.url).origin}/event/${eventId}/me?token=${contact.access_token}`;
        await sendGuestLink({ to: email.trim(), link, eventName: event.name });
        emailSent = true;
      } catch (e) {
        console.error('Email send failed:', e);
      }
    }
  }
  return NextResponse.json({ submission: data, emailSent });
}