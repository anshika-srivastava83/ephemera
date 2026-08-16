import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseClient';
import { isOwner } from '../../../../../lib/auth';

// Separate owner-only action to delete the final wall image whenever she decides.
export async function POST(request, { params }) {
  const { ownerPassword } = await request.json();
  if (!isOwner(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin()
    .from('events')
    .update({ final_wall_image_url: null })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}