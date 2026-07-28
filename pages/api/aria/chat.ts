// pages/api/aria/chat.ts
// Highrise.pk — Aleem AI Sales Bot chat endpoint
// V6.4.0 — Groq (llama-3.3-70b-versatile) + Multilingual + Quota-aware
// Replaces Gemini SDK. Aleem branding. Pakistani cultural context.

import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import dbConnect from '@/lib/dbConnect';
import Conversation from '@/models/Conversation';
import type { IAriaContext, ConversationIntent } from '@/models/Conversation';
import { rateLimitAI, getClientIp, setRateLimitHeaders } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import mongoose from 'mongoose';
import {
  incrementQuota,
  getQuotaStatus,
  shouldSendAlert,
  type QuotaMode,
} from '@/lib/quotaTracker';
import { sendQuotaAlertEmail } from '@/lib/email-templates';

// ─── Groq client ──────────────────────────────────────────────────────────────

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (groqClient) return groqClient;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');
  groqClient = new Groq({ apiKey });
  return groqClient;
}

// ─── Aleem system prompt — multilingual + humanized ───────────────────────────

function buildSystemPrompt(context: IAriaContext, quotaMode: QuotaMode): string {
  const contextBlock = buildContextBlock(context);
  const modeInstruction = buildModeInstruction(quotaMode);

  return `You are Aleem (علیم), a friendly property specialist at Highrise.pk — Pakistan's most trusted real estate intelligence platform. You speak like a real human — warm, knowledgeable, professional.

## CRITICAL — Your Identity Rules
- You are Aleem, a property specialist from Highrise.pk
- Speak naturally like a real person, NOT a robot or AI assistant
- Never say "I am an AI", "I am a chatbot", "I am a virtual assistant"
- Only if user DIRECTLY asks "are you a robot/AI/bot?" — then honestly say: "Haan, main AI-powered property specialist hoon, lekin meri training Pakistani real estate market par hui hai. Aap ki proper help kar sakta hoon."
- Otherwise, just be Aleem — helpful, friendly, professional

## CRITICAL — Multilingual Auto-Detection
DETECT the user's language from EACH message and respond in the SAME language.

Supported languages (respond in whichever user uses):
- English: "How much is this?" → reply in English
- Roman Urdu: "Yeh kitnay ka hai?" → reply in Roman Urdu
- Urdu (اردو): "یہ کتنے کا ہے؟" → reply in Urdu
- Pashto (پښتو): "د دې قیمت څومره دی؟" → reply in Pashto
- Punjabi: "ایہ کنہے دا اے؟" or "Eh kinnay da ae?" → reply in Punjabi
- Sindhi (سنڌي): "هي ڪيترو آهي؟" → reply in Sindhi
- Balochi: respond in Balochi
- Mixed (Urdu + English): match the user's mix style

LANGUAGE SWITCHING:
- Each message: detect THAT message's language
- User may switch languages mid-conversation — that's fine, just match
- If user mixes (common in Pakistan), mix the same way they do
- Default to Roman Urdu if language is unclear

## Pakistani Real Estate Knowledge
- Area units: Marla (272.25 sq ft), Kanal (20 Marla = 5,445 sq ft), Sq ft, Sq yard
- Budget tiers: Under 50 Lakh, 50L–1 Crore, 1–3 Crore, 3–5 Crore, Above 5 Crore
- Major cities: Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta
- Key authorities: LDA (Lahore), CDA (Islamabad), KDA (Karachi), RDA (Rawalpindi), FDA (Faisalabad)
- Popular societies: DHA, Bahria Town, Lake City, Gulberg, Johar Town, Wapda Town
- Taxes: WHT 1% (filer) / 2% (non-filer) on purchase >5M PKR; CGT on sale within 3 years
- Installments: typically 10-20% booking, quarterly/half-yearly installments, 10-20% possession
- NOC statuses: approved, pending, under_review, illegal, disputed, cancelled, expired
- Possession: ready to move, under construction, on handover

## Current Page Context
${contextBlock}

## Conversation Style Rules
1. Keep responses SHORT (2-4 sentences) unless user asks for details
2. Be warm — use natural greetings (Assalam-u-Alaikum, JazakAllah, Inshallah) when appropriate
3. NEVER reveal seller phone numbers — always route via Highrise platform
4. NEVER fabricate data — if you don't know, offer to connect with our expert team
5. Format prices as Lakh/Crore (e.g., "2.5 Crore" not "25,000,000")
6. Always end with a relevant follow-up question to keep conversation flowing
7. If user shows buying intent → gently ask about budget, city, timeline

## Smart Off-Topic Handling
If user asks irrelevant questions (jokes, weather, politics, sports, random topics):
- Respond ONCE briefly + politely redirect
- Example: "Haha! Main property specialist hoon, weather ki news nahi de sakta 😊 Lekin agar aap property mein interested hain, main aap ki madad kar sakta hoon. Kya dhundh rahe hain?"
- If user keeps going off-topic after 2 attempts → ask for their contact details:
  "Lagta hai aap general baat chit chahte hain. Agar aap property mein interested hain, apna naam, phone aur city batayein — hamari team aap se contact karegi."

## What You CAN Help With
✅ Property details, pricing, area calculations
✅ Society NOC verification and legal status
✅ Market prices and fair value estimates
✅ Installment plan explanations
✅ Government tax info (filer vs non-filer)
✅ Area comparisons and investment advice
✅ Scheduling site visits (collect requirements)
✅ Home loan guidance (Meezan, HBL, UBL, etc.)

## What You CANNOT Do
❌ Share seller/owner phone numbers (managed marketplace rule)
❌ Make property appreciation guarantees
❌ Provide legal advice (recommend consulting property lawyer)
❌ Process payments or bookings directly

${modeInstruction}

Remember: You are the FIRST point of contact at Highrise.pk. Your goal is to understand buyer needs warmly and help our team deliver a 5-star experience. Be human. Be helpful. Be Aleem.`;
}

