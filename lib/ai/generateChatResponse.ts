// lib/ai/generateChatResponse.ts
// ALEEM - multi-provider AI layer.
//
// WHY THIS EXISTS
// One persona (SYSTEM_PROMPT in lib/gemini.ts), two vendors. Gemini is tried
// first, Groq is the fallback. Each provider has its own Redis-backed daily
// budget and its own circuit breaker, so a vendor outage or an exhausted quota
// degrades to the next provider instead of degrading the customer experience.
//
// This layer NEVER invents content. If every provider is unavailable it returns
// null and the caller shows honest fallback guidance.

import Groq from 'groq-sdk';
import { SYSTEM_PROMPT, generateAIResponse, getRandomAgent } from '@/lib/gemini';
import {
  getQuotaStatus,
  incrementQuota,
  type AIProviderName,
} from '@/lib/quotaTracker';

export type { AIProviderName };

export interface ChatHistoryItem {
  role: string;
  content: string;
}

export interface GenerateChatOptions {
  message: string;
  history: ChatHistoryItem[];
  contextBlock?: string;
}

export interface GenerateChatResult {
  response: string;
  tokensUsed: number;
  provider: AIProviderName;
  modelName: string;
}

/** Why each provider was skipped or how it failed. Never shown to customers. */
export interface ProviderAttempt {
  provider: AIProviderName;
  outcome: 'no_key' | 'breaker_open' | 'no_budget' | 'failed' | 'ok';
  error?: string;
}

let lastAttempts: ProviderAttempt[] = [];

/**
 * Diagnostics for the most recent generateChatResponse() call on this
 * instance. Read by the route for audit logging when every provider fails.
 */
export function getLastProviderDiagnostics(): ProviderAttempt[] {
  return lastAttempts;
}

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

const PROVIDER_ORDER: AIProviderName[] = ['groq', 'nvidia', 'gemini'];
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 60_000;
const MAX_HISTORY = 8;
const MAX_TEXT_CHARS = 2000;
// gpt-oss models are reasoning models: they burn hidden "reasoning tokens"
// before writing anything. Keep the ceiling tight so ALEEM stays concise, and
// ask for minimal reasoning since property chat is not a maths problem.
const MAX_GROQ_TOKENS = 700;
// Expanded to 3500 characters to comfortably accommodate verified K1 knowledge blocks
// (FBR taxes, provincial duties, construction rate tables, NOC checklists) alongside page context.
const CONTEXT_BLOCK_CHARS = 3500;

// ---------------------------------------------------------------------------
// Circuit breaker (per provider, per serverless instance)
// ---------------------------------------------------------------------------

interface BreakerState {
  failures: number;
  openUntil: number;
}

const breakers = new Map<AIProviderName, BreakerState>();

function isBreakerOpen(provider: AIProviderName): boolean {
  const state = breakers.get(provider);
  if (!state || state.openUntil === 0) return false;
  if (Date.now() >= state.openUntil) {
    breakers.delete(provider);
    return false;
  }
  return true;
}

function recordFailure(provider: AIProviderName): void {
  const state = breakers.get(provider) ?? { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= BREAKER_THRESHOLD) {
    state.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
  }
  breakers.set(provider, state);
}

function recordSuccess(provider: AIProviderName): void {
  breakers.delete(provider);
}

// ---------------------------------------------------------------------------
// Prompt assembly - one persona shared by every provider
// ---------------------------------------------------------------------------

function buildSystemInstruction(agentName: string, contextBlock?: string): string {
  const base = SYSTEM_PROMPT.replace(/{AGENT_NAME}/g, agentName);
  if (!contextBlock) return base;
  return (
    `${base}\n\nCURRENT PAGE CONTEXT (server-verified - authoritative):\n` +
    contextBlock.slice(0, CONTEXT_BLOCK_CHARS)
  );
}

// ---------------------------------------------------------------------------
// Groq
// ---------------------------------------------------------------------------

let groqClient: Groq | null = null;

function getGroqClient(): Groq | null {
  if (groqClient) return groqClient;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    groqClient = new Groq({ apiKey });
    return groqClient;
  } catch {
    return null;
  }
}

type GroqRole = 'system' | 'user' | 'assistant';

