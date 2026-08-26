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
      'TAX QUESTION - ABSOLUTE RULE:\n' +
      '- You do NOT know the current rate. Do not state one. Not a number, not a range, not "typically", not "usually around", not "2 to 5 percent".\n' +
      '- Rates change with every finance act and differ for filer and non-filer.\n' +
      '- Explain WHAT the tax is and WHO pays it in plain language.\n' +
      '- Then ALWAYS give the user a working way to get the real number. Do not leave them stuck.\n' +
      '- Copy these two links CHARACTER FOR CHARACTER. Both end in ".pk". Do not shorten, do not drop the .pk, do not reformat:\n' +
      '    FBR official site: https://www.fbr.gov.pk\n' +
      '    IRIS tax portal: https://iris.fbr.gov.pk\n' +
      '- A truncated link is worse than no link: it can send someone to a phishing domain.\n' +
      '- Tell them what to look for there: the latest Finance Act rates, and the FBR valuation table for their city, since property tax is calculated on FBR valuation and not on the price they pay.\n' +
      '- Also mention that a tax consultant or lawyer can confirm their specific case.\n' +
      '- Only ever link fbr.gov.pk or iris.fbr.gov.pk. Never link any other tax site, and never invent a URL.\n' +
      '- Inventing a percentage here can cost the customer real money. Never do it.',
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
      'PRICE OR COST QUESTION - CONSULTANT GUIDELINES:\n' +
      '- Provide realistic, estimated sector-wise or area-wise price bands (e.g. Prime/Posh vs Established vs Suburban sectors).\n' +
      '- Explain key value drivers: location tier, NOC status, road access, and construction quality.\n' +
      '- Always clarify that these are general market estimated ranges, and encourage checking Highrise verified listings for exact active inventory.\n' +
      '- For official tax rates or construction material costs (cement/steel), explain the calculation mechanism and refer to official sources (FBR/IRIS) or Highrise verified tools.',
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