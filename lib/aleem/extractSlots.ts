// lib/aleem/extractSlots.ts
// ALEEM — deterministic search-slot extraction.
//
// Turns a free-text user message into PropertySearchSlots WITHOUT calling
// Gemini, so grounded search works even when the model is down or quota is
// exceeded. Conservative by design: it only returns slots when there is a
// clear property-search signal (an explicit type or a marla size), so normal
// chat (greetings, investment advice, process questions) is never hijacked.

import type { PropertySearchSlots } from '@/lib/aleem/slots';
import { parseBudgetExpression } from '@/lib/aleem/slots';
import { resolveLocation } from '@/lib/aleem/locationResolver';

// Location lists are gone on purpose. They only covered ~30 societies, so
// anything else (F-6, Faisal Town) was silently dropped and the search ran
// unfiltered. Locations now come from real inventory via locationResolver.

function detectType(lower: string): PropertySearchSlots['type'] | undefined {
  if (/\b(apartment|flat|flats)\b/.test(lower)) return 'apartment';
  if (/\b(house|home|villa|bungalow|ghar|makan|kothi)\b/.test(lower)) return 'house';
  if (/\bplot\b|\bplots\b|plot file|residential plot/.test(lower)) return 'plot';
  if (/\bshop\b/.test(lower)) return 'shop';
  if (/\boffice\b/.test(lower)) return 'office';
  if (/\b(warehouse|godown)\b/.test(lower)) return 'warehouse';
  if (/\b(building|plaza)\b/.test(lower)) return 'building';
  return undefined;
}

function detectListingType(lower: string): 'rent' | 'sale' | undefined {
  if (/\b(rent|rental|kiraya|kirae|kiraye|kirai|lease|tenant)\b/.test(lower)) return 'rent';
  if (/\b(buy|purchase|kharid|khareed|kharidna|sale|for sale|bechna)\b/.test(lower)) return 'sale';
  return undefined;
}

function detectBedrooms(lower: string): number | undefined {
  const m = lower.match(/(\d{1,2})\s*(?:-|\s)?\s*(?:bed|beds|bedroom|bedrooms|bhk|kamray|kamre|kamra)\b/);
  if (!m) return undefined;
  const v = parseInt(m[1], 10);
  return Number.isFinite(v) && v > 0 && v <= 20 ? v : undefined;
}

function detectMarla(lower: string): number | undefined {
  const m = lower.match(/(\d+(?:\.\d+)?)\s*marla/);
  if (!m) return undefined;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

interface Budget {
  min?: number;
  max?: number;
}

function detectBudget(lower: string): Budget | undefined {
  // Capture every "<number> <lakh/lac/crore/kror>" occurrence with a small
  // window of preceding text so we can tell min vs max intent.
  const amountRe = /(\d+(?:\.\d+)?)\s*(lakhs|lakh|lacs|lac|lackh|lack|crores|crore|karor|kror|croar)/g;
  const hits: Array<{ value: number; prefix: string; index: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = amountRe.exec(lower)) !== null) {
    const pkr = parseBudgetExpression(`${match[1]} ${match[2]}`);
    if (pkr === null) continue;
    const start = Math.max(0, match.index - 20);
    hits.push({ value: pkr, prefix: lower.slice(start, match.index), index: match.index });
  }

  if (hits.length === 0) return undefined;

  const isMax = (prefix: string) =>
    /\b(under|below|upto|up to|within|max|maximum|budget|till|up until|less than)\b/.test(prefix);
  const isMin = (prefix: string) =>
    /\b(above|over|from|min|minimum|at least|starting|more than)\b/.test(prefix);

  const first = hits[0];

  // Range: "between X and Y", "X to Y", "X-Y"
  if (hits.length >= 2) {
    return { min: first.value, max: hits[1].value };
  }

  if (isMin(first.prefix)) return { min: first.value };
  // Bare amount ("60 lakh") and "under/within X" both mean a ceiling.
  return { max: first.value };
}

function detectIntent(lower: string): PropertySearchSlots['intent'] | undefined {
  if (/\b(invest|investment|roi|return on|capital gain)\b/.test(lower)) return 'investment';
  if (/\b(live|move in|residence|family home|settle)\b/.test(lower)) return 'living';
  if (/\b(future|later|next year|after some time)\b/.test(lower)) return 'future';
  return undefined;
}

/**
 * Extract search slots from a message, or null when there is no clear
 * property-search intent. Returns null unless an explicit type or marla is
 * present — this keeps greetings and advice questions on the normal path.
 */
export async function extractSearchSlots(
  message: string,
): Promise<PropertySearchSlots | null> {
  const lower = message.toLowerCase();

  const type = detectType(lower);
  const marla = detectMarla(lower);
  const bedrooms = detectBedrooms(lower);
  const listingType = detectListingType(lower);
  const budget = detectBudget(lower);

  // Locations come from real inventory. `matched` exists in our data and is
  // safe to filter on; `recognized` is a real place we simply have nothing in.
  const { matched, recognized } = await resolveLocation(message);

  // Any concrete signal is enough. Naming a location we actually stock is a
  // search on its own: "Bahria mein kuch acha dikhao" should return listings.
  const hasSearchSignal =
    Boolean(type) ||
    marla !== undefined ||
    bedrooms !== undefined ||
    Boolean(matched) ||
    Boolean(recognized) ||
    (listingType !== undefined && budget !== undefined);

  if (!hasSearchSignal) return null;

  return {
    type,
    listingType,
    marla,
    bedrooms,
    location: matched ?? undefined,
    unavailableLocation: matched ? undefined : (recognized ?? undefined),
    intent: detectIntent(lower),
    budgetMinPKR: budget?.min,
    budgetMaxPKR: budget?.max,
  };
}
