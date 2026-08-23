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

const CITIES = [
  'islamabad', 'rawalpindi', 'lahore', 'karachi', 'faisalabad', 'multan',
  'peshawar', 'quetta', 'gujranwala', 'sialkot', 'bahawalpur', 'sargodha',
  'hyderabad', 'gujrat', 'jhelum', 'abbottabad', 'mardan', 'sukkur',
  'murree', 'taxila', 'attock', 'wah cantt',
];

// More specific than cities — checked first (e.g. "DHA Lahore" → "dha").
// Include hyphenated and non-hyphenated variants of Islamabad sector codes.
const SOCIETIES = [
  'capital smart city', 'blue world city', 'park view', 'top city', 'eighteen',
  'rudn enclave', 'faisal hills', 'gulraiz', 'bahria orchard', 'navy housing',
  'dha', 'bahria', 'gulberg', 'clifton', 'pwd',
  'b-17', 'b17', 'g-13', 'g13', 'g-14', 'g14', 'f-8', 'f8', 'f-10', 'f10',
  'e-11', 'e11', 'd-12', 'd12', 'g-15', 'g15', 'f-17', 'f17', 'i-8', 'i8',
];

function detectType(lower: string): PropertySearchSlots['type'] | undefined {
  if (/\b(apartment|flat|flats)\b/.test(lower)) return 'apartment';
  if (/\b(house|home|villa|bungalow)\b/.test(lower)) return 'house';
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

function detectLocation(lower: string): string | undefined {
  // More specific first (society), then city.
  for (const s of SOCIETIES) {
    if (lower.includes(s)) return s;
  }
  for (const c of CITIES) {
    if (lower.includes(c)) return c;
  }
  return undefined;
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
export function extractSearchSlots(message: string): PropertySearchSlots | null {
  const lower = message.toLowerCase();

  const type = detectType(lower);
  const marla = detectMarla(lower);
  const listingType = detectListingType(lower);

  // A clear rent request is a real search signal on its own: "house for rent"
  // has a type, but "I need something on rent in Lahore" should also work.
  const hasLocation = detectLocation(lower) !== undefined;
  if (!type && !marla && !(listingType === 'rent' && hasLocation)) return null;

  const budget = detectBudget(lower);
  const location = detectLocation(lower);
  const intent = detectIntent(lower);

  const slots: PropertySearchSlots = {
    type,
    listingType,
    marla,
    location,
    intent,
    budgetMinPKR: budget?.min,
    budgetMaxPKR: budget?.max,
  };

  return slots;
}
