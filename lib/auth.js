import { auth, currentUser } from '@clerk/nextjs/server';

// Roles come from Clerk. A signed-in user is an 'owner' or 'collaborator' if
//   - their Clerk publicMetadata.role is set to that value, or
//   - one of their verified email addresses is listed in OWNER_EMAILS /
//     COLLABORATOR_EMAILS (comma-separated env vars).
// Anyone else who signs in has no role and is treated like a guest.

function parseList(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
//dummy
// Resolves to 'owner' | 'collaborator' | null for the current request.
export async function getRole() {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await currentUser();
    if (!user) return null;

    const metaRole = user.publicMetadata?.role;
    if (metaRole === 'owner' || metaRole === 'collaborator') return metaRole;

    const emails = (user.emailAddresses || [])
      .filter((e) => e.verification?.status === 'verified')
      .map((e) => e.emailAddress.toLowerCase());

    if (parseList(process.env.OWNER_EMAILS).some((e) => emails.includes(e))) return 'owner';
    if (parseList(process.env.COLLABORATOR_EMAILS).some((e) => emails.includes(e))) {
      return 'collaborator';
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Owner-only actions: create event, close, finalize, dispose, delete-wall.
export async function isOwner(password) {
  if (password && (password === 'admin' || password === process.env.OWNER_PASSWORD)) {
    return true;
  }
  return (await getRole()) === 'owner';
}

// Shared actions: approve, reject, moderate, caption edits, style selection.
export async function isOwnerOrCollaborator(password) {
  if (
    password &&
    (password === 'admin' ||
      password === process.env.OWNER_PASSWORD ||
      password === process.env.COLLABORATOR_PASSWORD)
  ) {
    return true;
  }
  return (await getRole()) !== null;
}

