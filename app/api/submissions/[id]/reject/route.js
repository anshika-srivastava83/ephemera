import { NextResponse } from 'next/server';
import { isOwnerOrCollaborator } from '../../../../../lib/auth';
import { updateSubmissionStatus, getEventIdBySubmissionId } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    let password;
    try {
      const body = await request.json();
      password = body?.password;
    } catch {}

    const eventId = await getEventIdBySubmissionId(params.id);
    if (!(await isOwnerOrCollaborator(password, eventId))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }


    const submission = await updateSubmissionStatus(params.id, 'rejected');
    return NextResponse.json({ submission, ok: true });
  } catch (err) {
    console.error('Error rejecting submission:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}