async function callGroq(
  opts: GenerateChatOptions,
  agentName: string,
): Promise<{ response: string; tokensUsed: number; modelName: string }> {
  const groq = getGroqClient();
  if (!groq) throw new Error('GROQ_API_KEY is not configured');

  const modelName = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

  const messages: Array<{ role: GroqRole; content: string }> = [
    { role: 'system', content: buildSystemInstruction(agentName, opts.contextBlock) },
    ...opts.history.slice(-MAX_HISTORY).map((msg) => ({
      role: (msg.role === 'assistant' ? 'assistant' : 'user') as GroqRole,
      content: String(msg.content).slice(0, MAX_TEXT_CHARS),
    })),
    { role: 'user', content: opts.message.slice(0, MAX_TEXT_CHARS) },
  ];

  const isReasoningModel = /gpt-oss|reasoning/i.test(modelName);

  // Hard timeout. Gemini already has AbortSignal.timeout(12_000); Groq had
  // none, so a slow reasoning model could leave the request hanging with no
  // reply and no fallback. 20s then fail over to the next provider.
  const completion = await groq.chat.completions.create(
    {
      messages,
      model: modelName,
      temperature: 0.7,
      max_tokens: MAX_GROQ_TOKENS,
      top_p: 0.9,
      // Reasoning models spend tokens thinking before they answer. Property
      // conversation needs warmth, not deliberation, so keep it minimal.
      ...(isReasoningModel ? { reasoning_effort: 'low' as const } : {}),
    },
    { timeout: 20_000 },
  );

  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  if (!text) throw new Error('Groq returned an empty response');

  const reported = completion.usage?.total_tokens;
  const tokensUsed =
    typeof reported === 'number'
      ? reported
      : Math.ceil((opts.message.length + text.length) / 4);

  return { response: text, tokensUsed, modelName };
}

// ---------------------------------------------------------------------------
// NVIDIA Nemotron 3 Ultra 550B
// ---------------------------------------------------------------------------

async function callNemotron(
  opts: GenerateChatOptions,
  agentName: string,
): Promise<{ response: string; tokensUsed: number; modelName: string }> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured');

  const modelName = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
  const baseUrl = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';

  const messages = [
    { role: 'system', content: buildSystemInstruction(agentName, opts.contextBlock) },
    ...opts.history.slice(-MAX_HISTORY).map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: String(msg.content).slice(0, MAX_TEXT_CHARS),
    })),
    { role: 'user', content: opts.message.slice(0, MAX_TEXT_CHARS) },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000); // 20s timeout

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`NVIDIA API HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) throw new Error('NVIDIA Nemotron returned an empty response');

    const tokensUsed = data.usage?.total_tokens ?? Math.ceil((opts.message.length + text.length) / 4);

    return { response: text, tokensUsed, modelName };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function hasKey(provider: AIProviderName): boolean {
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
  if (provider === 'nvidia') return Boolean(process.env.NVIDIA_API_KEY);
  return Boolean(process.env.GROQ_API_KEY);
}

async function hasBudget(provider: AIProviderName): Promise<boolean> {
  try {
    const status = await getQuotaStatus(provider);
    return status.remaining > 0;
  } catch {
    // Quota service unreachable - do not block the customer on telemetry.
    return true;
  }
}

/**
 * Try each configured provider in order. Returns null only when every provider
 * is missing a key, out of budget, tripped, or failing.
 */
export async function generateChatResponse(
  opts: GenerateChatOptions,
): Promise<GenerateChatResult | null> {
  const agentName = getRandomAgent('female');
  const attempts: ProviderAttempt[] = [];

  for (const provider of PROVIDER_ORDER) {
    if (!hasKey(provider)) {
      attempts.push({ provider, outcome: 'no_key' });
      continue;
    }
    if (isBreakerOpen(provider)) {
      attempts.push({ provider, outcome: 'breaker_open' });
      continue;
    }
    if (!(await hasBudget(provider))) {
      attempts.push({ provider, outcome: 'no_budget' });
      continue;
    }

    try {
      if (provider === 'gemini') {
        const result = await generateAIResponse(
          opts.message,
          opts.history,
          agentName,
          'female',
          opts.contextBlock,
        );
        recordSuccess(provider);
        void incrementQuota(provider).catch(() => undefined);
        return {
          response: result.response,
          tokensUsed: result.tokensUsed,
          provider,
          modelName: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
        };
      }

      if (provider === 'nvidia') {
        const result = await callNemotron(opts, agentName);
        recordSuccess(provider);
        void incrementQuota(provider).catch(() => undefined);
        return {
          response: result.response,
          tokensUsed: result.tokensUsed,
          provider,
          modelName: result.modelName,
        };
      }

      const result = await callGroq(opts, agentName);
      recordSuccess(provider);
      void incrementQuota(provider).catch(() => undefined);
      return {
        response: result.response,
        tokensUsed: result.tokensUsed,
        provider,
        modelName: result.modelName,
      };
    } catch (err: unknown) {
      recordFailure(provider);
      attempts.push({
        provider,
        outcome: 'failed',
        error: err instanceof Error ? err.message.slice(0, 300) : 'unknown error',
      });
    }
  }

  lastAttempts = attempts;
  return null;
}