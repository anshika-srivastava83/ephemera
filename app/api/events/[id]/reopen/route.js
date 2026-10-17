import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
import { reopenEvent } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const event = await reopenEvent(params.id);
    return NextResponse.json({ event, ok: true });
  } catch (err) {
    console.error('Error reopening event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}