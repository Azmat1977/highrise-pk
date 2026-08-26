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

/**
 * Questions that mention a property type but ask for GUIDANCE, not inventory.
 * "Plot kharidne se pehle kya check karna chahiye?" is advice; running a
 * grounded search on it returns "no listings found", which is both wrong and
 * unhelpful. Let the AI answer these properly instead.
 */
const ADVICE_MARKERS = new RegExp(
  [
    '\\b(how|what|why|when|which|should|can i|do i|is it|are there|explain|tell me about|guide|advice|tips|process|difference between|better)\\b',
    // "chahiye" alone is a requirement ("mujhe plot chahiye"), not advice.
    // Only treat it as advice when paired with a question word.
    '\\b(kaise|kaisay|kyun|kyu|kaunsa|konsa|samjhao|tareeqa|farq|mashwara)\\b',
    '\\b(kya|kia)\\b.*\\b(check|karna|hota|matlab|zaroori|behtar|faida|nuqsan)\\b',
    '\\bkarna chahiye\\b',
    '\\bcheck karna\\b',
  ].join('|'),
  'i',
);

/** Concrete inventory signals: a real requirement, not a question about one. */
const INVENTORY_MARKERS = new RegExp(
  [
    '\\b(show|dikhao|dikhaein|find|search|available|listing|listings)\\b',
    '\\b\\d+(?:\\.\\d+)?\\s*(marla|kanal|lakh|lakhs|lac|crore|karor)\\b',
    '\\b(under|below|upto|up to|within|budget|tak)\\b',
  ].join('|'),
  'i',
);

function isAdviceQuestion(message: string): boolean {
  const lower = message.toLowerCase();

  // City-wide price / value range questions are guidance, not inventory dumps.
  // Example: "Islamabad mein 10 marla ghar min/max kis range mein mil sakta hai?"
  // A bare "10 marla" must NOT force grounded search + alternative cards.
  const asksMarketRange =
    /\b(minimum|maximum|\bmin\b|\bmax\b|range|values?|city\s*-?\s*wise|citywise)\b/i.test(
      lower,
    ) &&
    /\b(price|prices|value|values|qeemat|keemat|kitne|kitni|mil\s*sakta|mil\s*sakti|milta|milti|mil\s*sakte)\b/i.test(
      lower,
    );

  if (asksMarketRange) return true;

  if (INVENTORY_MARKERS.test(lower)) return false;
  return ADVICE_MARKERS.test(lower);
}

// Location lists are gone on purpose. They only covered ~30 societies, so
// anything else (F-6, Faisal Town) was silently dropped and the search ran
// unfiltered. Locations now come from real inventory via locationResolver.

const TYPE_PATTERNS: Array<{ type: NonNullable<PropertySearchSlots['type']>; re: RegExp }> = [
  { type: 'apartment', re: /\b(apartment|apartments|flat|flats)\b/gi },
  { type: 'house',     re: /\b(house|houses|home|homes|villa|bungalow|ghar|makan|kothi)\b/gi },
  { type: 'plot',      re: /\b(plot|plots)\b/gi },
  { type: 'shop',      re: /\b(shop|shops|dukan|dukaan)\b/gi },
  { type: 'office',    re: /\b(office|offices)\b/gi },
  { type: 'warehouse', re: /\b(warehouse|godown)\b/gi },
  { type: 'building',  re: /\b(building|plaza)\b/gi },
];

// Roman Urdu places the negation AFTER the noun ("ghar nahi plot"), English
// before it ("not a house, a plot"). Handle both, otherwise "ghar nahi plot"
// matches house first and the user is shown exactly what they ruled out.
const NEG_AFTER = /^\s*(nahi|nahin|nai|nhi|na)\b/i;
const NEG_BEFORE = /\b(not|no|dont|don't)\s+(a\s+|an\s+|the\s+)?$/i;

function detectType(lower: string): PropertySearchSlots['type'] | undefined {
  const hits: Array<{ type: NonNullable<PropertySearchSlots['type']>; index: number; negated: boolean }> = [];

  for (const { type, re } of TYPE_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower)) !== null) {
      const after = lower.slice(m.index + m[0].length);
      const before = lower.slice(0, m.index);
      hits.push({
        type,
        index: m.index,
        negated: NEG_AFTER.test(after) || NEG_BEFORE.test(before),
      });
    }
  }

  const affirmed = hits.filter((h) => !h.negated);
  if (affirmed.length === 0) return undefined;

  // Last affirmed mention wins: "ghar nahi plot chahiye" resolves to plot.
  affirmed.sort((a, b) => a.index - b.index);
  return affirmed[affirmed.length - 1].type;
}

