import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseClient';
import { isOwner } from '../../../../../lib/auth';

// POST /api/events/[id]/all-submissions  { ownerPassword }
// Returns every submission for the event regardless of status, for the
// owner's post-event gallery/archive view.
export async function POST(request, { params }) {
  const { ownerPassword } = await request.json();
  if (!isOwner(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from('submissions')
    .select('id, photo_url, polaroid_url, caption, status, reuse_consent, created_at')
    .eq('event_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data });
}