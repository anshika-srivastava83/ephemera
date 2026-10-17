import { NextResponse } from 'next/server';
import { getRole } from '../../../lib/auth';
import { getEvents, createEvent } from '../../../lib/dataService';
import { createEventSchema, formatZodErrors } from '../../../lib/validation';

export async function POST(request) {
  try {
    if ((await getRole()) !== 'owner') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const body = await request.json();

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

    const event = await createEvent({
      name,
      location,
      scheduledAt,
      maxSubmissions,
    });

    return NextResponse.json({ event, success: true });
  } catch (err) {
    console.error('Error creating event:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const role = await getRole();
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