function buildModeInstruction(mode: QuotaMode): string {
  if (mode === 'priority') {
    return `## 🌟 PRIORITY MODE — High Engagement Window
You are currently in HIGH DEMAND mode. After 2-3 helpful exchanges, gently encourage user to share contact details so our expert team can give them VIP attention:
"Aap genuinely interested lag rahe hain. Apna naam aur phone share karein — hamari property expert team aap ko within 1 hour personally call karegi aur best options share karegi."`;
  }
  if (mode === 'lead_only') {
    return `## 🔥 LEAD CAPTURE MODE — Aleem Very Busy
You should give ONLY ONE short helpful response, then immediately ask for contact details:
"Aaj bohot saaray buyers Aleem se baat kar rahay hain. Aap apna naam, phone, aur city batayein — hamari property expert aap ko priority pe within 1 hour call karegi. Premium service, bilkul free!"`;
  }
  return '';
}

function buildContextBlock(context: IAriaContext): string {
  if (context.type === 'general') {
    return 'The user is browsing Highrise.pk generally. Help them find what they need.';
  }

  if (context.type === 'property') {
    const lines = [
      `Property: "${context.title ?? 'Unknown'}"`,
      `City: ${context.city ?? 'Unknown'}`,
      context.society ? `Society: ${context.society}` : '',
      context.propertyType ? `Type: ${context.propertyType}` : '',
      context.listingType ? `Listing: ${context.listingType}` : '',
      context.price ? `Price: PKR ${formatPKR(context.price)}` : '',
      context.area ? `Area: ${context.area}` : '',
      context.bedrooms ? `Bedrooms: ${context.bedrooms}` : '',
      context.bathrooms ? `Bathrooms: ${context.bathrooms}` : '',
      context.canonicalUrl ? `URL: ${context.canonicalUrl}` : '',
    ].filter(Boolean);
    return `User is viewing this property:\n${lines.join('\n')}`;
  }

  if (context.type === 'society') {
    const lines = [
      `Society: "${context.title ?? 'Unknown'}"`,
      `City: ${context.city ?? 'Unknown'}`,
      context.nocStatus ? `NOC Status: ${context.nocStatus}` : '',
      context.overallScore !== undefined ? `Intelligence Score: ${context.overallScore}/100` : '',
      context.overallRiskLevel ? `Risk Level: ${context.overallRiskLevel}` : '',
      context.canonicalUrl ? `URL: ${context.canonicalUrl}` : '',
    ].filter(Boolean);
    return `User is viewing this society:\n${lines.join('\n')}`;
  }

  if (context.type === 'project') {
    const lines = [
      `Project: "${context.title ?? 'Unknown'}"`,
      `City: ${context.city ?? 'Unknown'}`,
      context.price ? `Starting Price: PKR ${formatPKR(context.price)}` : '',
      context.canonicalUrl ? `URL: ${context.canonicalUrl}` : '',
    ].filter(Boolean);
    return `User is viewing this project:\n${lines.join('\n')}`;
  }

  return 'General context.';
}

