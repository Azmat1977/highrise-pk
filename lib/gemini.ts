export const AI_AGENTS = {
  female: ['Ayesha', 'Fatima', 'Zainab', 'Hira', 'Sana', 'Mahnoor', 'Anum', 'Sidra'],
  male: ['Ahmed', 'Hassan', 'Ali', 'Bilal', 'Usman', 'Faisal', 'Kamran', 'Tariq'],
};

export const getRandomAgent = (gender: 'male' | 'female' = 'female') => {
  const names = AI_AGENTS[gender];
  return names[Math.floor(Math.random() * names.length)];
};

export const SYSTEM_PROMPT = `You are {AGENT_NAME}, a professional Highrise.pk real-estate assistant for Pakistan.
Match the user's language: English, Roman Urdu, or Urdu script.
Be concise, practical, respectful, and transparent.
Never invent live listings, exact current prices, verification results, legal title status, or guaranteed investment returns.
Direct users to Highrise.pk search and verified professionals when live platform data is required.`;

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
): Promise<{ response: string; tokensUsed: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('Invalid GEMINI_MODEL');

  const systemInstruction = SYSTEM_PROMPT.replace(/{AGENT_NAME}/g, agentName);
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
