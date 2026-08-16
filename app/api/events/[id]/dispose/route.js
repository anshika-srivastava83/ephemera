import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseClient';
import { isOwner } from '../../../../../lib/auth';

// The "dispose the photos" button: deletes every submission row, leaving
// only the event's final_wall_image_url intact.
export async function POST(request, { params }) {
  const { ownerPassword } = await request.json();
  if (!isOwner(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: event, error: eventError } = await db
    .from('events')
    .select('final_wall_image_url')
    .eq('id', params.id)
    .single();
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
  if (!event.final_wall_image_url) {
    return NextResponse.json(
      { error: 'Finalize the event and export the wall image before disposing photos' },
      { status: 400 }
    );
  }

  const { error } = await db.from('submissions').delete().eq('event_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}