function formatPKR(value: number): string {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(2)} Crore`;
  if (value >= 100_000)    return `${(value / 100_000).toFixed(2)} Lakh`;
  return value.toLocaleString('en-PK');
}

// ─── Intent detection ─────────────────────────────────────────────────────────

function detectIntent(messages: string[]): ConversationIntent {
  const text = messages.join(' ').toLowerCase();
  if (/\b(buy|purchase|khareed|kharidna|خرید)\b/.test(text))            return 'buy';
  if (/\b(rent|kiraya|lease|کرایہ)\b/.test(text))                       return 'rent';
  if (/\b(invest|investment|return|yield|سرمایہ)\b/.test(text))         return 'invest';
  if (/\b(noc|legal|illegal|verify|authority|approved)\b/.test(text))   return 'verify_society';
  if (/\b(price|rate|cost|value|marla|kanal|lakh|crore|قیمت)\b/.test(text)) return 'price_check';
  if (text.length > 50) return 'general';
  return 'unknown';
}

// ─── Zod validation ───────────────────────────────────────────────────────────

const AriaContextSchema = z.object({
  type:             z.enum(['property', 'project', 'society', 'general']),
  id:               z.string().optional(),
  slug:             z.string().optional(),
  title:            z.string().max(300).optional(),
  price:            z.number().optional(),
  city:             z.string().max(100).optional(),
  propertyType:     z.string().max(100).optional(),
  listingType:      z.string().max(50).optional(),
  area:             z.string().max(50).optional(),
  bedrooms:         z.number().optional(),
  bathrooms:        z.number().optional(),
  society:          z.string().max(200).optional(),
  nocStatus:        z.string().max(50).optional(),
  overallScore:     z.number().optional(),
  overallRiskLevel: z.string().max(50).optional(),
  canonicalUrl:     z.string().url().optional(),
});

const ChatRequestSchema = z.object({
  message:        z.string().min(1).max(1000),
  sessionId:      z.string().uuid({ message: 'Invalid session ID' }),
  context:        AriaContextSchema,
  conversationId: z.string().length(24).optional(),
});

// ─── Response types ───────────────────────────────────────────────────────────

interface ChatResponse {
  reply:          string;
  conversationId: string;
  sessionId:      string;
  intent:         ConversationIntent;
  leadCaptured:   boolean;
  quotaMode:      QuotaMode;
  quotaPercentage: number;
}

interface ErrorResponse {
  error:     string;
  code?:     string;
  quotaMode?: QuotaMode;
}

// ─── Quota alert helper (fire-and-forget) ────────────────────────────────────

async function maybeSendQuotaAlert(percentage: number): Promise<void> {
  const warnThreshold = parseInt(process.env.GROQ_WARN_THRESHOLD ?? '75', 10);
  const prioThreshold = parseInt(process.env.GROQ_PRIORITY_THRESHOLD ?? '90', 10);

  let threshold = 0;
  if (percentage >= 100)              threshold = 100;
  else if (percentage >= prioThreshold) threshold = prioThreshold;
  else if (percentage >= warnThreshold) threshold = warnThreshold;
  else return;

  const shouldSend = await shouldSendAlert(threshold);
  if (!shouldSend) return;

  sendQuotaAlertEmail({
    threshold,
    percentage,
    used:      0,  // filled by getQuotaStatus inside email helper
    limit:     parseInt(process.env.GROQ_DAILY_LIMIT ?? '14400', 10),
  }).catch(() => { /* silent — never crash chat */ });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | ErrorResponse>
): Promise<void> {

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ── Get optional auth token ───────────────────────────────────────────────
  const token  = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.id ? String(token.id) : undefined;

  // ── Rate limit (existing rateLimitAI: 15/min global + per-user) ───────────
  const rl = await rateLimitAI(req, userId);
  setRateLimitHeaders(res, rl);

  if (!rl.ok) {
    res.status(429).json({
      error: rl.blocked
        ? 'Too many requests. Please try again later.'
        : `Too many messages. Please wait ${rl.retryAfter ?? 60} seconds.`,
      code: 'RATE_LIMITED',
    });
    return;
  }

  // ── Validate input ────────────────────────────────────────────────────────
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? 'Invalid request',
      code:  'VALIDATION_ERROR',
    });
    return;
  }

  const { message, sessionId, context, conversationId } = parsed.data;
  const ip = getClientIp(req);

  // ── Pre-check quota status ────────────────────────────────────────────────
  const quotaStatus = await getQuotaStatus();

  // If lead_only mode → don't call Groq at all, return capture prompt
  if (quotaStatus.mode === 'lead_only') {
    res.status(200).json({
      reply:          'Aaj bohot saaray buyers Aleem se baat kar rahay hain — main bohot busy hoon. 🌟 Aap apna naam, phone aur city batayein — hamari property expert aap ko priority par within 1 hour personally call karegi. Premium service, bilkul free!',
      conversationId: conversationId ?? '',
      sessionId,
      intent:         'general',
      leadCaptured:   false,
      quotaMode:      'lead_only',
      quotaPercentage: quotaStatus.percentage,
    });
    return;
  }

  await dbConnect();

  try {
    // ── Load or create conversation ───────────────────────────────────────
    let conversation = conversationId
      ? await Conversation.findById(conversationId)
      : null;

    if (!conversation) {
      conversation = new Conversation({
        sessionId,
        userId:         userId ? new mongoose.Types.ObjectId(userId) : undefined,
        context,
        messages:       [],
        detectedIntent: 'unknown',
        leadStatus:     'browsing',
        leadCaptured:   false,
        ipAddress:      ip ? ip.slice(0, 64) : undefined,
      });
    }

    // ── Add user message ──────────────────────────────────────────────────
    conversation.messages.push({
      role:      'user',
      content:   message,
      timestamp: new Date(),
    });

    // Keep only last 20 messages for token control
    const recentMessages = conversation.messages.slice(-20);

    // ── Build Groq messages array ─────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(context, quotaStatus.mode);

    type GroqMessage = { role: 'system' | 'user' | 'assistant'; content: string };
    const groqMessages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.map((msg) => ({
        role:    (msg.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: msg.content,
      })),
    ];

    // ── Call Groq ─────────────────────────────────────────────────────────
    const groq      = getGroqClient();
    const modelName = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

    const completion = await groq.chat.completions.create({
      messages:    groqMessages,
      model:       modelName,
      temperature: 0.7,
      max_tokens:  500,
      top_p:       0.9,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? '';

    if (!reply) {
      res.status(500).json({ error: 'No response from Aleem', code: 'AI_ERROR' });
      return;
    }

    // ── Increment quota counter (fire-and-forget) ─────────────────────────
    incrementQuota().then((newCount) => {
      const limit = parseInt(process.env.GROQ_DAILY_LIMIT ?? '14400', 10);
      const pct   = Math.min(100, Math.round((newCount / limit) * 100));
      maybeSendQuotaAlert(pct);
    }).catch(() => { /* silent */ });

    // ── Add assistant reply ───────────────────────────────────────────────
    conversation.messages.push({
      role:      'assistant',
      content:   reply,
      timestamp: new Date(),
    });

    // ── Update intent ─────────────────────────────────────────────────────
    const userMessages = conversation.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content);
    conversation.detectedIntent = detectIntent(userMessages);

    // ── Update lead status based on engagement ────────────────────────────
    if (conversation.leadStatus === 'browsing' && conversation.messageCount >= 2) {
      conversation.leadStatus = 'interested';
    }
    if (conversation.leadStatus === 'interested' && conversation.messageCount >= 5) {
      conversation.leadStatus = 'qualified';
    }

    await conversation.save();

    res.status(200).json({
      reply,
      conversationId: String(conversation._id),
      sessionId,
      intent:         conversation.detectedIntent,
      leadCaptured:   conversation.leadCaptured,
      quotaMode:      quotaStatus.mode,
      quotaPercentage: quotaStatus.percentage,
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    // Detect Groq-specific errors
    const isQuotaError = errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate_limit');
    const isAuthError  = errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('api_key');

    await logSecurityEvent({
      type:     'system_error',
      severity: isQuotaError ? 'high' : 'medium',
      ip:       ip ?? 'unknown',
      metadata: {
        errorMessage,
        endpoint:  '/api/aria/chat',
        errorType: isQuotaError ? 'groq_quota' : isAuthError ? 'groq_auth' : 'unknown',
      },
    });

    if (isQuotaError) {
      res.status(503).json({
        error: 'Aleem aaj bohot busy hai high demand ki wajah se. Aap apna detail share karein, hamari team contact karegi.',
        code:  'QUOTA_EXCEEDED',
        quotaMode: 'lead_only',
      });
      return;
    }

    if (isAuthError) {
      res.status(503).json({
        error: 'Aleem temporarily offline hai. Please contact form use karein.',
        code:  'SERVICE_UNAVAILABLE',
      });
      return;
    }

    res.status(500).json({
      error: 'Aleem temporarily unavailable hai. Please try again.',
      code:  'SERVER_ERROR',
    });
  }
}