// lib/aleem/slots.ts
// ALEEM — customer-facing concierge.
//
// Phase A: structured search slots parsed from user intent.
// These slots are produced server-side (by Gemini in Phase B, or by
// deterministic parsing) and consumed ONLY by searchProperties().
// The model never receives a Mongo URI and never runs queries directly.

import { z } from 'zod';

export const ALEEM_INTENTS = ['living', 'investment', 'future', 'roi_curious'] as const;

export const ALEEM_PROPERTY_TYPES = [
  'plot',
  'house',
  'apartment',
  'shop',
  'office',
  'warehouse',
  'building',
] as const;

export const PropertySearchSlotsSchema = z
  .object({
    // Purpose FIRST (a slot, never a promise of ROI or guarantees).
    intent: z.enum(ALEEM_INTENTS).optional(),
    // What kind of property the user is looking for.
    type: z.enum(ALEEM_PROPERTY_TYPES).optional(),
    // Rent vs sale. Without this a "for rent" search returns sale listings.
    listingType: z.enum(['rent', 'sale']).optional(),
    // Plot size in marla (1 marla = 272.25 sq ft = 30.25 sq yd).
    marla: z.number().positive().max(10000).optional(),
    // Bedroom count for houses and apartments.
    bedrooms: z.number().int().positive().max(20).optional(),
    // Free-text location: city, society, or locality (e.g. "Islamabad", "B-17").
    // Only ever set to a value that exists in verified inventory.
    location: z.string().trim().min(1).max(120).optional(),
    // A location the user named that has NO verified inventory. Carried so the
    // reply can say so honestly instead of silently dropping the filter.
    unavailableLocation: z.string().trim().min(1).max(120).optional(),
    // Budget in PKR (60 lakh = 6,000,000).
    budgetMinPKR: z.number().int().nonnegative().optional(),
    budgetMaxPKR: z.number().int().positive().optional(),
  })
  .refine(
    (s) =>
      s.budgetMinPKR === undefined ||
      s.budgetMaxPKR === undefined ||
      s.budgetMinPKR <= s.budgetMaxPKR,
    { message: 'budgetMinPKR must be <= budgetMaxPKR', path: ['budgetMinPKR'] },
  );

export type PropertySearchSlots = z.infer<typeof PropertySearchSlotsSchema>;

/**
 * Validate and coerce unknown input (e.g. a JSON blob produced by Gemini)
 * into a typed PropertySearchSlots object. Returns null on any failure so
 * the caller can safely fall back to a non-tool reply.
 */
export function parseSearchSlots(input: unknown): PropertySearchSlots | null {
  const result = PropertySearchSlotsSchema.safeParse(input);
  return result.success ? result.data : null;
}

const LAKH = 100_000;
const CRORE = 10_000_000;

/**
 * Convert a human budget expression to PKR.
 *   "60 lakh"      -> 6000000
 *   "1.5 crore"    -> 15000000
 *   "6000000"      -> 6000000
 *   "Rs. 1,200,000"-> 1200000
 * Returns null when the input is not a recognisable budget.
 * NEVER hardcodes a tax rate or price — this is pure unit conversion.
 */
export function parseBudgetExpression(input: string): number | null {
  const raw = input
    .trim()
    .toLowerCase()
    .replace(/pkrs?|rs\.?|rupees?/g, '')
    .replace(/,/g, '')
    .trim();

  if (!raw) return null;

  const croreMatch = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*(?:crore|crores|karor|kror|croar)$/);
  if (croreMatch) return Math.round(parseFloat(croreMatch[1]) * CRORE);

  // Accept common spellings: lakh, lac, lack, lackh, lakhs.
  const lakhMatch = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*(?:lakh|lakhs|lac|lacs|lack|lackh)$/);
  if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * LAKH);

  const plain = raw.match(/^([0-9]+)$/);
  if (plain) return parseInt(plain[1], 10);

  return null;
}
