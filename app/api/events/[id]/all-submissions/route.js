import { NextResponse } from 'next/server';
import { isOwnerOrCollaborator } from '../../../../../lib/auth';
import { getAllSubmissions } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    if (!(await isOwnerOrCollaborator(undefined, params.id))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const submissions = await getAllSubmissions(params.id);
    return NextResponse.json({ submissions });
  } catch (err) {
    console.error('Error fetching all submissions:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}