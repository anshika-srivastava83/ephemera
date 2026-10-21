import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
import { setEventLayout } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { chosenLayoutId, password } = body;
    if (!(await isOwner(password, params.id))) {
      return NextResponse.json(
        { error: 'Only event owners can change the wall style.' },
        { status: 403 }
      );
    }

    const event = await setEventLayout(params.id, chosenLayoutId);
    return NextResponse.json({ event, ok: true });
  } catch (err) {
    console.error('Error setting event style:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}