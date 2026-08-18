import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { isOwner, isOwnerOrCollaborator } from '../../../lib/auth';

// POST /api/events  { name, ownerPassword }
// Creates a brand-new event -> a brand-new event id -> a brand-new QR.
export async function POST(request) {
  const { name, ownerPassword, maxSubmissions } = await request.json();

  if (!isOwner(ownerPassword)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  if (!name) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
  }

  // No real login yet (that's the V2 plan), so owner_id is just a
  // placeholder random id for now -- it's not used for permission checks
  // in V1, the shared password is.
  const { data, error } = await supabaseAdmin()
    .from('events')
    .insert({
      name,
      status: 'open',
      owner_id: crypto.randomUUID(),
      max_submissions: maxSubmissions && maxSubmissions > 0 ? maxSubmissions : 500,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

// GET /api/events?password=...
// Lists all events (owner and collaborator both see everything), each with
// its pending/approved submission counts. Returns the caller's role so the
// UI can show/hide owner-only controls.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('password');

  if (!isOwnerOrCollaborator(password)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from('events')
    .select('id, name, status, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pull pending/approved counts for all these events in one query, then
  // tally them in JS -- simpler than a grouped SQL query for this scale.
  const eventIds = data.map((ev) => ev.id);
  const { data: submissionCounts, error: countError } = await supabaseAdmin()
    .from('submissions')
    .select('event_id, status')
    .in('event_id', eventIds);

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  const countsByEvent = {};
  for (const row of submissionCounts) {
    if (!countsByEvent[row.event_id]) countsByEvent[row.event_id] = { pending: 0, approved: 0 };
    if (row.status === 'pending') countsByEvent[row.event_id].pending++;
    if (row.status === 'approved') countsByEvent[row.event_id].approved++;
  }

  const eventsWithCounts = data.map((ev) => ({
    ...ev,
    pendingCount: countsByEvent[ev.id]?.pending || 0,
    approvedCount: countsByEvent[ev.id]?.approved || 0,
  }));

  return NextResponse.json({
    events: eventsWithCounts,
    role: isOwner(password) ? 'owner' : 'collaborator',
  });
}