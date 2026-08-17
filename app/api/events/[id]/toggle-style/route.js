import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseClient';
import { isOwner } from '../../../../../lib/auth';

// POST /api/events/[id]/toggle-style  { ownerPassword, styleId }
export async function POST(request, { params }) {
  const { ownerPassword, styleId } = await request.json();
  if (!isOwner(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: event, error: fetchError } = await db
    .from('events')
    .select('chosen_layout_ids')
    .eq('id', params.id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const current = event.chosen_layout_ids || [];
  const updated = current.includes(styleId)
    ? current.filter((id) => id !== styleId)
    : [...current, styleId];

  const { error } = await db
    .from('events')
    .update({ chosen_layout_ids: updated })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chosenLayoutIds: updated });
}