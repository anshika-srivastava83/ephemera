import { NextResponse } from 'next/server';
import { isOwner, isOwnerOrCollaborator, getRole, getCurrentUserEmail } from '../../../../../lib/auth';
import {
  getEventMembers,
  addEventMember,
  updateEventMemberRole,
  removeEventMember,
  getEventById,
} from '../../../../../lib/dataService';

// GET /api/events/[id]/collaborators
// Returns list of assigned hosts and collaborators for this event
export async function GET(request, { params }) {
  try {
    const eventId = params.id;
    if (!(await isOwnerOrCollaborator(undefined, eventId))) {
      return NextResponse.json({ error: 'Not authorized to view event team' }, { status: 401 });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const members = await getEventMembers(eventId);
    const role = await getRole(eventId);
    const currentUserEmail = await getCurrentUserEmail();

    return NextResponse.json({
      members,
      role,
      currentUserEmail,
      ownerEmail: event.owner_email || null,
      success: true,
    });
  } catch (err) {
    console.error('Error fetching event team:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/events/[id]/collaborators
// Assign a new host or collaborator by email
export async function POST(request, { params }) {
  try {
    const eventId = params.id;
    const body = await request.json();

    if (!(await isOwner(body?.password, eventId))) {
      return NextResponse.json(
        { error: 'Only event owners / hosts can assign team members.' },
        { status: 403 }
      );
    }

    const { email, role = 'collaborator' } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (role !== 'host' && role !== 'collaborator') {
      return NextResponse.json(
        { error: 'Role must be either "host" or "collaborator".' },
        { status: 400 }
      );
    }

    const currentUserEmail = await getCurrentUserEmail();
    const member = await addEventMember({
      eventId,
      email: cleanEmail,
      role,
      addedBy: currentUserEmail || 'Host',
    });

    return NextResponse.json({ member, success: true });
  } catch (err) {
    console.error('Error assigning event member:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/events/[id]/collaborators
// Change a team member's role between 'host' and 'collaborator'
export async function PATCH(request, { params }) {
  try {
    const eventId = params.id;
    const body = await request.json();

    if (!(await isOwner(body?.password, eventId))) {
      return NextResponse.json(
        { error: 'Only event owners / hosts can modify team roles.' },
        { status: 403 }
      );
    }

    const { memberId, role } = body;
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required.' }, { status: 400 });
    }

    if (role !== 'host' && role !== 'collaborator') {
      return NextResponse.json(
        { error: 'Role must be either "host" or "collaborator".' },
        { status: 400 }
      );
    }

    const member = await updateEventMemberRole({ eventId, memberId, role });
    return NextResponse.json({ member, success: true });
  } catch (err) {
    console.error('Error updating member role:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/events/[id]/collaborators
// Remove a host or collaborator from the event
export async function DELETE(request, { params }) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    let memberId = searchParams.get('memberId');

    let password;
    try {
      const body = await request.json();
      memberId = memberId || body?.memberId;
      password = body?.password;
    } catch {}

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required.' }, { status: 400 });
    }

    if (!(await isOwner(password, eventId))) {
      return NextResponse.json(
        { error: 'Only event owners / hosts can remove team members.' },
        { status: 403 }
      );
    }

    await removeEventMember({ eventId, memberId });
    return NextResponse.json({ ok: true, success: true });
  } catch (err) {
    console.error('Error removing event member:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
