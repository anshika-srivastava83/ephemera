import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseClient';
import { isOwner } from '../../../../../lib/auth';

// Records the exported wall image + which of the 12 styles she picked.
// Does NOT delete anything -- that's a separate /dispose call.
export async function POST(request, { params }) {
  const { ownerPassword, finalWallImageUrl, chosenLayoutId } = await request.json();
  if (!isOwner(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin()
    .from('events')
    .update({
      status: 'finalized',
      final_wall_image_url: finalWallImageUrl,
      chosen_layout_id: chosenLayoutId,
    })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}