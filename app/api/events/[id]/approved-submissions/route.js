import { NextResponse } from 'next/server';
import { getApprovedSubmissions } from '../../../../../lib/dataService';

// Public: feeds the live wall and landing preview. Only returns approved
// photos and non-identifying fields.
async function handle(_request, { params }) {
  try {
    const submissions = await getApprovedSubmissions(params.id);
    return NextResponse.json({ submissions });
  } catch (err) {
    console.error('Error fetching approved submissions:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
