import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseClient';
import { isOwnerOrCollaborator } from '../../../../../lib/auth';

// POST { ownerPassword, caption, polaroidUrl }
// polaroidUrl is the freshly re-composited image (already uploaded by the
// client using the existing compositePolaroid() function).
export async function POST(request, { params }) {
  const { ownerPassword, caption, polaroidUrl } = await request.json();
  if (!isOwnerOrCollaborator(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  if (caption.length > 120) {
    return NextResponse.json({ error: 'Caption is too long' }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from('submissions')
    .update({ caption, polaroid_url: polaroidUrl, updated_at: new Date().toISOString() })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}