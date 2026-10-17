# ephemera
## Host authentication (Clerk)

Hosts sign in with Clerk; guests and the public wall need no account.

- Set the `NEXT_PUBLIC_CLERK_*` / `CLERK_SECRET_KEY` vars (see `.env.example`).
- Role separation:
  - **Owner**: create and close events, edit wall style, reopen session / QR, delete photos or wall, edit captions, final approve photos (from moderation, gallery, or tapestry).
  - **Collaborator**: swipe controls (Tinder-like card stack to approve or pass submissions in moderation studio), strictly no editing captions, no deleting photos/wall, no changing wall style, and no event lifecycle or QR management.
- `/owner`, `/events`, `/create` are gated in `middleware.js`; every host API route re-checks the role in `lib/auth.js`.

