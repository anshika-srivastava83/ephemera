import { NextResponse } from 'next/server';
import { getRole, isOwner, getCurrentUserEmail } from '../../../lib/auth';
import { getEvents, createEvent } from '../../../lib/dataService';
import { createEventSchema, formatZodErrors } from '../../../lib/validation';

export async function POST(request) {
  try {
    const body = await request.json();

    if (!(await isOwner(body?.password))) {
      return NextResponse.json(
        { error: 'Only event owners can create events.' },
        { status: 403 }
      );
    }

    // Server-side Zod validation
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Please correct the highlighted errors.',
          fieldErrors: formatZodErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    const { name, maxSubmissions, location, scheduledAt } = parsed.data;
    const creatorEmail = await getCurrentUserEmail();

    const event = await createEvent({
      name,
      location,
      scheduledAt,
      maxSubmissions,
      creatorEmail,
    });

<<<<<<< HEAD
  if (error) {
    console.error('Create event failed:', error);
    return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 500 });
  }
  return NextResponse.json({ event: data });
=======
    return NextResponse.json({ event, success: true });
  } catch (err) {
    console.error('Error creating event:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
>>>>>>> 0e3d06a777cdb48b9bc5717f64ce67e0e91eb2b9
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId') || undefined;
    const role = await getRole(eventId);
    // Lightweight check used by the host shell: skip loading every event
    if (url.searchParams.get('roleOnly') === '1') {
      return NextResponse.json({ role });
    }
    const events = await getEvents(role);

    if (!role) {
      // Public sanitized view without internal counts
      const publicList = events.map((ev) => ({
        id: ev.id,
        name: ev.name,
        status: ev.status,
        location: ev.location,
        scheduled_at: ev.scheduled_at,
        chosen_layout_id: ev.chosen_layout_id,
        created_at: ev.created_at,
      }));
      return NextResponse.json({ events: publicList, role: null });
    }

    return NextResponse.json({ events, role });
  } catch (err) {
    console.error('Error getting events:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
