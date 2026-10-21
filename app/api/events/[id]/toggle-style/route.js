import { NextResponse } from 'next/server';
import { toggleEventLayout } from '../../../../../lib/dataService';
import { isOwner } from '../../../../../lib/auth';

// POST /api/events/[id]/toggle-style  { styleId }
export async function POST(request, { params }) {
  try {
    const { styleId } = await request.json();
    if (!(await isOwner(undefined, params.id))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const updated = await toggleEventLayout(params.id, styleId);
    return NextResponse.json({ chosenLayoutIds: updated });
  } catch (err) {
    console.error('Error toggling event layout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}