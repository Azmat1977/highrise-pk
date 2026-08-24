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
// Explicit English detection. Without this, an English message with no Urdu
// words returned null and inherited the previous language, so "how much cvt
// on property in pakistan?" was answered in Roman Urdu.
const ENGLISH_HINTS = new RegExp(
  [
    '\\b(the|is|are|was|were|have|has|do|does|did|can|could|would|should|will)\\b',
    '\\b(i|you|we|they|my|your|our|their|me|us|them)\\b',
    '\\b(what|how|why|when|where|which|who)\\b',
    '\\b(want|need|know|looking|find|show|tell|help|please|thanks|thank)\\b',
    '\\b(property|house|plot|rent|buy|price|tax|about|much|many)\\b',
  ].join('|'),
  'i',
);

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
    // Only reached when there is no Urdu signal at all.
    if (ENGLISH_HINTS.test(input)) return 'english';
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

/**
 * Tell the user which location filter was actually applied. Silence here is
 * what made the old search dangerous: an unrecognised area was dropped and
 * unrelated listings were presented as if they matched.
 */
function locationNote(
  lang: ReplyLang,
  location?: string,
  unavailableLocation?: string,
): string {
  if (location) {
    if (lang === 'urdu') return ` (${location} میں)`;
    return ` in ${location}`;
  }

  if (unavailableLocation) {
    if (lang === 'urdu') {
      return `\n\nنوٹ: ${unavailableLocation} میں ابھی کوئی تصدیق شدہ لسٹنگ نہیں، اس لیے یہ دوسرے علاقوں سے ہیں۔`;
    }
    if (lang === 'english') {
      return `\n\nNote: nothing verified in ${unavailableLocation} yet, so these are from other areas.`;
    }
    return `\n\nNote: ${unavailableLocation} mein abhi koi verified listing nahi, is liye yeh doosray areas se hain.`;
  }

  return '';
}

/** Header shown above the listing lines when matches were found. */
export function buildMatchesReply(
  lang: ReplyLang,
  count: number,
  listings: PropertyCard[],
  isRent: boolean,
  location?: string,
  unavailableLocation?: string,
): string {
  const lines = formatListingLines(listings);
  const rentWord = forRentWord(lang, isRent);

  const inLocation = location ? locationNote(lang, location) : '';
  const caveat = location ? '' : locationNote(lang, undefined, unavailableLocation);

  if (lang === 'urdu') {
    return `${count} تصدیق شدہ${rentWord} پراپرٹی${inLocation} ملی ہیں:\n\n${lines}${caveat}`;
  }

  if (lang === 'roman-urdu') {
    return `${count} verified${rentWord} property${inLocation} mil gayi hain:\n\n${lines}${caveat}`;
  }

  if (lang === 'other-regional') {
    return (
      `${count} verified${rentWord} property${inLocation} mil gayi hain:\n\n${lines}${caveat}\n\n` +
      `(Aap Urdu ya English mein baat karna chahein to bata dein.)`
    );
  }

  return `Found ${count} verified${rentWord} ${count === 1 ? 'listing' : 'listings'}${inLocation}:\n\n${lines}${caveat}`;
}

/** Honest zero-result reply. Never suggests a price, never invents stock. */
export function buildNoMatchesReply(
  lang: ReplyLang,
  isRent: boolean,
  location?: string,
  unavailableLocation?: string,
): string {
  const rentWord = forRentWord(lang, isRent);
  const place = location ?? unavailableLocation;

  if (place) {
    if (lang === 'urdu') {
      return `${place} میں ابھی کوئی تصدیق شدہ${rentWord} پراپرٹی نہیں ملی۔ کسی اور علاقے یا بجٹ میں دیکھیں؟`;
    }
    if (lang === 'english') {
      return `No verified${rentWord} listings in ${place} right now. Want to try another area or budget?`;
    }
    if (lang === 'other-regional') {
      // Pashto, Punjabi and similar: we do not fake fluency, so reply in the
      // closest widely understood language and offer an explicit choice.
      return (
        `${place} mein abhi koi verified${rentWord} property nahi mili. ` +
        `Kisi aur area ya budget mein dekhein? ` +
        `(Aap Urdu ya English mein baat karna chahein to bata dein.)`
      );
    }
    return `${place} mein abhi koi verified${rentWord} property nahi mili. Kisi aur area ya budget mein dekhein?`;
  }

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

/**
 * Per-message language directive injected into the model prompt.
 *
 * A general persona rule ("never mix scripts") proved too weak: the model
 * still answered "Aap ko kis cheez mein madad chahiye - plot, [urdu script]?"
 * to a Roman Urdu question. An explicit, per-request instruction naming the
 * exact script is far harder to ignore than a standing guideline.
 */
export function buildLanguageDirective(lang: ReplyLang): string {
  const header = '\n\nLANGUAGE FOR THIS REPLY (server-detected, follow exactly):';

  if (lang === 'urdu') {
    return (
      `${header}\n` +
      '- The user wrote in Urdu script. Reply ONLY in Urdu script.\n' +
      '- Do not mix Latin/Roman letters into the sentence, except for numbers, ' +
      'listing references and place codes such as G-13 or F-6.'
    );
  }

  if (lang === 'roman-urdu') {
    return (
      `${header}\n` +
      '- The user wrote Roman Urdu (Urdu using English letters). Reply ONLY in Roman Urdu.\n' +
      '- Use Latin letters only. Do NOT output any Urdu script characters at all.\n' +
      '- Wrong: mixing an Urdu-script word into a Roman Urdu sentence.\n' +
      '- Right: "Aap ko kya chahiye - plot, ghar ya rent?"\n' +
      '- Mirror the user register: simple, warm, conversational.\n' +
      '- This overrides the conversation history. If earlier turns were in ' +
      'English but the user has now switched to Roman Urdu, follow the switch.'
    );
  }

  if (lang === 'other-regional') {
    return (
      `${header}\n` +
      '- The user wrote in a regional language (Punjabi, Pashto, Sindhi or Balochi).\n' +
      '- If you can genuinely write that language well, do so.\n' +
      '- If not, reply in Roman Urdu using Latin letters only, and ask once ' +
      'whether they prefer Urdu or English. Never fake fluency.\n' +
      '- Do not mix scripts in one reply.'
    );
  }

  return (
    `${header}\n` +
    '- The user just wrote in ENGLISH. Reply ONLY in English.\n' +
    '- This overrides the conversation history. Even if earlier turns were in ' +
    'Roman Urdu or Urdu, this reply must be in English, because the user has ' +
    'switched language and you must follow them.\n' +
    '- Do not insert Urdu or Roman Urdu words. No "aap", no "hai", no "kar".\n' +
    '- Wrong: "CVT wo tax hai jo property par lagta hai"\n' +
    '- Right: "CVT is a tax applied to the property value"'
  );
}