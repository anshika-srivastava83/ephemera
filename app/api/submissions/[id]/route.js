import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';
import { isOwner, isOwnerOrCollaborator } from '../../../../lib/auth';

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

// DELETE /api/submissions/[id]  { ownerPassword }
// Permanently deletes one submission: both storage files (raw + polaroid)
// and the database row. Owner-only.
function pathFromUrl(url) {
  const marker = '/photos/';
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

export async function DELETE(request, { params }) {
  const { ownerPassword } = await request.json();
  if (!isOwner(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: submission, error: fetchError } = await db
    .from('submissions')
    .select('photo_url, polaroid_url')
    .eq('id', params.id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const paths = [submission.photo_url, submission.polaroid_url].map(pathFromUrl).filter(Boolean);
  if (paths.length) {
    await db.storage.from('photos').remove(paths);
  }

  const { error: deleteError } = await db.from('submissions').delete().eq('id', params.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}