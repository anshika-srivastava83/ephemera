import crypto from 'crypto';

const SECRET = process.env.PHONE_HASH_SECRET || 'ephemera-secret-salt-local-development';
if (process.env.NODE_ENV === 'production' && !process.env.PHONE_HASH_SECRET) {
  console.error('[security] PHONE_HASH_SECRET is not set; guest identifiers use the public default salt.');
}

// Turns a phone number into a deterministic, irreversible hash so the raw
// number is never stored. Same number always produces the same hash.
export function hashPhone(rawPhone) {
  const normalized = (rawPhone || '').replace(/[\s\-()]/g, '');
  return crypto
    .createHmac('sha256', SECRET)
    .update(normalized)
    .digest('hex');
}

// Turns an email address into a deterministic, irreversible hash for unique
// per-event submissions without exposing the raw email as an identifier.
export function hashEmail(rawEmail) {
  const normalized = (rawEmail || '').trim().toLowerCase();
  return crypto
    .createHmac('sha256', SECRET)
    .update(normalized)
    .digest('hex');
}