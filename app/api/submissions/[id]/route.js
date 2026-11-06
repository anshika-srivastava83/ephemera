import { NextResponse } from 'next/server';
import { isOwner } from '../../../../lib/auth';
import { deleteSubmission, getEventIdBySubmissionId } from '../../../../lib/dataService';

export async function DELETE(request, { params }) {
  try {
    let password;
    try {
      const body = await request.json();
      password = body?.password;
    } catch {
      // no body sent with DELETE
    }

    const eventId = await getEventIdBySubmissionId(params.id);
    if (!(await isOwner(password, eventId))) {
      return NextResponse.json(
        { error: 'Only event owners can delete photographs.' },
        { status: 403 }
      );
    }

    const result = await deleteSubmission(params.id);
    return NextResponse.json({ ok: true, deleted: true, files: result.files });
  } catch (err) {
    console.error('Error deleting submission:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}