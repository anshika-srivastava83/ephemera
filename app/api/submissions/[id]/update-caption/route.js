import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
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
    if (!(await isOwner(body?.password))) {
      return NextResponse.json(
        { error: 'Only event owners can edit captions.' },
        { status: 403 }
      );
    }

    const submission = await updateSubmissionCaption(params.id, caption || '', polaroidUrl);
    return NextResponse.json({ submission, ok: true });
  } catch (err) {
    console.error('Error updating caption:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}