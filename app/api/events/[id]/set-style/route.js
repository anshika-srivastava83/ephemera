import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseClient';
import { isOwnerOrCollaborator } from '../../../../../lib/auth';

// POST /api/events/[id]/set-style  { ownerPassword, chosenLayoutId }
export async function POST(request, { params }) {
  const { ownerPassword, chosenLayoutId } = await request.json();
  if (!isOwnerOrCollaborator(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin()
    .from('events')
    .update({ chosen_layout_id: chosenLayoutId })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}