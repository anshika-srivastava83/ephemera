import { NextResponse } from 'next/server';
import { isOwnerOrCollaborator } from '../../../../lib/auth';
import { deleteSubmission } from '../../../../lib/dataService';

export async function DELETE(request, { params }) {
  try {
    if (!(await isOwnerOrCollaborator())) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const result = await deleteSubmission(params.id);
    return NextResponse.json({ ok: true, deleted: true, files: result.files });
  } catch (err) {
    console.error('Error deleting submission:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}