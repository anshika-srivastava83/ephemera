import { NextResponse } from 'next/server';
import { getApprovedSubmissions } from '../../../../../lib/dataService';
import { isUuid } from '../../../../../lib/storage';

// Public: feeds the live wall and landing preview. Only returns approved
// photos and non-identifying fields.
//
// Scaling: the wall polls this every few seconds from every open screen.
// Letting the CDN cache the response for 3s means the database sees roughly
// one query per event per 3s no matter how many people are watching.
async function handle(_request, { params }) {
  try {
    if (!isUuid(params.id)) {
      return NextResponse.json({ submissions: [] });
    }
    const submissions = await getApprovedSubmissions(params.id);
    return NextResponse.json(
      { submissions },
      { headers: { 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=15' } }
    );
  } catch (err) {
    console.error('Error fetching approved submissions:', err);
    return NextResponse.json({ error: 'Could not load photos' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
