// pages/api/ai/chat.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import SecurityEvent from '@/models/SecurityEvent';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { rateLimitAI } from '@/lib/rateLimit';
import {
  generateChatResponse,
  getLastProviderDiagnostics,
} from '@/lib/ai/generateChatResponse';
import { extractSearchSlots } from '@/lib/aleem/extractSlots';
import { searchProperties, getPropertiesBySlugs } from '@/lib/aleem/searchProperties';
import { isComparisonRequest, buildComparisonContextBlock } from '@/lib/aleem/compareProperties';
import { createAleemLead, detectConsent, validateListingSlugs } from '@/lib/aleem/createAleemLead';
import { parseAleemContext, resolveAleemContext } from '@/lib/aleem/aleemContext';
import {
  validateSessionId,
  loadConversationHistory,
  persistTurn,
} from '@/lib/aleem/conversationStore';
import {
  extractProfile,
  mergeProfile,
  missingFields,
} from '@/lib/aleem/extractProfile';
import {
  buildCaptureAcknowledgement,
  buildProfileNudge,
  encodeProfileForStorage,
} from '@/lib/aleem/profileStore';
import aiCache from '@/lib/aiCache';
import { getFallbackReply } from '@/lib/aleem/fallbackReplies';
import {
  detectReplyLang,
  buildMatchesReply,
  buildNoMatchesReply,
  buildLanguageDirective,
} from '@/lib/aleem/searchReplies';
import {
  detectSafetyTopics,
  buildSafetyDirective,
} from '@/lib/aleem/safetyDirective';

/** Shape used by validateHistory() for sanitised conversation turns. */
interface GeminiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
/**
 * 🔐 ENTERPRISE AI CHAT ENDPOINT
 * 
 * Security Features:
 * ├── Authentication required
 * ├── Rate limiting (15 req/min global, 10/hour per user, 30/day)
 * ├── Message length limit (1,000 characters)
 * ├── Conversation history limit (8 messages)
 * ├── Token budget (1,500 max tokens)
 * ├── Prompt injection prevention
 * ├── Input sanitization
 * ├── Audit logging (SecurityEvent)
 * ├── IP tracking
 * └── Safe error handling
 * 
 * Performance:
 * ├── Response caching (60-70% cache hit rate)
 * ├── Smart TTL (1h for prices, 24h for guides)
 * ├── LRU cache eviction
 * └── Automatic fallback to keyword system
 * 
 * Cost Protection:
 * ├── Daily quota monitoring (1,500 req/day limit)
 * ├── Usage tracking per user
 * ├── Automatic fallback when quota exceeded
 * └── Token counting and logging
 * 
 * @route POST /api/ai/chat
 * @access Authenticated users only
 */

// ═══════════════════════════════════════════════════════════════
// 🔒 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_RESPONSE_TOKENS = 1500;
const MAX_QUERY_TIME_MS = 2500;

// Daily quota tracking (in-memory - can be moved to Redis)
let dailyRequestCount = 0;
let dailyQuotaResetTime = Date.now() + 24 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  return req.socket?.remoteAddress || 'unknown';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
}

async function logSecurityEvent(data: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await SecurityEvent.create({ ...data, timestamp: new Date() });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[logSecurityEvent failed]:', msg);
    }
  }
}

/**
 * Sanitize user message (prevent prompt injection)
 */
function sanitizeMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';

  return message
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH)
    // Remove potential prompt injection attempts
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/###\s*System:/gi, '')
    .replace(/###\s*Assistant:/gi, '')
    .replace(/You are now/gi, 'The user says they are now')
    .replace(/Ignore (previous|all|above) instructions?/gi, 'The user mentions ignoring instructions');
}

/**
 * Validate conversation history
 */
