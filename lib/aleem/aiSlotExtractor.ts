// lib/aleem/aiSlotExtractor.ts
// ALEEM — High-performance AI structured slot extraction fallback with Zod validation.
//
// Extracts rich property search parameters from complex or conversational messages
// and history context using a structured LLM call. Maps raw extracted locations
// to our real database inventory for absolute safety.

import { PropertySearchSlotsSchema, type PropertySearchSlots } from '@/lib/aleem/slots';
import { resolveLocation } from '@/lib/aleem/locationResolver';
import type { ChatHistoryItem } from '@/lib/ai/generateChatResponse';

const EXTRACTION_TIMEOUT_MS = 2500;

const EXTRACT_SYSTEM_PROMPT = `You are a precise real estate search-slot extraction engine for Highrise.pk (Pakistan).
Your single task is to parse the user's latest query (assisted by conversation history context) and output a clean, minified JSON object matching the exact schema requested.

JSON Schema fields:
- intent: "living" | "investment" | "future" | "roi_curious"
- type: "plot" | "house" | "apartment" | "shop" | "office" | "warehouse" | "building"
- listingType: "rent" | "sale"
- marla: positive number (size in marla. Convert Kanal to marla: 1 kanal = 20 marla, 2 kanal = 40 marla. Example "10 marla" -> 10, "1 kanal" -> 20)
- bedrooms: positive integer (bedroom count)
- location: string (raw city, society, or sector name extracted. Example: "DHA Phase 6", "G-11")
- budgetMinPKR: positive integer (budget lower-bound in PKR. Example "1.5 crore" -> 15000000, "50 lakh" -> 5000000)
- budgetMaxPKR: positive integer (budget upper-bound in PKR)

CRITICAL RULES:
1. ONLY return the JSON object. Do not include markdown wraps (like \`\`\`json), comments, or introductory text.
2. If a field cannot be inferred with 90%+ confidence, do NOT include it.
3. Pay close attention to conversational follow-ups. If user says "under 60 lakh" and history shows they were searching for a "5 marla plot in Lahore", preserve and inherit context.
4. If the message is NOT a property search query (e.g. greeting, general question, construction advice), output an empty JSON object: {}`;

/**
 * AI fallback slot extractor. Calls Gemini API using strict JSON mode guidelines.
 */
export async function extractSearchSlotsWithAI(
  message: string,
  history: ChatHistoryItem[] = []
): Promise<PropertySearchSlots | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const contents = [
    ...history.slice(-4).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(msg.content).slice(0, 1000) }],
    })),
    { role: 'user', parts: [{ text: `User Message: "${message}"` }] },
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: EXTRACT_SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 250,
            temperature: 0.1, // Low temp for highly deterministic extraction
          },
        }),
        signal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!jsonText) return null;

    // Parse extracted JSON string safely
    const rawSlots = JSON.parse(jsonText);

    // Validate using Zod schema
    const parsed = PropertySearchSlotsSchema.safeParse(rawSlots);
    if (!parsed.success) return null;

    const slots = parsed.data;

    // Guard: If empty JSON is returned, it means it's general chat.
    if (Object.keys(slots).length === 0) return null;

    // ── DATABASE-DRIVEN LOCATION NORMALIZATION ──
    // If the AI extracted a raw location string (e.g. "DHA 5"), pass it through
    // resolveLocation to map it directly to a verified db location.
    if (slots.location) {
      const resolved = await resolveLocation(slots.location);
      if (resolved.matched) {
        slots.location = resolved.matched;
        slots.unavailableLocation = undefined;
      } else if (resolved.recognized) {
        slots.unavailableLocation = resolved.recognized;
        slots.location = undefined;
      } else {
        slots.unavailableLocation = slots.location;
        slots.location = undefined;
      }
    }

    return slots;
  } catch {
    // Fail-safe: Any network issue, timeout, JSON parsing error, or validation failure drops fallback to null
    return null;
  }
}