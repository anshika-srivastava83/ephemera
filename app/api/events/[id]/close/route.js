import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
import { closeEvent } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const event = await closeEvent(params.id);
    return NextResponse.json({ event, ok: true });
  } catch (err) {
    console.error('Error closing event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}