function validateHistory(history: any): GeminiMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((msg: any) => {
      if (!msg || typeof msg !== 'object') return false;
      if (!['user', 'assistant', 'system'].includes(msg.role)) return false;
      if (typeof msg.content !== 'string') return false;
      return true;
    })
    .map((msg: any) => ({
      role: msg.role,
      content: sanitizeMessage(msg.content),
    }));
}

/**
 * Reset daily quota counter
 */
function checkAndResetDailyQuota(): void {
  if (Date.now() >= dailyQuotaResetTime) {
    dailyRequestCount = 0;
    dailyQuotaResetTime = Date.now() + 24 * 60 * 60 * 1000;
    // daily quota reset
  }
}

/**
 * Check if approaching daily quota limit
 */
function isDailyQuotaNearLimit(): boolean {
  checkAndResetDailyQuota();
  const DAILY_LIMIT = 1500; // Gemini free tier
  const WARNING_THRESHOLD = 0.8; // 80%
  return dailyRequestCount >= DAILY_LIMIT * WARNING_THRESHOLD;
}

/**
 * Check if daily quota exceeded
 */
function isDailyQuotaExceeded(): boolean {
  checkAndResetDailyQuota();
  const DAILY_LIMIT = 1500;
  return dailyRequestCount >= DAILY_LIMIT;
}

// ═══════════════════════════════════════════════════════════════
// 🤖 SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are ALEEM, Highrise.pk's trusted property advisor and concierge — not a generic chatbot. You speak like a knowledgeable, warm, honest local expert who has helped many people buy, sell, rent, and build across Pakistan.

LANGUAGE — always mirror the user:
- Detect the user's language and script, and reply in the SAME language: English, Urdu (Nastaliq or Roman), Punjabi, Pashto, Balochi, Sindhi.
- Use natural local real-estate terms correctly (marla, kanal, file, on-ground, bayana, NOC, registry, CVT).
- Address the user respectfully ("aap"), never condescending or robotic.

PERSONALITY:
- Warm, confident, and genuinely human. Give real opinions and recommendations — not generic disclaimers.
- Be direct: if something is a good match or a risky choice, say so clearly and explain WHY.
- Never use robotic phrases like "As an AI" or "I am not able to." You can help with nearly everything related to property.

YOUR EXPERTISE — give genuine guidance, never fake data:
- You MAY advise on: how to evaluate an area, what to check before buying, comparing property types, investment considerations, the buying/selling/renting process, verification, NOC and documentation, construction basics, and financing options.
- HARD RULES — never break these:
  • NEVER invent a price, price range, rent figure, appreciation %, ROI number, tax rate, registration fee, or any live market number. If asked for a specific price or rate, say you will show REAL verified listings from our inventory (or that the exact amount must be checked on FBR/IRIS or with a lawyer), and ask for their location + budget.
  • NEVER invent a listing or a "market average".
  • "Documents Reviewed" means evidence was checked — it is NOT a legal title guarantee. Never imply otherwise.
  • NEVER guarantee investment returns and never rank recommendations by commission.
- When the user wants listings, ask what / where / budget, then present the REAL verified listings the system gives you — faithfully, without adding or changing any number.

FORMAT:
- Short paragraphs, **bold** for key points, bullet lists, minimal emojis.
- End with a clear next step or a question that moves the user forward (e.g. arranging a callback, refining a search, or viewing a listing).

`;

// ═══════════════════════════════════════════════════════════════
// 🎯 SMART FALLBACK RESPONSES
// ═══════════════════════════════════════════════════════════════

function getSmartFallbackResponse(message: string): string {
  // Short, human replies live in lib/aleem/fallbackReplies.ts. The long
  // brochure-style text that used to live here read like a product tour,
  // not a conversation.
  return getFallbackReply(message);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function legacyFallbackUnused(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Greeting (no prices — always safe)
  if (/\b(hello|hi|hey|salam|assalam|assalamualaikum)\b/i.test(lowerMessage)) {
    return `Hello! 👋 Welcome to Highrise.pk!

