// Returns true if the given password matches the owner password.
// Owner-only actions: create event, close, finalize, dispose, delete-wall.
export function isOwner(password) {
  return password === process.env.OWNER_PASSWORD;
}

// Returns true if the password matches either the owner or the
// collaborator password. Shared actions: approve, reject.
export function isOwnerOrCollaborator(password) {
  return (
    password === process.env.OWNER_PASSWORD ||
    password === process.env.COLLABORATOR_PASSWORD
  );
}