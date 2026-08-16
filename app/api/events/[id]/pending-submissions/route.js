import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseClient';
import { isOwnerOrCollaborator } from '../../../../../lib/auth';

export async function POST(request, { params }) {
  const { ownerPassword } = await request.json();
  if (!isOwnerOrCollaborator(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from('submissions')
    .select('id, polaroid_url, caption, reuse_consent')
    .eq('event_id', params.id)
    .eq('status', 'pending');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data });
}