import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
import { finalizeEvent } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    const { finalWallImageUrl, chosenLayoutId } = await request.json();
    if (!(await isOwner(undefined, params.id))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    if (typeof finalWallImageUrl !== 'string' || !finalWallImageUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'A saved artwork image is required.' }, { status: 400 });
    }

    const event = await finalizeEvent(params.id, finalWallImageUrl, chosenLayoutId);
    return NextResponse.json({ event, ok: true });
  } catch (err) {
    console.error('Error finalizing event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}