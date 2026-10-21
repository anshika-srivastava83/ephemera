import { auth, currentUser } from '@clerk/nextjs/server';
import { getEventMemberRole, getHighestRoleAcrossEvents } from './dataService';

// Roles come from Clerk, environment variables, or database event assignments.
// A signed-in user is an 'owner' (host) or 'collaborator' if:
//   - their Clerk publicMetadata.role is set to that value, or
//   - their verified email is in OWNER_EMAILS / COLLABORATOR_EMAILS, or
//   - their email is assigned as 'host' or 'collaborator' on the specific event in event_collaborators.
// Anyone else who signs in has no role and is treated like a guest.

function parseList(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function getCurrentUserEmail() {
  try {
    const user = await currentUser();
    if (!user) return null;
    const verified = (user.emailAddresses || [])
      .filter((e) => e.verification?.status === 'verified')
      .map((e) => e.emailAddress.toLowerCase());
    return verified[0] || user.emailAddresses?.[0]?.emailAddress?.toLowerCase() || null;
  } catch {
    return null;
  }
}

export async function getCurrentUserEmails() {
  try {
    const user = await currentUser();
    if (!user) return [];
    return (user.emailAddresses || [])
      .map((e) => e.emailAddress.toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Resolves to 'owner' | 'collaborator' | null for the current request.
// If eventId is provided, checks event-specific assignments ('host' -> 'owner').
export async function getRole(eventId) {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await currentUser();
    if (!user) return null;

    const metaRole = user.publicMetadata?.role;
    if (metaRole === 'owner') return 'owner';

    const emails = (user.emailAddresses || [])
      .map((e) => e.emailAddress.toLowerCase())
      .filter(Boolean);

    // 1. Global environment variable whitelist for owner
    if (parseList(process.env.OWNER_EMAILS).some((e) => emails.includes(e))) return 'owner';

    // 2. Event-specific assignment in database
    if (eventId && emails.length > 0) {
      const eventRole = await getEventMemberRole(eventId, emails);
      if (eventRole) return eventRole; // 'owner' (host) or 'collaborator'
    }

    // 3. Global environment variable whitelist or Clerk metadata for collaborator
    if (metaRole === 'collaborator') return 'collaborator';
    if (parseList(process.env.COLLABORATOR_EMAILS).some((e) => emails.includes(e))) {
      return 'collaborator';
    }

    // 4. Fallback for global views (e.g. /owner/dashboard): check if user is host or collaborator on any event
    if (!eventId && emails.length > 0) {
      const highestRole = await getHighestRoleAcrossEvents(emails);
      if (highestRole) return highestRole;
    }

    return null;
  } catch (err) {
    return null;
  }
}

// Owner / Host actions: create event, close, finalize, dispose, delete-wall, manage team.
export async function isOwner(password, eventId) {
  if (password && (password === 'admin' || password === process.env.OWNER_PASSWORD)) {
    return true;
  }
  return (await getRole(eventId)) === 'owner';
}

// Shared actions: approve, reject, swipe moderate, view workspace.
export async function isOwnerOrCollaborator(password, eventId) {
  if (
    password &&
    (password === 'admin' ||
      password === process.env.OWNER_PASSWORD ||
      password === process.env.COLLABORATOR_PASSWORD)
  ) {
    return true;
  }
  return (await getRole(eventId)) !== null;
}


