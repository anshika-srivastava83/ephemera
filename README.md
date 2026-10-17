# ephemera
## Host authentication (Clerk)

Hosts sign in with Clerk; guests and the public wall need no account.

- Set the `NEXT_PUBLIC_CLERK_*` / `CLERK_SECRET_KEY` vars (see `.env.example`).
- Roles: a signed-in user is an **owner** or **collaborator** if their Clerk `publicMetadata.role` says so, or a verified email is in `OWNER_EMAILS` / `COLLABORATOR_EMAILS`. Anyone else gets a "Host access only" page.
- Owners can do everything; collaborators can moderate (approve/reject/edit captions/choose style). Create, close, reopen, finalize, dispose, and delete-wall are owner-only.
- `/owner`, `/events`, `/create` are gated in `middleware.js`; every host API route re-checks the role in `lib/auth.js`.
