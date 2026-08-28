// lib/aleem/conversationStore.ts
// ALEEM - server-authoritative conversation memory.

import crypto from 'crypto';
import mongoose from 'mongoose';
import Conversation from '@/models/Conversation';
import type {
  ConversationIntent,
  IAriaContext,
  MessageRole,
} from '@/models/Conversation';
import type { AleemContextInput } from '@/lib/aleem/aleemContext';
import type { ExtractedProfile } from '@/lib/aleem/extractProfile';
import { encodeProfileForStorage } from '@/lib/aleem/profileStore';

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
  knownProfile: ExtractedProfile;
  turnCount: number;
}

export function validateSessionId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return UUID_RE.test(value) ? value : null;
}

function hashIp(ip?: string): string | undefined {
  if (!ip || ip === 'unknown') return undefined;
  const salt = process.env.NEXTAUTH_SECRET ?? 'highrise';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

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

export async function loadConversationHistory(
  sessionId: string,
  userId?: string,
): Promise<StoredConversation> {
  try {
    const query: Record<string, unknown> = { sessionId, isActive: true };

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.$or = [
        { userId: new mongoose.Types.ObjectId(userId) },
        { userId: { $exists: false } },
        { userId: null },
      ];
    }

    const doc = await Conversation.findOne(query)
      .select('_id messages capturedProfile')
      .sort({ lastActivityAt: -1 })
      .maxTimeMS(QUERY_MS)
      .lean<{
        _id: mongoose.Types.ObjectId;
        messages?: HistoryItem[];
        capturedProfile?: {
          name?: string;
          city?: string;
          phoneMasked?: string;
          emailMasked?: string;
        };
      } | null>()
      .exec();

    if (!doc) {
      return { conversationId: null, history: [], knownProfile: {}, turnCount: 0 };
    }

    const saved = doc.capturedProfile;
    const knownProfile: ExtractedProfile = {};
    if (saved?.name) knownProfile.name = saved.name;
    if (saved?.city) knownProfile.city = saved.city;
    if (saved?.phoneMasked) knownProfile.phone = saved.phoneMasked;
    if (saved?.emailMasked) knownProfile.email = saved.emailMasked;

    const turnCount = (doc.messages ?? []).filter(
      (msg: HistoryItem) => msg?.role === 'user',
    ).length;

    const history = (doc.messages ?? [])
      .filter(
        (msg: HistoryItem) =>
          msg &&
          typeof msg.content === 'string' &&
          (msg.role === 'user' || msg.role === 'assistant'),
      )
      .slice(-MAX_PROMPT_MESSAGES)
      .map((msg: HistoryItem) => ({ role: msg.role, content: msg.content }));

    return { conversationId: String(doc._id), history, knownProfile, turnCount };
  } catch {
    return { conversationId: null, history: [], knownProfile: {}, turnCount: 0 };
  }
}

export interface PersistTurnInput {
  sessionId: string;
  userId?: string;
  context: AleemContextInput | null;
  userMessage: string;
  assistantMessage: string;
  ipAddress?: string;
  userAgent?: string;
  newProfile?: ExtractedProfile;
}

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
      conversation.userId = new mongoose.Types.ObjectId(userId);
    }

    const now = new Date();
    conversation.messages.push(
      { role: 'user', content: userMessage.slice(0, MAX_CONTENT), timestamp: now },
      { role: 'assistant', content: assistantMessage.slice(0, MAX_CONTENT), timestamp: now },
    );

    if (conversation.messages.length > MAX_STORED_MESSAGES) {
      conversation.messages = conversation.messages.slice(-MAX_STORED_MESSAGES);
    }

    if (input.newProfile && Object.keys(input.newProfile).length > 0) {
      const { fields } = encodeProfileForStorage(input.newProfile);
      if (Object.keys(fields).length > 0) {
        const current = conversation.capturedProfile ?? {};
        const next = { ...current };
        (Object.keys(fields) as Array<keyof typeof fields>).forEach((key) => {
          if (next[key] === undefined || next[key] === null) {
            // @ts-expect-error - index assignment across a union of field types
            next[key] = fields[key];
          }
        });
        conversation.capturedProfile = next;
      }
    }

    const userTexts = conversation.messages
      .filter((msg: { role: MessageRole; content: string }) => msg.role === 'user')
      .map((msg: { role: MessageRole; content: string }) => msg.content);
    conversation.detectedIntent = detectIntent(userTexts);

    const turns = userTexts.length;
    if (conversation.leadStatus === 'browsing' && turns >= 2) {
      conversation.leadStatus = 'interested';
    }
    if (conversation.leadStatus === 'interested' && turns >= 5) {
      conversation.leadStatus = 'qualified';
    }

    await conversation.save();
  } catch {
    // Best-effort memory
  }
}

/**
 * Deactivate a conversation session by marking isActive: false.
 * Clears active memory horizon for subsequent loadConversationHistory calls.
 */
export async function resetConversationSession(
  sessionId: string,
  userId?: string,
): Promise<boolean> {
  try {
    const query: Record<string, unknown> = { sessionId, isActive: true };
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.$or = [
        { userId: new mongoose.Types.ObjectId(userId) },
        { userId: { $exists: false } },
        { userId: null },
      ];
    }

    const result = await Conversation.updateMany(query, {
      $set: { isActive: false },
    }).exec();

    return (result.modifiedCount ?? 0) > 0;
  } catch {
    return false;
  }
}