// lib/aleem/locationResolver.ts
// ALEEM - database-driven location resolution.
//
// WHY THIS EXISTS
// extractSlots.ts used a hardcoded list of ~22 cities and ~30 societies. Any
// location outside that list was SILENTLY DROPPED, so "F-6 mein ghar chahiye"
// ran an unfiltered search and returned properties from anywhere. The user had
// no way to tell the filter had been ignored.
//
// Two distinct outcomes matter:
//   matched    - the location exists in our inventory -> filter on it
//   recognized - it looks like a Pakistani location but we have nothing there
//                -> say so honestly instead of showing unrelated listings
//
// Never silently ignore a location the user actually typed.

import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';

const CACHE_TTL_MS = 5 * 60 * 1000;
const QUERY_MS = 2000;
const MAX_TOKEN_LEN = 60;

export interface ResolvedLocation {
  /** Exact value present in the database. Safe to use as a filter. */
  matched: string | null;
  /** A location the user clearly named but which has no verified inventory. */
  recognized: string | null;
}

// ---------------------------------------------------------------------------
// Known Pakistani locations - used ONLY to recognise intent, never to filter.
// Keeping this list is what lets us say "nothing in Lahore" instead of
// quietly showing Islamabad results.
// ---------------------------------------------------------------------------

const KNOWN_CITIES = [
  'islamabad', 'rawalpindi', 'pindi', 'lahore', 'karachi', 'faisalabad',
  'multan', 'peshawar', 'quetta', 'gujranwala', 'sialkot', 'bahawalpur',
  'sargodha', 'hyderabad', 'gujrat', 'jhelum', 'abbottabad', 'mardan',
  'sukkur', 'murree', 'taxila', 'attock', 'wah cantt', 'gwadar', 'sahiwal',
  'nowshera', 'chakwal', 'mianwali', 'okara', 'kasur', 'sheikhupura',
];

const KNOWN_SOCIETY_WORDS = [
  'dha', 'bahria', 'gulberg', 'clifton', 'pwd', 'cbr', 'pechs',
  'capital smart city', 'blue world city', 'park view', 'park enclave',
  'top city', 'eighteen', 'rudn enclave', 'faisal hills', 'gulraiz',
  'navy housing', 'askari', 'model town', 'johar town', 'wapda town',
  'valencia', 'state life', 'soan garden', 'media town', 'airport housing',
];

// ---------------------------------------------------------------------------
// Cache of real inventory values
// ---------------------------------------------------------------------------

interface LocationCache {
  cities: string[];
  societies: string[];
  localities: string[];
  loadedAt: number;
}

let cache: LocationCache | null = null;

async function loadInventoryLocations(): Promise<LocationCache> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache;

  try {
    await dbConnect();

    const [cities, societies, localities] = await Promise.all([
      Property.distinct('city', PUBLIC_PROPERTY_FILTER).maxTimeMS(QUERY_MS),
      Property.distinct('society', PUBLIC_PROPERTY_FILTER).maxTimeMS(QUERY_MS),
      Property.distinct('locality', PUBLIC_PROPERTY_FILTER).maxTimeMS(QUERY_MS),
    ]);

    const clean = (values: unknown[]): string[] =>
      values
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .map((v) => v.trim())
        .slice(0, 2000);

    cache = {
      cities: clean(cities),
      societies: clean(societies),
      localities: clean(localities),
      loadedAt: Date.now(),
    };
    return cache;
  } catch {
    // DB unreachable: fall back to whatever we had, or empty.
    return cache ?? { cities: [], societies: [], localities: [], loadedAt: 0 };
  }
}

/** Force a reload on the next call. Used after inventory changes. */
export function invalidateLocationCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Build every reasonable way a user might type a stored location.
 * "Faisal Town (F-18)" -> "faisal town (f-18)", "faisal town", "f-18", "f18", "f 18"
 * "G-13"               -> "g-13", "g13", "g 13"
 */
function buildTokens(value: string): string[] {
  const base = normalise(value);
  const tokens = new Set<string>();

  const add = (t: string) => {
    const v = t.trim();
    if (v.length >= 2 && v.length <= MAX_TOKEN_LEN) tokens.add(v);
  };

  add(base);

  // Text inside parentheses, and text before them.
  const paren = base.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    add(paren[1]);
    add(paren[2]);
  }

  // Sector-code variants for every token collected so far.
  for (const token of Array.from(tokens)) {
    const sector = token.match(/^([a-z])\s*-\s*(\d{1,2})$/);
    if (sector) {
      add(`${sector[1]}${sector[2]}`);
      add(`${sector[1]} ${sector[2]}`);
      add(`${sector[1]}-${sector[2]}`);
    }
    const joined = token.match(/^([a-z])(\d{1,2})$/);
    if (joined) {
      add(`${joined[1]}-${joined[2]}`);
      add(`${joined[1]} ${joined[2]}`);
    }
  }

  return Array.from(tokens);
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-token match so "f-6" cannot match inside "f-60". */
function containsToken(haystack: string, token: string): boolean {
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(token)}([^a-z0-9]|$)`, 'i');
  return re.test(haystack);
}

/**
 * Resolve a location from free text against real inventory.
 * Longest match wins so "faisal town (f-18)" beats a bare "f-18".
 */
export async function resolveLocation(message: string): Promise<ResolvedLocation> {
  const text = normalise(typeof message === 'string' ? message : '');
  if (!text) return { matched: null, recognized: null };

  const inventory = await loadInventoryLocations();

  // Specificity beats string length. "islamabad ke g-13 mein" must resolve to
  // G-13, not Islamabad, even though "islamabad" is the longer token. Tiers
  // are searched in order and the first tier with any hit wins.
  const tiers: string[][] = [
    inventory.societies,
    inventory.localities,
    inventory.cities,
  ];

  for (const tier of tiers) {
    let best: { value: string; length: number } | null = null;

    for (const value of tier) {
      for (const token of buildTokens(value)) {
        if (containsToken(text, token) && (!best || token.length > best.length)) {
          best = { value, length: token.length };
        }
      }
    }

    if (best) return { matched: best.value, recognized: null };
  }

  // Nothing in inventory. Did the user still name a real place?
  let recognized: string | null = null;
  let recognizedLen = 0;

  for (const known of [...KNOWN_SOCIETY_WORDS, ...KNOWN_CITIES]) {
    if (containsToken(text, known) && known.length > recognizedLen) {
      recognized = known;
      recognizedLen = known.length;
    }
  }

  // Bare sector codes ("f-11", "i-8") are unmistakably locations.
  if (!recognized) {
    const sector = text.match(/(^|[^a-z0-9])([a-z])\s*-\s*(\d{1,2})([^a-z0-9]|$)/i);
    if (sector) recognized = `${sector[2]}-${sector[3]}`;
  }

  return { matched: null, recognized };
}