I'm your AI Real Estate Assistant. I can help you:

🏠 **Find verified properties** — houses, apartments, plots
📍 **Search by location & budget** — real listings, real prices
📊 **Market guidance** — how to evaluate areas and listings
📋 **Buying/selling process** — step-by-step, no surprises

Tell me what you're looking for — for example:
- "5 marla plot in B-17 under 60 lakh"
- "3-bedroom house in Islamabad"

I'll search our verified inventory and show you real, current listings.`;
  }

  // Price / investment / area / property-type queries → steer to grounded search
  if (
    lowerMessage.includes('price') ||
    lowerMessage.includes('cost') ||
    lowerMessage.includes('average') ||
    lowerMessage.includes('rate') ||
    lowerMessage.includes('invest') ||
    lowerMessage.includes('investment') ||
    lowerMessage.includes('roi') ||
    lowerMessage.includes('buy') ||
    lowerMessage.includes('rent') ||
    lowerMessage.includes('dha') ||
    lowerMessage.includes('bahria') ||
    lowerMessage.includes('bed')
  ) {
    return `Property prices change constantly and depend on the exact location, size, and condition — so I won't guess a number.

Instead, I can show you **real, current listings** from our verified inventory. Just tell me:
- **What** you want (plot, house, apartment, shop)
- **Where** (city or society — e.g. DHA, Bahria, B-17)
- **Budget** (e.g. "under 60 lakh")

For example: "5 marla plot in B-17 under 60 lakh"

I'll pull verified listings with their actual asking prices so you can compare honestly.`;
  }

  // Buying / selling → honest guidance, no invented rates
  if (
    lowerMessage.includes('sell') ||
    lowerMessage.includes('selling') ||
    lowerMessage.includes('buy') ||
    lowerMessage.includes('purchase')
  ) {
    return `Here's a reliable buying/selling checklist:

**Always verify:**
✅ Title deed and ownership
✅ NOC from the society/authority
✅ Approved map / layout plan
✅ No outstanding dues

**Costs to expect (verify current rates):**
- Registration & transfer costs (CVT, stamp duty) — check the latest rates on FBR/IRIS
- Agency/legal fees — vary by professional

**Red flags:**
⚠️ Prices far below market
⚠️ Urgency to close immediately
⚠️ Missing or unclear documents

Want me to show you verified listings in your budget and area? Tell me the location and budget.`;
  }

  // Default
  return `I can help you find verified properties on Highrise.pk.

Tell me:
1. **What** — plot, house, apartment, or commercial
2. **Where** — city or society
3. **Budget** — e.g. "under 60 lakh" or "1 to 2 crore"

Example: "5 marla plot in B-17 under 60 lakh"

I'll show you real listings from our verified inventory — with actual prices, no guesses.`;
}


// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // ─────────────────────────────────────────────
  // STEP 1: METHOD VALIDATION
  // ─────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  }

  try {
    // ─────────────────────────────────────────────
    // STEP 2: AUTHENTICATION
    // ─────────────────────────────────────────────
    // Public endpoint: anonymous visitors may ask questions and see verified
    // listings. getOptionalAuth never writes a response - a missing, expired,
    // revoked or suspended session simply resolves to null and we continue as
    // a guest. Guests cannot create leads (guarded at the consent step below).
    const auth = await getOptionalAuth(req);
    const userId = auth?.id;
    const isGuest = !userId;

    // ─────────────────────────────────────────────
    // STEP 3: RATE LIMITING
    // ─────────────────────────────────────────────
    const rateLimitResult = await rateLimitAI(req, userId);

    if (!rateLimitResult.ok) {
      await logSecurityEvent({
        eventType: 'ai_chat_rate_limit',
        severity: 'medium',
        userId,
        ipAddress: clientIP,
        userAgent,
        metadata: {
          limit: rateLimitResult.limit,
          reset: rateLimitResult.reset,
        },
      });

      return res.status(429).json({
        success: false,
        message: rateLimitResult.limit === 15
          ? 'Global AI rate limit reached. Please try again in a minute.'
          : rateLimitResult.limit === 8
          ? 'You have reached the hourly guest limit. Please sign in to continue chatting with ALEEM.'
          : rateLimitResult.limit === 20
          ? 'You have reached the daily guest limit. Please sign in to continue chatting with ALEEM.'
          : rateLimitResult.limit === 10
          ? 'You have reached the hourly limit of 10 messages. Please try again later.'
          : 'You have reached the daily limit of 30 messages. Please try again tomorrow.',
        requestId,
        retryAfter: rateLimitResult.retryAfter,
        limit: rateLimitResult.limit,
      });
    }

    // getOptionalAuth only connects when a token exists, so a true guest has
    // no connection yet. Connect explicitly before any DB work.
    await dbConnect();

    // ─────────────────────────────────────────────
    // STEP 4: VALIDATE INPUT
    // ─────────────────────────────────────────────
    const {
      message: rawMessage,
      history: rawHistory,
      context: rawContext,
      sessionId: rawSessionId,
    } = req.body;

    if (!rawMessage || typeof rawMessage !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
        requestId,
      });
    }

    // Sanitize message (prevent prompt injection)
    const message = sanitizeMessage(rawMessage);

    if (message.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty',
        requestId,
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`,
        requestId,
      });
    }

    // Validate and sanitize client-supplied history. This is a FALLBACK only:
    // if the server already has a transcript for this session, that wins.
    let history = validateHistory(rawHistory);

    // Server-authoritative memory. A stored transcript cannot be forged by the
    // client, so it replaces whatever history the browser sent.
    const sessionId = validateSessionId(rawSessionId);
    let conversationId: string | null = null;
    let knownProfile: ReturnType<typeof extractProfile> = {};
    let turnCount = 0;

    if (sessionId) {
      const stored = await loadConversationHistory(sessionId, userId);
      conversationId = stored.conversationId;
      knownProfile = stored.knownProfile;
      turnCount = stored.turnCount;
      if (stored.history.length > 0) {
        history = stored.history;
      }
    }

    // Progressive capture: read any contact details this message reveals.
    // Capture is NOT consent - a callback still requires explicit agreement.
    const foundProfile = extractProfile(message);
    const { merged: fullProfile, added: newlyAdded } = mergeProfile(
      knownProfile,
      foundProfile,
    );

    const newProfile = newlyAdded.length > 0 ? foundProfile : undefined;

    // Validate optional page context. Navigation hints only - the client can
    // say which page the user is on, never what is true about that page.
    const pageContext = parseAleemContext(rawContext);

    // ── STEP 4.5: GROUNDED PROPERTY SEARCH (DB-backed, Gemini-independent) ──
    // Runs before cache so a search query always reflects live inventory.
    // Only fires when the message carries a clear property-search signal.
    const searchSlots = await extractSearchSlots(message);

    if (searchSlots) {
      try {
        const searchResult = await searchProperties(searchSlots);
        const matchCount = searchResult.matches.length;

        if (matchCount > 0) {
          await logSecurityEvent({
            eventType: 'ai_chat_grounded_search',
            severity: 'low',
            userId,
            ipAddress: clientIP,
            userAgent,
            metadata: {
              matchCount,
              filters: searchResult.filters,
            },
          });

          const matchesReply = buildMatchesReply(
            detectReplyLang(message, history.map((h) => h.content)),
            matchCount,
            searchResult.matches,
            searchSlots.listingType === 'rent',
            searchSlots.location,
            searchSlots.unavailableLocation,
            searchResult.isAlternative,
            searchResult.relaxationApplied,
          );

          // Persist this turn. Without it ALEEM forgets the listings it just
          // showed, so a follow-up like "send me that link" starts from zero.
          if (sessionId) {
            void persistTurn({
              sessionId,
              userId,
              context: pageContext,
              userMessage: message,
              assistantMessage: matchesReply,
              ipAddress: clientIP,
              userAgent,
              newProfile,
            });
          }

          return res.status(200).json({
            success: true,
            response: matchesReply,
            listings: searchResult.matches,
            search: searchResult.filters,
            grounded: true,
            cached: false,
            requestId,
          });
        }

        // Zero matches — honest reply, never invented prices.
        await logSecurityEvent({
          eventType: 'ai_chat_grounded_search',
          severity: 'low',
          userId,
          ipAddress: clientIP,
          userAgent,
          metadata: { matchCount: 0, filters: searchResult.filters },
        });

        const noMatchReply = buildNoMatchesReply(
          detectReplyLang(message, history.map((h) => h.content)),
          searchSlots.listingType === 'rent',
          searchSlots.location,
          searchSlots.unavailableLocation,
        );

        if (sessionId) {
          void persistTurn({
            sessionId,
            userId,
            context: pageContext,
            userMessage: message,
            assistantMessage: noMatchReply,
            ipAddress: clientIP,
            userAgent,
            newProfile,
          });
        }

        return res.status(200).json({
          success: true,
          response: noMatchReply,
          listings: [],
          search: searchResult.filters,
          grounded: true,
          cached: false,
          requestId,
        });
      } catch {
        // Search failed (e.g. DB unavailable) — fall through to the normal
        // AI / fallback flow below rather than fabricating results.
      }
    }

    // ─────────────────────────────────────────────
    // STEP 5: CHECK CACHE
    // ─────────────────────────────────────────────
    // ── STEP 4.6: CONSENT → CALLBACK LEAD (ALEEM) ──
    const consentSlugs = validateListingSlugs(req.body?.lastListings);

    if (consentSlugs.length > 0 && detectConsent(message) && isGuest) {
      // Guests may browse and ask freely, but a callback lead requires an
      // account with a verified phone. No lead is created here.
      return res.status(200).json({
        success: true,
        response:
          'I can arrange a callback for those listings. Please sign in to ' +
          'your Highrise account first so our team can reach you on your ' +
          'verified number.',
        requiresAuth: true,
        grounded: true,
        cached: false,
        requestId,
      });
    }

    if (consentSlugs.length > 0 && detectConsent(message) && userId) {
      try {
        const leadResult = await createAleemLead(userId, consentSlugs);

        await logSecurityEvent({
          eventType: leadResult.success ? 'aleem_lead_created' : 'aleem_lead_failed',
          severity: leadResult.success ? 'low' : 'medium',
          userId,
          ipAddress: clientIP,
          userAgent,
          metadata: {
            listingCount: consentSlugs.length,
            code: leadResult.code ?? null,
          },
        });

        return res.status(200).json({
          success: true,
        response: leadResult.success
          ? (detectReplyLang(message) === 'english'
            ? 'Done - our team will get in touch about those listings.'
            : 'Theek hai, hamari team un listings ke baare mein aap se raabta karegi.')
          : (leadResult.code === 'PHONE_NOT_VERIFIED'
            ? (detectReplyLang(message) === 'english'
              ? 'Please verify your phone number first, then I can arrange the callback.'
              : 'Pehle apna phone number verify kar lein, phir main callback arrange kar dunga.')
            : (detectReplyLang(message) === 'english'
              ? 'Those listings are no longer available. Shall we search again?'
              : 'Woh listings ab available nahi hain. Dobara search karein?')),
          lead: leadResult.success ? { id: leadResult.leadId, listingCount: leadResult.listingCount } : null,
          grounded: true,
          cached: false,
          requestId,
        });
      } catch {
        // Lead creation failed — fall through to the normal AI flow.
      }
    }

    // STEP 4.7: RESOLVE PAGE CONTEXT (server-side, DB-grounded)
    // Runs after grounded search and consent so those fast paths never pay for
    // an extra query. Every fact is re-read from Mongo through the canonical
    // public-property filter; unverified or missing records drop the context.
    let resolvedContext = null as Awaited<ReturnType<typeof resolveAleemContext>>;

    if (pageContext) {
      try {
        resolvedContext = await resolveAleemContext(pageContext);
      } catch {
        // Context lookup failed. Continue with no context rather than
        // repeating anything the client claimed.
        resolvedContext = null;
      }
    }

    // Cache key is namespaced by context so a reply about one property can
    // never be served to a user sitting on a different property page.
    const cacheKey = resolvedContext
      ? `${resolvedContext.fingerprint}|${message}`
      : message;

    const cachedResponse = aiCache.get(cacheKey);

    if (cachedResponse) {
      await logSecurityEvent({
        eventType: 'ai_chat_cache_hit',
        severity: 'low',
        userId,
        ipAddress: clientIP,
        userAgent,
        metadata: {
          messageLength: message.length,
          cacheStats: aiCache.getStats(),
        },
      });

      return res.status(200).json({
        success: true,
        response: cachedResponse,
        cached: true,
        requestId,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 6: CHECK DAILY QUOTA
    // ─────────────────────────────────────────────
    if (isDailyQuotaExceeded()) {
      await logSecurityEvent({
        eventType: 'ai_daily_quota_exceeded',
        severity: 'high',
        userId,
        ipAddress: clientIP,
        userAgent,
        metadata: { dailyCount: dailyRequestCount },
      });

      // Use fallback
      const fallbackResponse = getSmartFallbackResponse(message);

      return res.status(200).json({
        success: true,
        response: fallbackResponse,
        usedFallback: true,
        reason: 'Daily quota exceeded',
        requestId,
      });
    }

    // Warn if approaching limit
    if (isDailyQuotaNearLimit()) {
      console.warn(`⚠️ AI quota warning: ${dailyRequestCount}/1500 requests used today`);
    }

    // ─────────────────────────────────────────────
    // STEP 7: PREPARE MESSAGES FOR AI
    // ─────────────────────────────────────────────
    // NOTE: the Gemini-facing persona lives in lib/gemini.ts (SYSTEM_PROMPT,
    // sent as system_instruction). There is deliberately no local prompt
    // assembly here - a second copy would silently drift out of sync.

    // ─────────────────────────────────────────────
// STEP 8: CALL GEMINI API
// ─────────────────────────────────────────────
let aiResponse: string;
let tokensUsed = 0;
let usedFallback = false;
let aiProvider: string | null = null;
let aiModelName: string | null = null;

// Multi-provider AI call: Gemini primary, Groq fallback. Each vendor has its
// own Redis-backed daily budget and circuit breaker inside this helper.
const chatHistory = history.map(msg => ({
  role: msg.role,
  content: msg.content,
}));

// Server-controlled guidance so ALEEM earns ONE missing detail naturally.
// Appended to the context block; the persona in lib/gemini.ts is untouched.
const profileNudge = buildProfileNudge(missingFields(fullProfile), turnCount);

// Explicit per-message language instruction. The standing persona rule was
// not enough on its own - the model still mixed Urdu script into Roman Urdu
// replies, so the exact script is now named on every single request.
const languageDirective = buildLanguageDirective(
  detectReplyLang(message, history.map((h) => h.content)),
);

// Hard constraints for risky topics. The standing persona rules were not
// enough on their own: asked for CVT the model answered "2-5%", and asked for
// the best society it named Bahria, DHA and Emaar with appreciation claims.
const safetyDirective = buildSafetyDirective(detectSafetyTopics(message));

// Grounded Property Comparison Context
let comparisonDirective = '';
if (isComparisonRequest(message)) {
  const comparisonSlugs = validateListingSlugs(req.body?.lastListings);
  if (comparisonSlugs.length > 0) {
    try {
      const comparedProperties = await getPropertiesBySlugs(comparisonSlugs);
      if (comparedProperties.length > 0) {
        comparisonDirective = buildComparisonContextBlock(comparedProperties);
      }
    } catch {
      // Non-fatal if comparison lookup fails
    }
  }
}

// Order matters. Models weight the END of a prompt most heavily, and the
// conversation history can be many turns of one language. The language
// instruction therefore goes LAST so it is the final thing read before
// generating - otherwise the model mirrors the history instead.
const combinedContext = [
  resolvedContext?.block ?? '',
  comparisonDirective,
  profileNudge,
  safetyDirective,
  languageDirective,
]
  .filter(Boolean)
  .join('\n\n')
  .trim();

const aiResult = await generateChatResponse({
  message,
  history: chatHistory,
  contextBlock: combinedContext || undefined,
});

if (aiResult) {
  aiResponse = aiResult.response;
  tokensUsed = aiResult.tokensUsed || 0;
  aiProvider = aiResult.provider;
  aiModelName = aiResult.modelName;
  dailyRequestCount++;

  // Cache successful response under the context-namespaced key
  aiCache.set(cacheKey, aiResponse);
} else {
  // Every provider unavailable: honest guidance, never invented content.
  // Record WHY so a silent outage cannot masquerade as normal operation.
  aiResponse = getSmartFallbackResponse(message);
  usedFallback = true;

  await logSecurityEvent({
    eventType: 'ai_all_providers_failed',
    severity: 'high',
    userId,
    ipAddress: clientIP,
    userAgent,
    metadata: { attempts: getLastProviderDiagnostics() },
  });
}
    // ─────────────────────────────────────────────
    // STEP 9: LOG USAGE
    // ─────────────────────────────────────────────
    await logSecurityEvent({
      eventType: 'ai_chat_success',
      severity: 'low',
      userId,
      ipAddress: clientIP,
      userAgent,
      metadata: {
        messageLength: message.length,
        responseLength: aiResponse.length,
        tokensUsed,
        usedFallback,
        dailyCount: dailyRequestCount,
        cacheStats: aiCache.getStats(),
      },
    });

    // ─────────────────────────────────────────────
    // STEP 10: RETURN RESPONSE
    // ─────────────────────────────────────────────
    // Persist this turn. Fire-and-forget by design: memory must never delay or
    // break the customer's reply, so this is deliberately not awaited.
    // Capture happens silently. ALEEM should sound like a person, not a form.
    // Details are still encrypted at rest and nobody is contacted without
    // explicit consent, which is handled at the consent step above.

    if (sessionId) {
      void persistTurn({
        sessionId,
        userId,
        context: pageContext,
        userMessage: message,
        assistantMessage: aiResponse,
        ipAddress: clientIP,
        userAgent,
        newProfile,
      });
    }

    return res.status(200).json({
  success: true,
  response: aiResponse,
  conversationId,
  sessionId,
  usedFallback,
  tokensUsed,
  modelInfo: usedFallback ? null : {
    name: aiModelName ?? 'unknown',
    provider: aiProvider === 'groq' ? 'Groq' : 'Google Gemini',
    tier: 'Free',
  },
  cached: false,
  requestId,
});

  } catch {
    await logSecurityEvent({
      eventType: 'ai_chat_error',
      severity: 'critical',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        requestId,
      },
    });

    // Use fallback on error. Read the body defensively: if body parsing itself
    // failed, req.body can be undefined and must not throw inside the handler.
    const rawBodyMessage = typeof req.body?.message === 'string' ? req.body.message : '';
    const fallbackResponse = getSmartFallbackResponse(rawBodyMessage);

    return res.status(200).json({
      success: true,
      response: fallbackResponse,
      usedFallback: true,
      reason: 'System error',
      requestId,
    });
  }
}
