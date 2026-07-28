import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Pakistani AI Agent Names
export const AI_AGENTS = {
  female: ['Ayesha', 'Fatima', 'Zainab', 'Hira', 'Sana', 'Mahnoor', 'Anum', 'Sidra'],
  male: ['Ahmed', 'Hassan', 'Ali', 'Bilal', 'Usman', 'Faisal', 'Kamran', 'Tariq'],
};

// Get random agent
export const getRandomAgent = (gender: 'male' | 'female' = 'female') => {
  const names = AI_AGENTS[gender];
  return names[Math.floor(Math.random() * names.length)];
};

// System Prompt - Pakistani Real Estate Expert Personality
export const SYSTEM_PROMPT = `
Aap Highrise.pk ki taraf se ek professional Pakistani real estate assistant hain. Aap ka naam {AGENT_NAME} hai.

## 🚨 CRITICAL LANGUAGE RULES (FOLLOW STRICTLY):
1. **DETECT LANGUAGE:** Sab se pehle user ka message parhein.
2. **MATCH LANGUAGE:**
   - Agar user **English** mein baat kare -> **English** mein jawab dein.
   - Agar user **Roman Urdu** mein baat kare -> **Roman Urdu** mein jawab dein.
   - Agar user **Urdu Script** mein likhe -> **Urdu Script** mein jawab dein.
3. **NEVER FORCE URDU:** Agar user English bol raha hai to zabardasti Urdu mat bolein.

## 🎯 AAPKI PERSONALITY:
- Aap Highrise.pk ke expert hain.
- Aap friendly aur professional hain.
- Aap ka tone Pakistani aur Ikhlaq wala hona chahiye (ji janab, zaroor, shukriya).

## 🏠 AAPKA KNOWLEDGE:
- **Highrise.pk:** Pakistan ka best real estate platform for Buy, Sell, Rent.
- **Cities:** Lahore, Karachi, Islamabad, etc.
- **Advice:** Investment tips, safe dealing, price trends.

## ⚠️ IMPORTANT RULES:
- **English Query Example:**
  User: "I want to buy a house in DHA."
  You: "Sure! DHA is a great choice. Are you looking for a 1 Kanal or 10 Marla house? I can guide you about current prices on Highrise.pk."
  
- **Roman Urdu Query Example:**
  User: "DHA mein ghar lena hai."
  You: "Ji zaroor! DHA bohot acha area hai. Aap kitne marla ka ghar dekh rahe hain? Highrise.pk par hamare paas kafi options hain."

- **Price Info:** Agar koi exact price pooche to range batayen aur kahein ke "Highrise.pk par search karein current listings ke liye."

Remember: User ki language hi aap ki language honi chahiye!
`;

// Create chat model
export const getChatModel = () => {
  return genAI.getGenerativeModel({
   model: 'gemini-flash-latest',
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 1024,
    },
  });
};

// Generate AI Response
export const generateAIResponse = async (
  userMessage: string,
  chatHistory: { role: string; content: string }[],
  agentName: string,
  agentGender: 'male' | 'female'
): Promise<{ response: string; tokensUsed: number }> => {
  try {
    const model = getChatModel();
    
    // Prepare system prompt with agent name
    const genderPronoun = agentGender === 'female' ? 'sakti' : 'sakta';
    const personalizedPrompt = SYSTEM_PROMPT
      .replace(/{AGENT_NAME}/g, agentName)
      .replace(/sakti\/sakta/g, genderPronoun);
    
    // Build conversation history for Gemini
    const history = chatHistory.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
    
    // Start chat with history
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `System Instructions: ${personalizedPrompt}` }],
        },
        {
          role: 'model',
          parts: [{ text: 'Samajh gaya/gayi. Main Highrise.pk ki taraf se customers ki madad karunga/karungi Pakistani style mein.' }],
        },
        ...history,
      ],
    });
    
    // Send message and get response
    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();
    
    // Estimate tokens (rough estimate)
    const tokensUsed = Math.ceil((userMessage.length + response.length) / 4);
    
    return {
      response,
      tokensUsed,
    };
  } catch (error) {
    console.error('Gemini AI Error:', error);
    throw new Error('AI response generate karne mein masla hua. Please dobara try karein.');
  }
};

// Detect language from message
export const detectLanguage = (message: string): string => {
  // Urdu Unicode range check
  const urduRegex = /[\u0600-\u06FF]/;
  if (urduRegex.test(message)) {
    return 'urdu';
  }
  
  // English check
  const englishRegex = /^[a-zA-Z\s.,!?'"]+$/;
  if (englishRegex.test(message)) {
    return 'english';
  }
  
  // Default to Roman Urdu
  return 'roman-urdu';
};

export default genAI;
