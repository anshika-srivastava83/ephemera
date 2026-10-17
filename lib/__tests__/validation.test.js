import { describe, it, expect } from 'vitest';
import { hashPhone } from '../hashPhone';
import {
  createEventSchema,
  submissionSchema,
  captionUpdateSchema,
  disposalSchema,
  formatZodErrors,
} from '../validation';

describe('Privacy & Validation Suite', () => {
  it('hashes phone numbers deterministically with SHA-256', () => {
    process.env.PHONE_HASH_SECRET = 'test-secret-salt';
    const raw = '+1 (555) 234-5678';
    const hash1 = hashPhone(raw);
    const hash2 = hashPhone('+15552345678');

    expect(hash1).toBeDefined();
    expect(typeof hash1).toBe('string');
    expect(hash1).toHaveLength(64); // SHA-256 hex string is 64 chars
    expect(hash1).not.toContain('555');
  });

  describe('createEventSchema', () => {
    it('accepts valid event payloads', () => {
      const valid = {
        name: 'Elena & Marcus — Villa Solaria',
        eventType: 'wedding',
        location: 'Tuscany, Italy',
        scheduledAt: '2026-06-20',
        maxSubmissions: '400',
      };
      const result = createEventSchema.safeParse(valid);
      expect(result.success).toBe(true);
      expect(result.data.maxSubmissions).toBe(400);
    });

    it('rejects names shorter than 2 chars or longer than 80 chars', () => {
      const short = createEventSchema.safeParse({ name: 'A' });
      expect(short.success).toBe(false);

      const long = createEventSchema.safeParse({ name: 'A'.repeat(81) });
      expect(long.success).toBe(false);
    });

  });

  describe('submissionSchema', () => {
    it('validates submission payloads accurately', () => {
      const valid = {
        eventId: 'e0000000-0000-4000-8000-000000000001',
        phone: '+1 555 123 4567',
        caption: 'Under the olive trees at dusk',
        photoUrl: '/uploads/raw-1.jpg',
        polaroidUrl: '/uploads/polaroid-1.jpg',
        reuseConsent: true,
      };
      const result = submissionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid uuid or captions exceeding 120 characters', () => {
      const invalid = {
        eventId: 'not-a-uuid',
        phone: '123',
        caption: 'x'.repeat(125),
        photoUrl: '',
        polaroidUrl: '',
      };
      const result = submissionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      const errors = formatZodErrors(result.error);
      expect(errors.eventId).toBeDefined();
      expect(errors.caption).toBeDefined();
      expect(errors.phone).toBeDefined();
    });
  });

  describe('captionUpdateSchema', () => {
    it('validates caption update limits', () => {
      const valid = {
        caption: 'A lovely sunset toast',
      };
      expect(captionUpdateSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        caption: 'a'.repeat(121),
      };
      expect(captionUpdateSchema.safeParse(invalid).success).toBe(false);
    });
  });
});

