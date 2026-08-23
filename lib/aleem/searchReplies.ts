// lib/aleem/searchReplies.ts
// ALEEM - language-aware replies for the grounded search path.
//
// WHY THIS EXISTS
// Grounded search runs BEFORE the AI provider and returns immediately, so the
// model never sees those turns. Previously the route returned hardcoded
// English, which meant a user writing Urdu got an English answer. These
// replies are deterministic, so they stay correct even when every AI provider
// is down - the whole point of keeping search provider-independent.
//
// HONESTY NOTE
// Full fluency in Punjabi, Pashto, Sindhi and Balochi comes from the AI model.
// Here we only detect them and reply respectfully in Roman Urdu while offering
// a language choice, rather than fabricating fluent-looking text.

import type { PropertyCard } from '@/lib/aleem/searchProperties';

export type ReplyLang = 'english' | 'urdu' | 'roman-urdu' | 'other-regional';

const URDU_SCRIPT = /[\u0600-\u06FF]/;
const PASHTO_ONLY = /[\u067C\u0681\u0685\u0689\u0693\u0696\u069A\u06AB\u06BC\u06CD]/;

const ROMAN_REGIONAL =
  /\b(tuhada|tuhanu|tusi|assi|kithe|kinna|changa|hega|sanu|zama|staso|tase|senga|pekhawar|khpal)\b/i;

// Greetings and courtesy words that are strong Urdu/Pakistani signals even
// when they appear alone in a one-word message.
const URDU_GREETING =
  /\b(salam|slam|salaam|assalam|assalamualaikum|asalam|aoa|walaikum|walekum|shukriya|shukria|jazakallah|inshallah|mashallah|khuda hafiz|allah hafiz)\b/i;

// Everyday Roman Urdu vocabulary. Deliberately broad: a false positive only
// means we reply in Roman Urdu to someone typing English words like "ghar",
// which is far less jarring than replying in English to an Urdu speaker.
const ROMAN_URDU_HINTS = new RegExp(
  [
    '\\b(hai|hain|hoon|hun|ho|tha|thi|thay|karna|karni|kar|karo|karein|kare)\\b',
    '\\b(kya|kia|kyun|kyu|kaise|kaisay|kahan|kahaan|kab|kitna|kitni|kitne)\\b',
    '\\b(mein|main|mujhe|mujhy|mera|meri|mere|hum|humein|aap|ap|apna|apni)\\b',
    '\\b(chahiye|chahye|chaiye|chahta|chahti|dhoond|dhundh|dhundna|talash)\\b',
    '\\b(acha|accha|theek|thik|bilkul|zaroor|haan|han|nahi|nahin|nai)\\b',
    '\\b(ghar|makan|zameen|zamin|jagah|paisa|paisay|paise|qeemat|keemat)\\b',
    '\\b(batao|batayein|bataen|dekho|dekhein|samajh|samjha|lena|dena|milega)\\b',
    '\\b(kiraya|kiraye|kirai|bechna|kharidna|khareedna|lagta|lagti)\\b',
  ].join('|'),
  'i',
);

/**
 * Detect the language to reply in. `previous` holds earlier user messages so a
 * short follow-up ("ok", "ji") inherits the language already established in
 * the conversation instead of snapping back to English.
 */
export function detectReplyLang(message: string, previous: string[] = []): ReplyLang {
  const text = typeof message === 'string' ? message : '';

  const classify = (input: string): ReplyLang | null => {
    if (!input.trim()) return null;
    if (PASHTO_ONLY.test(input)) return 'other-regional';
    if (URDU_SCRIPT.test(input)) return 'urdu';
    if (ROMAN_REGIONAL.test(input)) return 'other-regional';
    if (URDU_GREETING.test(input)) return 'roman-urdu';
    if (ROMAN_URDU_HINTS.test(input)) return 'roman-urdu';
    return null;
  };

  const current = classify(text);
  if (current) return current;

  // Inconclusive: inherit from the most recent conclusive user message.
  for (let i = previous.length - 1; i >= 0; i--) {
    const earlier = classify(previous[i]);
    if (earlier) return earlier;
  }

  return 'english';
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Exact digits with thousands separators. Never Lakh/Crore, never rounded. */
function groupDigits(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function cleanText(value: string, max = 90): string {
  return value.replace(/[\r\n\t|]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

/**
 * One line per listing, with a real link so the user can actually open it.
 * Price and area are printed exactly as stored in the database.
 */
export function formatListingLines(listings: PropertyCard[]): string {
  return listings
    .map((item, index) => {
      const title = cleanText(item.title) || 'Listing';
      const place = cleanText([item.society, item.city].filter(Boolean).join(', '), 60);
      const price = groupDigits(item.price);
      const area = item.area > 0 ? `${item.area}${item.unit ? ` ${item.unit}` : ''}` : '';

      const bits = [place, area].filter(Boolean).join(' | ');
      const priceBit = price ? ` - PKR ${price}` : '';
      const link = item.slug ? `\n   /property/${item.slug}` : '';

      return `${index + 1}. ${title}${priceBit}${bits ? `\n   ${bits}` : ''}${link}`;
    })
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

function forRentWord(lang: ReplyLang, isRent: boolean): string {
  if (!isRent) return '';
  if (lang === 'urdu') return ' کرائے کی';
  if (lang === 'roman-urdu' || lang === 'other-regional') return ' kiraye ki';
  return ' for rent';
}

/** Header shown above the listing lines when matches were found. */
export function buildMatchesReply(
  lang: ReplyLang,
  count: number,
  listings: PropertyCard[],
  isRent: boolean,
): string {
  const lines = formatListingLines(listings);
  const rentWord = forRentWord(lang, isRent);

  if (lang === 'urdu') {
    return `${count} تصدیق شدہ${rentWord} پراپرٹی ملی ہیں:\n\n${lines}`;
  }

  if (lang === 'roman-urdu') {
    return `${count} verified${rentWord} property mil gayi hain:\n\n${lines}`;
  }

  if (lang === 'other-regional') {
    return (
      `${count} verified${rentWord} property mil gayi hain:\n\n${lines}\n\n` +
      `(Aap Urdu ya English mein baat karna chahein to bata dein.)`
    );
  }

  return `Found ${count} verified${rentWord} ${count === 1 ? 'listing' : 'listings'}:\n\n${lines}`;
}

/** Honest zero-result reply. Never suggests a price, never invents stock. */
export function buildNoMatchesReply(lang: ReplyLang, isRent: boolean): string {
  const rentWord = forRentWord(lang, isRent);

  if (lang === 'urdu') {
    return `اس سرچ پر ابھی کوئی تصدیق شدہ${rentWord} پراپرٹی نہیں ملی۔ ایریا یا بجٹ تھوڑا بدل کر بتائیں؟`;
  }

  if (lang === 'roman-urdu') {
    return `Is search par abhi koi verified${rentWord} property nahi mili. Area ya budget thora change kar ke batayein?`;
  }

  if (lang === 'other-regional') {
    return (
      `Is search par abhi koi verified${rentWord} property nahi mili. ` +
      `Area ya budget thora change kar ke batayein? ` +
      `(Urdu ya English mein baat karni ho to bata dein.)`
    );
  }

  return `No verified${rentWord} listings match that search right now. Want to try a different area or budget?`;
}