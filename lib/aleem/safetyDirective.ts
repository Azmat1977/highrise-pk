// lib/aleem/safetyDirective.ts
// ALEEM - per-message safety enforcement.
//
// WHY THIS EXISTS
// The persona in lib/gemini.ts already forbids invented tax rates and
// "best investment" claims. The model ignored both: asked for CVT it answered
// "2-5%", and asked for the best society it named Bahria, DHA and Emaar with
// "long-term appreciation ka record acha".
//
// A standing rule in a long persona is easy for a model to drift past. The
// same problem appeared with script mixing and was solved by naming the
// constraint explicitly on every request. This applies that fix to safety.

const TAX_TOPICS = new RegExp(
  [
    '\\b(cvt|capital value tax|stamp duty|withholding|wht|cgt|capital gain|advance tax|fbr|iris|filer|non-?filer|tax|taxes|registration fee|transfer fee|mutation fee)\\b',
    '\\b(tax|fee)\\s*(rate|percent|percentage|kitna|kitni)\\b',
  ].join('|'),
  'i',
);

const RANKING_TOPICS = new RegExp(
  [
    '\\b(best|behtareen|behtreen|sab se acha|sabse acha|top|number one|recommend|suggest)\\b.*\\b(society|societies|area|areas|sector|investment|project|scheme|place)\\b',
    '\\b(society|societies|area|areas|sector|investment)\\b.*\\b(best|behtareen|top|acha|achi|recommend)\\b',
    '\\b(roi|return on investment|appreciation|profit|munafa|growth potential|resale value)\\b',
    '\\bkahan invest\\b|\\bkidhar invest\\b|\\bkis society\\b|\\bkaunsi society\\b|\\bkonsi society\\b',
  ].join('|'),
  'i',
);

const PRICE_TOPICS = new RegExp(
  [
    '\\b(market rate|market price|average price|per marla|per kanal|going rate|bhao|rate kya|price kya|qeemat kya|kitne ka|kitni ki)\\b',
    '\\b(material|cement|steel|sariya|brick|sand|construction)\\s*(cost|rate|price|qeemat)\\b',
    '\\b(construction cost|building cost|grey structure)\\b',
  ].join('|'),
  'i',
);

export interface SafetyFlags {
  tax: boolean;
  ranking: boolean;
  price: boolean;
}

export function detectSafetyTopics(message: string): SafetyFlags {
  const text = typeof message === 'string' ? message : '';
  return {
    tax: TAX_TOPICS.test(text),
    ranking: RANKING_TOPICS.test(text),
    price: PRICE_TOPICS.test(text),
  };
}

/**
 * Build a hard, per-message instruction for the risky topic the user raised.
 * Returns an empty string when nothing risky was detected, so ordinary chat
 * carries no extra prompt weight.
 */
export function buildSafetyDirective(flags: SafetyFlags): string {
  const blocks: string[] = [];

  if (flags.tax) {
    blocks.push(
      'TAX QUESTION - KNOWLEDGE GROUNDING RULES:\n' +
      '- If an [AUTHORITATIVE REAL-ESTATE KNOWLEDGE BASE] block is provided above, cite those exact rates, sections (236C, 236K, 7E, CGT, Stamp Duty, CVT), and effective dates verbatim.\n' +
      '- For any tax or city-specific fee NOT covered in the knowledge block, state honestly that tax policies vary and refer them to official channels.\n' +
      '- Explain WHAT the tax is and WHO pays it (Buyer vs Seller / Filer vs Non-Filer) in clear terms.\n' +
      '- When directing users to official sources, provide these exact links:\n' +
      '    FBR official site: https://www.fbr.gov.pk\n' +
      '    IRIS tax portal: https://iris.fbr.gov.pk\n' +
      '- Always remind the user that property transfer taxes are calculated on the official FBR/DC Valuation tables, not necessarily on the private transaction value.',
    );
  }

  if (flags.ranking) {
    blocks.push(
      'BEST/ROI QUESTION - ABSOLUTE RULE:\n' +
      '- Never name a society, project or area as the "best" investment. Never rank them.\n' +
      '- Never claim appreciation, resale demand, growth potential or rental yield for any named place. You have no verified data for that and such claims are exactly how property fraud is sold.\n' +
      '- Instead, teach the user HOW to judge: approval and NOC status with the relevant authority, on-ground development versus file trading, access and infrastructure, possession timelines, transfer history, and how liquid resale actually is.\n' +
      '- You may state facts that are visible in Highrise verified inventory, for example how many verified listings exist in an area. Do not turn that into a prediction.\n' +
      '- Offer to search verified listings so the user can compare real evidence.',
    );
  }

  if (flags.price) {
    blocks.push(
      'CONSTRUCTION & PRICE INQUIRIES:\n' +
      '- For construction cost questions, rely strictly on the verified per sq.ft. rates (Economy, Standard, Premium) provided in the knowledge block.\n' +
      '- For property market prices, explain that asking prices depend on exact block, location, and verified condition. Guide the user to search Highrise verified inventory rather than relying on ungrounded market gossip.\n' +
      '- Always clarify that construction material costs (steel/cement) fluctuate with market indexes.',
    );
  }

  if (blocks.length === 0) return '';

  return (
    '\n\nSAFETY CONSTRAINTS FOR THIS REPLY (server-detected, non-negotiable):\n' +
    blocks.join('\n\n') +
    '\n\nIf you cannot answer within these limits, say honestly what you can and ' +
    'cannot confirm. An honest "I will not guess that" builds more trust than a ' +
    'confident wrong number.'
  );
}