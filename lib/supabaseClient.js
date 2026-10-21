import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Safe to use in the browser: read-only, limited by Row Level Security
// to events + approved submissions only.
export const supabasePublic = createClient(supabaseUrl, supabaseKey);

// Server-only: used inside app/api/* route handlers, never imported into
// a client component.
export function supabaseAdmin() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return createClient(supabaseUrl, serviceKey);
}