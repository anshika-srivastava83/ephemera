import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';
import { isOwnerOrCollaborator } from '../../../../lib/auth';

// PATCH /api/submissions/[id]  { caption, polaroidUrl, ownerPassword }
// Updates a submission's caption and its re-composited polaroid image.
// The raw photo_url is never touched.
export async function PATCH(request, { params }) {
  const { caption, polaroidUrl, ownerPassword } = await request.json();

  if (!isOwnerOrCollaborator(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  if (caption === undefined || !polaroidUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (caption.length > 120) {
    return NextResponse.json({ error: 'Caption is too long' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from('submissions')
    .update({ caption, polaroid_url: polaroidUrl, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submission: data });
}