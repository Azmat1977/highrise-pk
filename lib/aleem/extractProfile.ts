// lib/aleem/extractProfile.ts
// ALEEM - progressive profile extraction.
//
// Pulls name, city, email and phone out of natural conversation so ALEEM never
// has to present a form. Deterministic and offline: no model call, no network.
//
// CRITICAL DISTINCTION
// Capturing a detail is NOT consent to be contacted. This module only reports
// what the user revealed. Consent stays with detectConsent() in
// createAleemLead.ts and remains the only trigger for a callback lead.

const MAX_SCAN_CHARS = 1000;

export interface ExtractedProfile {
  name?: string;
  city?: string;
  email?: string;
  phone?: string;
}

export type ProfileField = keyof ExtractedProfile;

// ---------------------------------------------------------------------------
// Third-party guard
// ---------------------------------------------------------------------------

/**
 * Detect that a contact detail belongs to somebody else. "us dealer ka number
 * 0300... hai" is a complaint, not a callback request, and storing that number
 * as the customer's own would be wrong and possibly harmful.
 */
const THIRD_PARTY = new RegExp(
  [
    '\\b(his|her|their|its)\\s+(number|phone|contact|email)\\b',
    '\\b(dealer|agent|builder|owner|seller|broker|company|office|friend|bhai|uncle)\\s*(ka|ki|ke)?\\s*(number|phone|contact|email)\\b',
    '\\b(us|is|un)\\s+(bande|banday|shakhs|dealer|agent|admi)\\b',
    '\\bnumber\\s+(us|is|un|unko|usko)\\b',
    '\\b(scam|fraud|fake|dhoka|complaint|shikayat|report)\\b',
  ].join('|'),
  'i',
);

function mentionsThirdParty(text: string): boolean {
  return THIRD_PARTY.test(text);
}

// ---------------------------------------------------------------------------
// Phone - Pakistani mobile formats
// ---------------------------------------------------------------------------

const PHONE_CANDIDATE = /(?:\+?92|0092|0)?[\s-]?3\d{2}[\s-]?\d{7}\b/g;

/**
 * Normalise any Pakistani mobile form to local 03XXXXXXXXX.
 * Accepts +92 300 1234567, 0092-300-1234567, 03001234567, 300 1234567.
 */
export function normalizePakPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');

  let local: string | null = null;
  if (/^92 3\d{9}$/.test(digits.replace(/^92/, '92 '))) local = `0${digits.slice(2)}`;
  else if (digits.startsWith('0092') && digits.length === 14) local = `0${digits.slice(4)}`;
  else if (digits.startsWith('92') && digits.length === 12) local = `0${digits.slice(2)}`;
  else if (digits.startsWith('03') && digits.length === 11) local = digits;
  else if (digits.startsWith('3') && digits.length === 10) local = `0${digits}`;

  if (!local) return null;
  return /^03\d{9}$/.test(local) ? local : null;
}

function extractPhone(text: string): string | undefined {
  if (mentionsThirdParty(text)) return undefined;

  const matches = text.match(PHONE_CANDIDATE);
  if (!matches) return undefined;

  for (const candidate of matches) {
    const normalized = normalizePakPhone(candidate);
    if (normalized) return normalized;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

const EMAIL_RE = /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}\b/;

function extractEmail(text: string): string | undefined {
  if (mentionsThirdParty(text)) return undefined;

  const match = text.match(EMAIL_RE);
  if (!match) return undefined;

  const value = match[0].toLowerCase();
  if (value.length > 254) return undefined;
  if (value.includes('..')) return undefined;
  return value;
}

// ---------------------------------------------------------------------------
// City
// ---------------------------------------------------------------------------

const CITIES: Array<{ canonical: string; patterns: string[] }> = [
  { canonical: 'Islamabad', patterns: ['islamabad', 'isb'] },
  { canonical: 'Rawalpindi', patterns: ['rawalpindi', 'pindi'] },
  { canonical: 'Lahore', patterns: ['lahore'] },
  { canonical: 'Karachi', patterns: ['karachi', 'khi'] },
  { canonical: 'Faisalabad', patterns: ['faisalabad', 'lyallpur'] },
  { canonical: 'Multan', patterns: ['multan'] },
  { canonical: 'Peshawar', patterns: ['peshawar'] },
  { canonical: 'Quetta', patterns: ['quetta'] },
  { canonical: 'Sialkot', patterns: ['sialkot'] },
  { canonical: 'Gujranwala', patterns: ['gujranwala'] },
  { canonical: 'Hyderabad', patterns: ['hyderabad'] },
  { canonical: 'Abbottabad', patterns: ['abbottabad'] },
  { canonical: 'Sargodha', patterns: ['sargodha'] },
  { canonical: 'Bahawalpur', patterns: ['bahawalpur'] },
  { canonical: 'Sukkur', patterns: ['sukkur'] },
  { canonical: 'Murree', patterns: ['murree'] },
  { canonical: 'Gwadar', patterns: ['gwadar'] },
  { canonical: 'Wah Cantt', patterns: ['wah cantt', 'wah cantonment'] },
  { canonical: 'Mardan', patterns: ['mardan'] },
  { canonical: 'Sahiwal', patterns: ['sahiwal'] },
];


function extractCity(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const city of CITIES) {
    for (const pattern of city.patterns) {
      const re = new RegExp(`\\b${pattern}\\b`, 'i');
      if (re.test(lower)) return city.canonical;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Name
// ---------------------------------------------------------------------------

const NAME_PATTERNS: RegExp[] = [
  /\bmera\s+naam\s+([A-Za-z][A-Za-z'.-]{1,20}(?:\s+[A-Za-z][A-Za-z'.-]{1,20}){0,2})\s+(?:hai|he|h)\b/i,
  /\bmy\s+name\s+is\s+([A-Za-z][A-Za-z'.-]{1,20}(?:\s+[A-Za-z][A-Za-z'.-]{1,20}){0,2})\b/i,
  /\bi\s+am\s+([A-Za-z][A-Za-z'.-]{1,20}(?:\s+[A-Za-z][A-Za-z'.-]{1,20}){0,2})\b/i,
  /\bi'?m\s+([A-Za-z][A-Za-z'.-]{1,20}(?:\s+[A-Za-z][A-Za-z'.-]{1,20}){0,2})\b/i,
  /\bmain\s+([A-Za-z][A-Za-z'.-]{1,20}(?:\s+[A-Za-z][A-Za-z'.-]{1,20}){0,2})\s+hoon\b/i,
  /\bthis\s+is\s+([A-Za-z][A-Za-z'.-]{1,20}(?:\s+[A-Za-z][A-Za-z'.-]{1,20}){0,2})\s+(?:here|speaking)\b/i,
  /\bname\s*[:\-]\s*([A-Za-z][A-Za-z'.-]{1,20}(?:\s+[A-Za-z][A-Za-z'.-]{1,20}){0,2})\b/i,
];

