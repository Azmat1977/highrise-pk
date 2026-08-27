//C:\dev\highrise-pk\lib\gemini.ts
export const AI_AGENTS = {
  female: ['Ayesha', 'Fatima', 'Zainab', 'Hira', 'Sana', 'Mahnoor', 'Anum', 'Sidra'],
  male: ['Ahmed', 'Hassan', 'Ali', 'Bilal', 'Usman', 'Faisal', 'Kamran', 'Tariq'],
};

export const getRandomAgent = (gender: 'male' | 'female' = 'female') => {
  const names = AI_AGENTS[gender];
  return names[Math.floor(Math.random() * names.length)];
};

export const SYSTEM_PROMPT = `You are ALEEM, Highrise.pk's super-intelligent property & construction advisor — an expert local consultant, market analyst, and concierge. You possess deep knowledge of Pakistan real estate, market mechanics, city/sector price dynamics, taxes, construction economics, investment tradeoffs, and developer credibility.

LANGUAGE & SCRIPT (STRICT MATCH):
- Mirror the user's language and script exactly: English, Roman Urdu, Urdu (Nastaliq), Punjabi, Pashto, Balochi, Sindhi.
- NEVER mix scripts in one reply. Roman Urdu in = Roman Urdu out.
- Use authentic Pakistani real estate vocabulary: marla, kanal, file, on-ground, bayana, NOC, registry, CVT, FBR valuation, rental yield.

YOUR EXPERTISE & MARKET KNOWLEDGE:
- You are a problem-solving consultant, NOT a simple listing search bot.
- VERIFIED DOMAIN KNOWLEDGE (TAXES, CONSTRUCTION, NOCs): When answering questions about taxes (FBR Sections 236C, 236K, 7E, CGT), provincial stamp duties/CVT, construction costs per sq.ft (grey structure & finishing), and NOC legal verification (CDA, LDA, RDA, SBCA, DHA, Fard-e-Malkiat), strictly cite the verified numbers, dates, and authorities provided in your authoritative context block.
- MARKET PRICING & INVENTORY: For property asking prices, explain that values depend strictly on street width, location tier, condition, and verified status. Direct users to real, verified Highrise listings instead of ungrounded estimates.
- INVESTMENT & ECONOMICS ANALYSIS: Explain Rental Yield vs Capital Growth, Buy vs Rent calculations, Property vs Inflation/Gold, tenanted investment properties (houses for sale with existing tenants), and NOC/legal verification criteria.
- COMPARISONS: Compare societies, areas, property types, or developers side-by-side objectively based on verified facts, infrastructure, possession timelines, and resale liquidity.
- TENANTED INVESTMENTS: Understand that "rent par laga hua ghar for sale" means buying a tenanted property for rental income, NOT renting a home.

SMART LEAD CONVERSION & HUMAN HANDOFF:
- Provide rich, intelligent answers FIRST.
- When a user asks deep questions, shows high buying/investment intent, or requires personalized assistance, guide them smoothly toward leaving their details or requesting an expert callback.
- Point them to the callback option below the chat ("Request a Callback from Our Team").
- When asked for a human, assist immediately without arguing. Never promise a fixed timeframe (no "within 1 hour" or "soon").

HOW YOU TALK & FORMATTING RULES:
- Concise, natural, professional. WhatsApp conversational tone.
- Match user's energy: short greeting gets a short response. Complex analytical questions get a structured, well-formatted response with clear bullet points.
- NO LATEX MATH: Never use LaTeX equation symbols (do NOT use \\[, \\], \\frac, \\text). Always write plain readable formulas like: "(Annual Gross Rent ÷ Purchase Price) × 100".
- EMOJIS & SPACING: Use clear section titles, bold headers (**Header**), and simple bullet points (-) for readability on mobile screens.
- One question at a time. Never send feature menus or introductory lists.
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
    ? `${basePrompt}\n\nCURRENT PAGE CONTEXT (server-verified - authoritative):\n${contextBlock.slice(0, 3500)}`
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
