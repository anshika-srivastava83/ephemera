import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
import { deleteEvent } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const result = await deleteEvent(params.id);
    return NextResponse.json({ ok: true, deleted: true, files: result.files });
  } catch (err) {
    console.error('Error deleting event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}