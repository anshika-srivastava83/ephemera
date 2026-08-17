import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { hashPhone } from '../../../lib/hashPhone';

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
  return NextResponse.json({ existing: data || null });
}

// POST /api/submissions  { eventId, phone, caption, photoUrl, polaroidUrl, reuseConsent }
// Creates a new submission, or replaces the existing one for that phone
// number. Always goes back to 'pending' so it re-enters the moderation queue.
export async function POST(request) {
  const { eventId, phone, caption, photoUrl, polaroidUrl, reuseConsent } = await request.json();

  if (!eventId || !phone || !caption || !photoUrl || !polaroidUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (caption.length > 120) {
    return NextResponse.json({ error: 'Caption is too long' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: event, error: eventError } = await db
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single();
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
  if (event.status !== 'open') {
    return NextResponse.json({ error: 'This event is no longer accepting photos' }, { status: 403 });
  }

  const phone_hash = hashPhone(phone);

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
  return NextResponse.json({ submission: data });
}