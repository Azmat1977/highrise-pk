// pages/api/ai/chat.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
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
  buildProfileNudge,
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
import {
  detectKnowledgeTopics,
  buildKnowledgeDirective,
} from '@/lib/aleem/knowledgeDirective';
import { checkHoneypot } from '@/lib/security/botDefense';

interface GeminiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 8;

let dailyRequestCount = 0;
let dailyQuotaResetTime = Date.now() + 24 * 60 * 60 * 1000;

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeMessageId(): string {
  return `msg_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
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

function sanitizeMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';

  return message
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH)
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/###\s*System:/gi, '')
    .replace(/###\s*Assistant:/gi, '')
    .replace(/You are now/gi, 'The user says they are now')
    .replace(/Ignore (previous|all|above) instructions?/gi, 'The user mentions ignoring instructions');
}

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

function checkAndResetDailyQuota(): void {
  if (Date.now() >= dailyQuotaResetTime) {
    dailyRequestCount = 0;
    dailyQuotaResetTime = Date.now() + 24 * 60 * 60 * 1000;
  }
}

function isDailyQuotaNearLimit(): boolean {
  checkAndResetDailyQuota();
  const DAILY_LIMIT = 1500;
  return dailyRequestCount >= DAILY_LIMIT * 0.8;
}

function isDailyQuotaExceeded(): boolean {
  checkAndResetDailyQuota();
  return dailyRequestCount >= 1500;
}

function getSmartFallbackResponse(message: string): string {
  return getFallbackReply(message);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  }

  try {
    const auth = await getOptionalAuth(req);
    const userId = auth?.id;
    const isGuest = !userId;

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

    await dbConnect();

    const {
      message: rawMessage,
      history: rawHistory,
      context: rawContext,
      sessionId: rawSessionId,
      honeypot: rawHoneypot,
    } = req.body;

    if (!checkHoneypot(rawHoneypot ?? '')) {
      await logSecurityEvent({
        eventType: 'ai_chat_bot_blocked',
        severity: 'medium',
        userId,
        ipAddress: clientIP,
        userAgent,
        metadata: {
          requestId,
          code: 'HONEYPOT',
          action: 'chat_blocked',
        },
      });

      return res.status(400).json({
        success: false,
        message: 'Unable to process this request. Please try again.',
        requestId,
      });
    }

    if (!rawMessage || typeof rawMessage !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
        requestId,
      });
    }

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

    let history = validateHistory(rawHistory);
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

    const foundProfile = extractProfile(message);
    const { merged: fullProfile, added: newlyAdded } = mergeProfile(
      knownProfile,
      foundProfile,
    );

    const newProfile = newlyAdded.length > 0 ? foundProfile : undefined;
    const pageContext = parseAleemContext(rawContext);

    // GROUNDED PROPERTY SEARCH
    const searchSlots = await extractSearchSlots(message, history);

    if (searchSlots) {
      try {
        const searchResult = await searchProperties(searchSlots);
        const matchCount = searchResult.matches.length;
        const msgId = makeMessageId();

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
            messageId: msgId,
            response: matchesReply,
            listings: searchResult.matches,
            search: searchResult.filters,
            grounded: true,
            cached: false,
            requestId,
          });
        }

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
          messageId: msgId,
          response: noMatchReply,
          listings: [],
          search: searchResult.filters,
          grounded: true,
          cached: false,
          requestId,
        });
      } catch {
        // Search failed — fall through
      }
    }

    // CONSENT HANDLER
    const consentSlugs = validateListingSlugs(req.body?.lastListings);

    if (consentSlugs.length > 0 && detectConsent(message) && isGuest) {
      return res.status(200).json({
        success: true,
        messageId: makeMessageId(),
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
          messageId: makeMessageId(),
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
        // Lead creation failed — fall through
      }
    }

    // RESOLVE PAGE CONTEXT
    let resolvedContext = null as Awaited<ReturnType<typeof resolveAleemContext>>;
    if (pageContext) {
      try {
        resolvedContext = await resolveAleemContext(pageContext);
      } catch {
        resolvedContext = null;
      }
    }

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
        messageId: makeMessageId(),
        response: cachedResponse,
        cached: true,
        requestId,
      });
    }

    // CHECK DAILY QUOTA
    if (isDailyQuotaExceeded()) {
      await logSecurityEvent({
        eventType: 'ai_daily_quota_exceeded',
        severity: 'high',
        userId,
        ipAddress: clientIP,
        userAgent,
        metadata: { dailyCount: dailyRequestCount },
      });

      const fallbackResponse = getSmartFallbackResponse(message);

      return res.status(200).json({
        success: true,
        messageId: makeMessageId(),
        response: fallbackResponse,
        usedFallback: true,
        reason: 'Daily quota exceeded',
        requestId,
      });
    }

    if (isDailyQuotaNearLimit()) {
      console.warn(`⚠️ AI quota warning: ${dailyRequestCount}/1500 requests used today`);
    }

    // CALL AI ENGINE
    let aiResponse: string;
    let tokensUsed = 0;
    let usedFallback = false;
    let aiProvider: string | null = null;
    let aiModelName: string | null = null;

    const chatHistory = history.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const profileNudge = buildProfileNudge(missingFields(fullProfile), turnCount);
    const languageDirective = buildLanguageDirective(
      detectReplyLang(message, history.map((h) => h.content)),
    );
    const knowledgeDirective = buildKnowledgeDirective(detectKnowledgeTopics(message));
    const safetyDirective = buildSafetyDirective(detectSafetyTopics(message));

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
          // Non-fatal
        }
      }
    }

    const combinedContext = [
      knowledgeDirective,
      resolvedContext?.block ?? '',
      comparisonDirective,
      safetyDirective,
      profileNudge,
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

      aiCache.set(cacheKey, aiResponse);
    } else {
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

    const assistantMsgId = makeMessageId();

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

    void aiProvider;
    void aiModelName;

    return res.status(200).json({
      success: true,
      messageId: assistantMsgId,
      response: aiResponse,
      conversationId,
      sessionId,
      usedFallback,
      tokensUsed,
      poweredBy: usedFallback ? null : 'ALEEM',
      cached: false,
      requestId,
    });

  } catch {
    await logSecurityEvent({
      eventType: 'ai_chat_error',
      severity: 'critical',
      ipAddress: clientIP,
      userAgent,
      metadata: { requestId },
    });

    const rawBodyMessage = typeof req.body?.message === 'string' ? req.body.message : '';
    const fallbackResponse = getSmartFallbackResponse(rawBodyMessage);

    return res.status(200).json({
      success: true,
      messageId: makeMessageId(),
      response: fallbackResponse,
      usedFallback: true,
      reason: 'System error',
      requestId,
    });
  }
}