import { NextResponse } from 'next/server';
import { isOwner } from '../../../../../lib/auth';
import { disposeEventPhotos } from '../../../../../lib/dataService';

export async function POST(request, { params }) {
  try {
    if (!(await isOwner(undefined, params.id))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const result = await disposeEventPhotos(params.id);
    return NextResponse.json({
      ok: true,
      disposed: true,
      submissions: result.submissions,
      files: result.files,
    });
  } catch (err) {
    console.error('Error disposing event photos:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}