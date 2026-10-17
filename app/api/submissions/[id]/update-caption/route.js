import { NextResponse } from 'next/server';
import { isOwnerOrCollaborator } from '../../../../../lib/auth';
import { updateSubmissionCaption } from '../../../../../lib/dataService';
import { captionUpdateSchema, formatZodErrors } from '../../../../../lib/validation';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const result = captionUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid caption update data', fieldErrors: formatZodErrors(result.error) },
        { status: 400 }
      );
    }

    const { caption, polaroidUrl } = result.data;
    if (!(await isOwnerOrCollaborator())) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const submission = await updateSubmissionCaption(params.id, caption || '', polaroidUrl);
    return NextResponse.json({ submission, ok: true });
  } catch (err) {
    console.error('Error updating caption:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}