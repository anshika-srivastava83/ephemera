import { NextResponse } from 'next/server';
import { isOwnerOrCollaborator } from '../../../../../lib/auth';
import { getPendingSubmissions } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    if (!(await isOwnerOrCollaborator(undefined, params.id))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const submissions = await getPendingSubmissions(params.id);
    return NextResponse.json({ submissions });
  } catch (err) {
    console.error('Error fetching pending submissions:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}