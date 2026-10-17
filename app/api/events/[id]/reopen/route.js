import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
import { reopenEvent } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    let password;
    try {
      const body = await request.json();
      password = body?.password;
    } catch {}

    if (!(await isOwner(password))) {
      return NextResponse.json(
        { error: 'Only event owners can reopen events.' },
        { status: 403 }
      );
    }


    const event = await reopenEvent(params.id);
    return NextResponse.json({ event, ok: true });
  } catch (err) {
    console.error('Error reopening event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}