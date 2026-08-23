// lib/aleem/fallbackReplies.ts
// ALEEM - short, human fallback replies.
//
// Used ONLY when every AI provider is unavailable. These must sound like a
// person typing quickly, not a brochure: one or two sentences, no bullet
// lists, no feature menus, no emoji walls. A real agent answering on WhatsApp
// does not send a formatted product tour when someone says "hi".
//
// Hard rule unchanged: never invent a price, rate, ROI or market average.

import { detectReplyLang, type ReplyLang } from '@/lib/aleem/searchReplies';

type Lang = ReplyLang;

function pick(lang: Lang, roman: string, urdu: string, english: string): string {
  if (lang === 'urdu') return urdu;
  // Regional speakers get Roman Urdu with a language offer, never fake fluency.
  if (lang === 'roman-urdu' || lang === 'other-regional') return roman;
  return english;
}

// ---------------------------------------------------------------------------
// Intent buckets - deliberately narrow, word-boundary matched so "chahiye"
// can never match "hi" and "this" can never match "hi".
// ---------------------------------------------------------------------------

const GREETING = /\b(hello|hi|hey|salam|slam|assalam|assalamualaikum|aoa)\b/i;
const THANKS = /\b(thanks|thank you|shukriya|shukria|jazakallah)\b/i;
const PRICE = /\b(price|prices|rate|rates|cost|worth|value|qeemat|keemat|bhao)\b/i;
const SEARCH = /\b(plot|house|ghar|home|flat|apartment|shop|file|kanal|marla|rent|kiraya|buy|kharid|khareed)\b/i;
const PROCESS = /\b(transfer|registry|noc|documents|papers|kagzat|process|tax|cvt|bayana|token)\b/i;
const HELP = /\b(help|madad|guide|advice|mashwara|suggest)\b/i;

/**
 * Short offline reply. Mirrors the user's language and asks ONE question -
 * the way a person actually replies when they are busy but helpful.
 */
export function getFallbackReply(message: string, previous: string[] = []): string {
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) {
    return 'Ji, batayein?';
  }

  const lang: Lang = detectReplyLang(text, previous);

  if (GREETING.test(text) && text.length < 60) {
    return pick(
      lang,
      'Walaikum assalam! Batayein, kya dhundh rahe hain?',
      'وعلیکم السلام! بتائیں، کیا تلاش کر رہے ہیں؟',
      'Hello! What are you looking for?',
    );
  }

  if (THANKS.test(text)) {
    return pick(
      lang,
      'Koi baat nahi. Aur kuch poochna ho to batayein.',
      'کوئی بات نہیں۔ اور کچھ پوچھنا ہو تو بتائیں۔',
      'Anytime. Let me know if you need anything else.',
    );
  }

  if (PRICE.test(text)) {
    return pick(
      lang,
      'Rate location aur size par depend karta hai, main andaza nahi lagaunga. Aap area aur budget batayein, verified listings nikaal ke dikhata hoon.',
      'ریٹ لوکیشن اور سائز پر منحصر ہے، میں اندازہ نہیں لگاؤں گا۔ آپ ایریا اور بجٹ بتائیں، میں تصدیق شدہ لسٹنگ دکھاتا ہوں۔',
      'Rates depend on the exact location and size, so I will not guess. Tell me the area and your budget and I will pull verified listings.',
    );
  }

  if (SEARCH.test(text)) {
    return pick(
      lang,
      'Theek hai. Kis city ya society mein, aur budget kitna hai?',
      'ٹھیک ہے۔ کس شہر یا سوسائٹی میں، اور بجٹ کتنا ہے؟',
      'Sure. Which city or society, and what is your budget?',
    );
  }

  if (PROCESS.test(text)) {
    return pick(
      lang,
      'Us par guide kar sakta hoon. Property kis city mein hai, aur aap buyer hain ya seller?',
      'اس پر رہنمائی کر سکتا ہوں۔ پراپرٹی کس شہر میں ہے، اور آپ خریدار ہیں یا بیچنے والے؟',
      'I can walk you through that. Which city is the property in, and are you buying or selling?',
    );
  }

  if (HELP.test(text)) {
    return pick(
      lang,
      'Zaroor. Kya cheez dhundh rahe hain - plot, ghar, ya kiraya?',
      'ضرور۔ کیا چیز تلاش کر رہے ہیں - پلاٹ، گھر، یا کرایہ؟',
      'Of course. What are you after - a plot, a house, or a rental?',
    );
  }

  // Unknown intent. Ask, do not lecture.
  return pick(
    lang,
    'Samajh gaya. Thora detail se batayein - kya dhundh rahe hain aur kis area mein?',
    'سمجھ گیا۔ ذرا تفصیل سے بتائیں - کیا تلاش کر رہے ہیں اور کس ایریا میں؟',
    'Got it. Tell me a bit more - what are you looking for, and in which area?',
  );
}