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
// Letters that appear in Pashto but not standard Urdu.
const PASHTO_ONLY = /[\u067C\u0681\u0685\u0689\u0693\u0696\u069A\u06AB\u06BC\u06CD]/;
// Distinctive Roman Punjabi / Pashto words.
const ROMAN_REGIONAL =
  /\b(tuhada|tuhanu|tusi|assi|menu|mainu|kithe|kinna|changa|hega|sanu|za|zama|staso|tase|څنګه|pekhawar)\b/i;

const ROMAN_URDU_HINTS =
  /\b(hai|hain|kya|kia|mein|main|aap|ap|chahiye|chahye|karna|kar|mujhe|mujhy|dhoond|dhundh|batao|batayein|acha|theek|ghar|zameen|paisay|kitna|kahan|kaise)\b/i;

/** Detect the reply language from the user's own message. */
export function detectReplyLang(message: string): ReplyLang {
  const text = typeof message === 'string' ? message : '';
  if (!text.trim()) return 'english';

  if (PASHTO_ONLY.test(text)) return 'other-regional';
  if (URDU_SCRIPT.test(text)) return 'urdu';
  if (ROMAN_REGIONAL.test(text)) return 'other-regional';
  if (ROMAN_URDU_HINTS.test(text)) return 'roman-urdu';
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