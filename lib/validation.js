import { z } from 'zod';

export const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{5,15}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. Create Event Schema
export const createEventSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Event name must be at least 2 characters.' })
    .max(80, { message: 'Event name cannot exceed 80 characters.' }),
  eventType: z.string().optional(),
  location: z
    .string()
    .trim()
    .max(120, { message: 'Location cannot exceed 120 characters.' })
    .optional()
    .or(z.literal('')),
  scheduledAt: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Please provide a valid date format.',
    }),
  maxSubmissions: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(
      z
        .number()
        .int({ message: 'Cap must be a whole number.' })
        .min(10, { message: 'Submission cap must be at least 10.' })
        .max(2000, { message: 'Submission cap cannot exceed 2,000.' })
    )
    .default(500),
});

// 2. Submission Schema
export const submissionSchema = z.object({
  eventId: z.string().uuid({ message: 'Invalid event identifier.' }),
  phone: z
    .string()
    .trim()
    .min(4, { message: 'Please enter a valid phone number.' })
    .max(25, { message: 'Phone number is too long.' }),
  caption: z
    .string()
    .trim()
    .max(120, { message: 'Caption cannot exceed 120 characters.' })
    .default(''),
  photoUrl: z
    .string()
    .min(1, { message: 'Photograph URL is required.' })
    .max(2000),
  polaroidUrl: z
    .string()
    .min(1, { message: 'Polaroid image URL is required.' })
    .max(2000),
  reuseConsent: z.boolean().default(true),
  email: z
    .string()
    .trim()
    .email({ message: 'Please enter a valid email address.' })
    .optional()
    .or(z.literal('')),
});

// 3. Caption Edit Schema
export const captionUpdateSchema = z.object({
  caption: z
    .string()
    .trim()
    .max(120, { message: 'Caption cannot exceed 120 characters.' }),
  polaroidUrl: z.string().optional(),
});

// 4. Disposal Schema
export const disposalSchema = z.object({
});

// Helper utility to safely validate and format Zod errors into a key-value map
export function formatZodErrors(error) {
  const formatted = {};
  if (!error || !error.issues) return formatted;
  for (const issue of error.issues) {
    const key = issue.path[0] || 'general';
    if (!formatted[key]) {
      formatted[key] = issue.message;
    }
  }
  return formatted;
}