/**
 * Words that look like a name to the regex but are really the user describing
 * a situation: "I am looking for a plot", "main interested hoon".
 */
const NAME_STOPWORDS = new Set([
  'looking', 'interested', 'searching', 'from', 'in', 'not', 'just', 'also',
  'here', 'there', 'buying', 'selling', 'renting', 'asking', 'trying',
  'confused', 'sorry', 'sure', 'ready', 'planning', 'thinking', 'new',
  'a', 'an', 'the', 'still', 'only', 'very', 'really', 'good', 'fine',
  'ok', 'okay', 'yes', 'no', 'agent', 'dealer', 'buyer', 'seller', 'owner',
  'investor', 'student', 'doctor', 'engineer', 'businessman',
]);

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function extractName(text: string): string | undefined {
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (!match || !match[1]) continue;

    // Reject when a digit follows immediately ("my name is Plot 123"): the
    // capture group stops at the space, so the digit must be checked here.
    const tail = text.slice((match.index ?? 0) + match[0].length);
    if (/^\s*\d/.test(tail)) continue;

    const candidate = match[1].trim();
    const words = candidate.split(/\s+/);

    if (words.some((w) => NAME_STOPWORDS.has(w.toLowerCase()))) continue;
    if (candidate.length < 2 || candidate.length > 60) continue;
    if (/\d/.test(candidate)) continue;

    return titleCase(candidate);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract whatever profile details the message reveals. Returns only the
 * fields actually found - never guesses, never fills a blank.
 */
export function extractProfile(message: string): ExtractedProfile {
  if (typeof message !== 'string' || !message.trim()) return {};
  const text = message.slice(0, MAX_SCAN_CHARS);

  const profile: ExtractedProfile = {};

  const name = extractName(text);
  if (name) profile.name = name;

  const city = extractCity(text);
  if (city) profile.city = city;

  const email = extractEmail(text);
  if (email) profile.email = email;

  const phone = extractPhone(text);
  if (phone) profile.phone = phone;

  return profile;
}

/**
 * Merge newly extracted details over what is already known. Existing values
 * are never overwritten - the first thing a user tells us stands unless they
 * are explicitly correcting it elsewhere in the flow.
 */
export function mergeProfile(
  existing: ExtractedProfile,
  incoming: ExtractedProfile,
): { merged: ExtractedProfile; added: ProfileField[] } {
  const merged: ExtractedProfile = { ...existing };
  const added: ProfileField[] = [];

  (Object.keys(incoming) as ProfileField[]).forEach((field) => {
    const value = incoming[field];
    if (!value) return;
    if (merged[field]) return;
    merged[field] = value;
    added.push(field);
  });

  return { merged, added };
}

/** Fields still missing, in the order ALEEM should try to earn them. */
export function missingFields(profile: ExtractedProfile): ProfileField[] {
  const order: ProfileField[] = ['city', 'name', 'phone', 'email'];
  return order.filter((field) => !profile[field]);
}

/**
 * How complete the profile is, 0-100. A conversation that yields only a city
 * and a name is still a usable lead, so this is a signal, not a gate.
 */
export function profileCompleteness(profile: ExtractedProfile): number {
  const weights: Record<ProfileField, number> = {
    name: 20,
    city: 20,
    email: 25,
    phone: 35,
  };
  return (Object.keys(weights) as ProfileField[]).reduce(
    (total, field) => (profile[field] ? total + weights[field] : total),
    0,
  );
}