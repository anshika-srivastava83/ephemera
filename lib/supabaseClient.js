import { createClient } from '@supabase/supabase-js';

// Safe to use in the browser: read-only, limited by Row Level Security
// to events + approved submissions only.
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server-only: used inside app/api/* route handlers, never imported into
// a client component. Bypasses Row Level Security.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}