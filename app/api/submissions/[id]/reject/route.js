import { NextResponse } from 'next/server';
import { isOwnerOrCollaborator } from '../../../../../lib/auth';
import { updateSubmissionStatus } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    let password;
    try {
      const body = await request.json();
      password = body?.password;
    } catch {}

    if (!(await isOwnerOrCollaborator(password))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }


    const submission = await updateSubmissionStatus(params.id, 'rejected');
    return NextResponse.json({ submission, ok: true });
  } catch (err) {
    console.error('Error rejecting submission:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}