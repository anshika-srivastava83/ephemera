import crypto from 'crypto';

// Turns a phone number into a deterministic, irreversible hash so the raw
// number is never stored. Same number always produces the same hash.
export function hashPhone(rawPhone) {
  const normalized = rawPhone.replace(/[\s\-()]/g, '');
  return crypto
    .createHmac('sha256', process.env.PHONE_HASH_SECRET)
    .update(normalized)
    .digest('hex');
}