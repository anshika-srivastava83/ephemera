import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseClient';
import { isOwner } from '../../../../../lib/auth';

export async function POST(request, { params }) {
  const { ownerPassword } = await request.json();
  if (!isOwner(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin()
    .from('events')
    .update({ status: 'closed' })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}