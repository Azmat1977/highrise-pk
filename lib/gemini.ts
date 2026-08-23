export const AI_AGENTS = {
  female: ['Ayesha', 'Fatima', 'Zainab', 'Hira', 'Sana', 'Mahnoor', 'Anum', 'Sidra'],
  male: ['Ahmed', 'Hassan', 'Ali', 'Bilal', 'Usman', 'Faisal', 'Kamran', 'Tariq'],
};

export const getRandomAgent = (gender: 'male' | 'female' = 'female') => {
  const names = AI_AGENTS[gender];
  return names[Math.floor(Math.random() * names.length)];
};

export const SYSTEM_PROMPT = `You are ALEEM, Highrise.pk's trusted property advisor and concierge — not a generic chatbot. You speak like a knowledgeable, warm, honest local expert who has helped many people buy, sell, rent, and build across Pakistan.

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

HOW YOU TALK - this matters as much as what you say:
- Reply the way a real person types on WhatsApp. Short. Usually one to three sentences.
- Match the user's energy. "Hi" gets a short greeting and one question back, NOT a list of your services.
- Never send a menu of what you can do. Never introduce yourself twice.
- Bullet lists are only for genuinely long answers: comparing areas, explaining a legal process, or market analysis. Everyday chat has NO bullets.
- Ask ONE question at a time, not three.
- Emojis: rare. At most one, and only when it fits naturally.
- Do not end every message with a call to action. Sometimes just answer.
- If the user writes one line, you write one or two lines. Do not lecture.
- Never mix scripts in one reply. If the user writes Roman Urdu, reply in Roman Urdu only - do not drop Urdu script words into the middle of a Roman sentence.
- If the system has already shown the user verified listings, those listings and their links are in your conversation history. Refer back to them instead of asking the user to repeat their requirement.
`;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

export async function generateAIResponse(
  userMessage: string,
  chatHistory: { role: string; content: string }[],
  agentName: string,
  _agentGender: 'male' | 'female',
  contextBlock?: string,
): Promise<{ response: string; tokensUsed: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  // Vendors retire models without notice: Groq dropped the whole llama-3.x
  // family and Google retired gemini-2.0-flash, both during development.
  // Keep this default current, and rely on GEMINI_MODEL in .env.local.
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('Invalid GEMINI_MODEL');

  const basePrompt = SYSTEM_PROMPT.replace(/{AGENT_NAME}/g, agentName);
  const systemInstruction = contextBlock
    ? `${basePrompt}\n\nCURRENT PAGE CONTEXT (server-verified - authoritative):\n${contextBlock.slice(0, 1200)}`
    : basePrompt;
  const contents = [
    ...chatHistory.slice(-8).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(msg.content).slice(0, 2000) }],
    })),
    { role: 'user', parts: [{ text: userMessage.slice(0, 2000) }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) throw new Error('Gemini returned an empty response');

  return {
    response: text,
    tokensUsed: Math.ceil((userMessage.length + text.length) / 4),
  };
}

export function detectLanguage(message: string): 'urdu' | 'english' | 'roman-urdu' {
  if (/[\u0600-\u06FF]/.test(message)) return 'urdu';
  if (/^[a-zA-Z\s.,!?\'"-]+$/.test(message)) return 'english';
  return 'roman-urdu';
}
