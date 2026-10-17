import { NextResponse } from 'next/server';
import { getSubmissionByToken } from '../../../../lib/dataService';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const submission = await getSubmissionByToken(token);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found or expired link' }, { status: 404 });
    }

    // Only what the guest page needs: no internal ids or contact data.
    const { caption, photo_url, polaroid_url, status, created_at, events } = submission;
    return NextResponse.json({
      submission: { caption, photo_url, polaroid_url, status, created_at, events },
    });
  } catch (err) {
    console.error('Error fetching submission by token:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}