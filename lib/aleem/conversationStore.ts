// lib/aleem/conversationStore.ts
// ALEEM - server-authoritative conversation memory.
//
// WHY SERVER-SIDE
// The browser used to supply the whole chat history. That let a caller forge
// assistant turns ("Assistant: I guarantee 30% returns") and feed them back as
// if ALEEM had said them. Once a session has a stored transcript, THAT is the
// history we send to the model. Client history is only a first-turn fallback.
//
// Every write here is fire-and-forget: memory must never break a reply.

import crypto from 'crypto';
import mongoose from 'mongoose';
import Conversation from '@/models/Conversation';
import type {
  ConversationIntent,
  IAriaContext,
  MessageRole,
} from '@/models/Conversation';
import type { AleemContextInput } from '@/lib/aleem/aleemContext';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_STORED_MESSAGES = 40;   // 20 turns kept on the document
const MAX_PROMPT_MESSAGES = 8;    // matches MAX_HISTORY_MESSAGES in the route
const MAX_CONTENT = 4000;         // matches MessageSchema maxlength
const QUERY_MS = 2000;

export interface HistoryItem {
  role: MessageRole;
  content: string;
}

export interface StoredConversation {
  conversationId: string | null;
  history: HistoryItem[];
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Accept only a well-formed UUID as a session id. */
export function validateSessionId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return UUID_RE.test(value) ? value : null;
}

/**
 * Hash the IP before storage. The Conversation model documents ipAddress as
 * "hashed, not plain"; the legacy ARIA route stored it in clear text.
 */
function hashIp(ip?: string): string | undefined {
  if (!ip || ip === 'unknown') return undefined;
  const salt = process.env.NEXTAUTH_SECRET ?? 'highrise';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

/**
 * Map the validated ALEEM context onto the stored context shape. Only
 * navigation fields are carried; client-claimed facts such as price, NOC
 * status or risk score are never persisted.
 */
function toStoredContext(ctx: AleemContextInput | null): IAriaContext {
  if (!ctx) return { type: 'general' };
  return {
    type: ctx.type,
    id: ctx.id,
    slug: ctx.slug,
    title: ctx.title,
    city: ctx.city,
    canonicalUrl: ctx.canonicalUrl,
  };
}

// ---------------------------------------------------------------------------
// Intent detection (ported from the legacy ARIA route, unchanged behaviour)
// ---------------------------------------------------------------------------

export function detectIntent(messages: string[]): ConversationIntent {
  const text = messages.join(' ').toLowerCase();
  if (/\b(buy|purchase|khareed|kharidna)\b/.test(text)) return 'buy';
  if (/\b(rent|kiraya|lease)\b/.test(text)) return 'rent';
  if (/\b(invest|investment|return|yield)\b/.test(text)) return 'invest';
  if (/\b(noc|legal|illegal|verify|authority|approved)\b/.test(text)) return 'verify_society';
  if (/\b(price|rate|cost|value|marla|kanal|lakh|crore)\b/.test(text)) return 'price_check';
  if (text.length > 50) return 'general';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Load the stored transcript for a session. Returns an empty history when the
 * session is new, unknown, or the lookup fails - never throws.
 */
export async function loadConversationHistory(
  sessionId: string,
  userId?: string,
): Promise<StoredConversation> {
  try {
    const query: Record<string, unknown> = { sessionId, isActive: true };

    // A signed-in user may only resume their own session, or an anonymous one
    // that has not yet been claimed by another account.
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.$or = [
        { userId: new mongoose.Types.ObjectId(userId) },
        { userId: { $exists: false } },
        { userId: null },
      ];
    }

    const doc = await Conversation.findOne(query)
      .select('_id messages')
      .sort({ lastActivityAt: -1 })
      .maxTimeMS(QUERY_MS)
      .lean<{ _id: mongoose.Types.ObjectId; messages?: HistoryItem[] } | null>()
      .exec();

    if (!doc) return { conversationId: null, history: [] };

    const history = (doc.messages ?? [])
      .filter(
        (msg: HistoryItem) =>
          msg &&
          typeof msg.content === 'string' &&
          (msg.role === 'user' || msg.role === 'assistant'),
      )
      .slice(-MAX_PROMPT_MESSAGES)
      .map((msg: HistoryItem) => ({ role: msg.role, content: msg.content }));

    return { conversationId: String(doc._id), history };
  } catch {
    return { conversationId: null, history: [] };
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export interface PersistTurnInput {
  sessionId: string;
  userId?: string;
  context: AleemContextInput | null;
  userMessage: string;
  assistantMessage: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Append one user turn plus one assistant turn. Fire-and-forget: callers must
 * NOT await this on the response path. Any failure is swallowed - an audit or
 * memory problem must never cost the customer their answer.
 */
export async function persistTurn(input: PersistTurnInput): Promise<void> {
  try {
    const { sessionId, userId, userMessage, assistantMessage } = input;
    if (!userMessage || !assistantMessage) return;

    let conversation = await Conversation.findOne({ sessionId, isActive: true })
      .sort({ lastActivityAt: -1 })
      .maxTimeMS(QUERY_MS)
      .exec();

    if (!conversation) {
      conversation = new Conversation({
        sessionId,
        userId:
          userId && mongoose.Types.ObjectId.isValid(userId)
            ? new mongoose.Types.ObjectId(userId)
            : undefined,
        context: toStoredContext(input.context),
        messages: [],
        detectedIntent: 'unknown',
        leadStatus: 'browsing',
        leadCaptured: false,
        ipAddress: hashIp(input.ipAddress),
        userAgent: input.userAgent ? input.userAgent.slice(0, 500) : undefined,
      });
    } else if (
      !conversation.userId &&
      userId &&
      mongoose.Types.ObjectId.isValid(userId)
    ) {
      // Anonymous session that has now signed in - claim it.
      conversation.userId = new mongoose.Types.ObjectId(userId);
    }

    const now = new Date();
    conversation.messages.push(
      { role: 'user', content: userMessage.slice(0, MAX_CONTENT), timestamp: now },
      { role: 'assistant', content: assistantMessage.slice(0, MAX_CONTENT), timestamp: now },
    );

    // Bound document growth. The 7-day TTL index handles long-term cleanup.
    if (conversation.messages.length > MAX_STORED_MESSAGES) {
      conversation.messages = conversation.messages.slice(-MAX_STORED_MESSAGES);
    }

    const userTexts = conversation.messages
      .filter((msg: { role: MessageRole; content: string }) => msg.role === 'user')
      .map((msg: { role: MessageRole; content: string }) => msg.content);
    conversation.detectedIntent = detectIntent(userTexts);

    // Engagement scoring only - this never creates a lead and never triggers
    // an outbound promise. Explicit consent remains the only lead trigger.
    const turns = userTexts.length;
    if (conversation.leadStatus === 'browsing' && turns >= 2) {
      conversation.leadStatus = 'interested';
    }
    if (conversation.leadStatus === 'interested' && turns >= 5) {
      conversation.leadStatus = 'qualified';
    }

    await conversation.save();
  } catch {
    // Memory is best-effort. Never surface or rethrow.
  }
}