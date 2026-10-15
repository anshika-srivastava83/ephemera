import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'This link is incomplete.' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: contact } = await db
    .from('submission_contacts')
    .select('submission_id')
    .eq('access_token', token)
    .maybeSingle();
  if (!contact) return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 });

  const { data: submission, error } = await db
    .from('submissions')
    .select('id, event_id, caption, photo_url, polaroid_url, status, events(name, status)')
    .eq('id', contact.submission_id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ submission });
}