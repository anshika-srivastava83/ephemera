import { NextResponse } from 'next/server';
import { isOwnerOrCollaborator } from '../../../../../lib/auth';
import { setEventLayout } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    const { chosenLayoutId } = await request.json();
    if (!(await isOwnerOrCollaborator())) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const event = await setEventLayout(params.id, chosenLayoutId);
    return NextResponse.json({ event, ok: true });
  } catch (err) {
    console.error('Error setting event style:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}