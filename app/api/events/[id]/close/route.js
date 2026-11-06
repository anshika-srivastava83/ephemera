import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
import { closeEvent } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    let password;
    try {
      const body = await request.json();
      password = body?.password;
    } catch {}

    if (!(await isOwner(password, params.id))) {
      return NextResponse.json(
        { error: 'Only event owners can close events.' },
        { status: 403 }
      );
    }


    const event = await closeEvent(params.id);
    return NextResponse.json({ event, ok: true });
  } catch (err) {
    console.error('Error closing event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}