function detectListingType(lower: string): 'rent' | 'sale' | undefined {
  // Tenanted / rented asset offered for SALE (investment language).
  // "rent par laga", "kiraye par charha", "tenanted" = buyer wants ownership,
  // NOT a tenancy. Must never map to listingType rent.
  const tenantedForSale =
    /\b(rent|kiraya|kiraye|kirai|kirae)\s*par\s*(laga|lagi|lage|lagaya|lagayi|charha|charhi|chara|chari|chadh|chadha|chadhi)\b/.test(
      lower,
    ) ||
    /\b(tenanted|rented\s+(house|home|property|ghar|makan)|with\s+(a\s+)?tenant|tenant\s+occupied|occupied\s+by\s+tenant)\b/.test(
      lower,
    ) ||
    /\b(rental\s+income|rent\s+income|passive\s+income|yield\s+wali|income\s+wali\s+property)\b/.test(
      lower,
    );

  // User explicitly rejects renting as the deal type.
  const rentNegated =
    /\b(rent|rental|kiraya|kiraye|kirai|kirae)\s*(kay|ke|ki)?\s*(liye|keliye)?\s*(nahi|nahin|nai|nhi)\b/.test(
      lower,
    ) ||
    /\b(nahi|nahin|nai|nhi)\s+(rent|rental|kiraya|kiraye|kirai|kirae)\b/.test(lower) ||
    /\b(not\s+(for\s+)?rent|no\s+rent|rent\s+nahi)\b/.test(lower);

  // Clear purchase / investment signals (checked BEFORE bare "rent" token).
  const wantsSale =
    tenantedForSale ||
    rentNegated ||
    /\b(buy|buying|purchase|kharid|khareed|kharidna|khareedna|for\s+sale|sale|bechna|investment|invest|investor)\b/.test(
      lower,
    ) ||
    /\b(property\s+value|ownership|registry|bayana)\b/.test(lower);

  if (wantsSale) return 'sale';

  // True rent intent: user wants to take a place on rent.
  const wantsRent =
    /\b(for\s+rent|on\s+rent|to\s+rent|rent\s+chahiye|kiraya\s+chahiye|kiraye\s+(par|pe)\s+(chahiye|leni|lena|leni\s+hai)|lease)\b/.test(
      lower,
    ) ||
    (/\b(rent|rental|kiraya|kirae|kiraye|kirai)\b/.test(lower) &&
      !tenantedForSale &&
      !rentNegated);

  if (wantsRent) return 'rent';

  // A lump-sum budget ("50 lakh", "1 crore") is a purchase signal. Without
  // this the rent price field is compared against a purchase budget, so a
  // PKR 120,000/month rental looks like it fits a 50 lakh buying budget.
  if (
    /\b\d+(?:\.\d+)?\s*(lakhs|lakh|lacs|lac|lackh|lack|crores|crore|karor|kror|croar)\b/i.test(
      lower,
    )
  ) {
    return 'sale';
  }

  return undefined;
}

function detectBedrooms(lower: string): number | undefined {
  const m = lower.match(/(\d{1,2})\s*(?:-|\s)?\s*(?:bed|beds|bedroom|bedrooms|bhk|kamray|kamre|kamra)\b/);
  if (!m) return undefined;
  const v = parseInt(m[1], 10);
  return Number.isFinite(v) && v > 0 && v <= 20 ? v : undefined;
}

const MARLA_PER_KANAL = 20;

/**
 * Size in marla. Kanal is converted (1 kanal = 20 marla) because the search
 * layer works in marla. Without this, "2 kanal house" silently lost its size.
 */
function detectMarla(lower: string): number | undefined {
  const kanal = lower.match(/(\d+(?:\.\d+)?)\s*kanal/);
  if (kanal) {
    const v = parseFloat(kanal[1]);
    if (Number.isFinite(v) && v > 0) return v * MARLA_PER_KANAL;
  }

  const marla = lower.match(/(\d+(?:\.\d+)?)\s*marla/);
  if (marla) {
    const v = parseFloat(marla[1]);
    if (Number.isFinite(v) && v > 0) return v;
  }

  return undefined;
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
  // Advice questions go to the AI, not to inventory search.
  if (isAdviceQuestion(message)) return null;

  const lower = message.toLowerCase();

  const type = detectType(lower);
  const marla = detectMarla(lower);
  const bedrooms = detectBedrooms(lower);
  const budget = detectBudget(lower);

  // Runs after budget so a lump-sum amount can imply a purchase.
  const listingType = detectListingType(lower);

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
