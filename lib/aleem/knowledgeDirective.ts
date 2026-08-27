// lib/aleem/knowledgeDirective.ts
// ALEEM — Dynamic Real Estate Knowledge Injection Router
// Detects topic intent and injects verified, dated Pakistani real estate facts.

import { buildFbrTaxContextBlock } from '@/lib/knowledge/fbrTaxes';
import { buildProvincialTaxContextBlock } from '@/lib/knowledge/provincialTaxes';
import { buildConstructionRatesContextBlock } from '@/lib/knowledge/constructionRates';
import { buildVerificationChecklistContextBlock } from '@/lib/knowledge/verificationChecklists';

// Regex patterns to identify knowledge requests
const FBR_TAX_PATTERNS = new RegExp(
  [
    '\\b(236c|236k|7e|cgt|withholding|wht|capital gains? tax|deemed income|deemed tax|fbr|filer|non-?filer|late-?filer)\\b',
    '\\b(tax|withholding|wht)\\s*(rate|percentage|slab|percent|table|kitna|kitni|lagta|partiy)\\b',
  ].join('|'),
  'i',
);

const PROVINCIAL_TAX_PATTERNS = new RegExp(
  [
    '\\b(stamp duty|cvt|capital value tax|registration fee|transfer fee|local tax|tma tax|town tax|sub-?registrar|registry|inteqal|mutation|patwari|stamp paper)\\b',
    '\\b(punjab|sindh|ict|islamabad|karachi|lahore|rawalpindi)\\b.*\\b(stamp|cvt|registry|transfer)\\b',
  ].join('|'),
  'i',
);

const CONSTRUCTION_PATTERNS = new RegExp(
  [
    '\\b(grey structure|finishing rate|turnkey|cost per sqft|cost per square|building cost|cost to build|sariya cost|cement price|steel rate|brick cost|sariya|sariyaa|brick|bricks|cement|steel|labor rate)\\b',
    '\\b(construction|construct|build|banane|tamir|tameer)\\s*(cost|rate|price|qeemat|expense|kharcha|budget)\\b',
  ].join('|'),
  'i',
);

const VERIFICATION_PATTERNS = new RegExp(
  [
    '\\b(noc|layout plan|lop|approval|approved|illegal|fake|fraud|scam|verify|verification|check status|authority|lda|cda|rda|sbca)\\b',
    '\\b(fard|fard-e-malkiat|allotment letter|transfer letter|non-encumbrance|nec|registry proof|ownership document|safe buy|red flag|redflags)\\b',
    '\\b(how to verify|document check|society check|kaise verify|check karne)\\b',
  ].join('|'),
  'i',
);

export interface KnowledgeFlags {
  fbrTax: boolean;
  provincialTax: boolean;
  construction: boolean;
  verification: boolean;
}

/**
 * Detects if the user's message matches any verified K1 knowledge topics.
 */
export function detectKnowledgeTopics(message: string): KnowledgeFlags {
  const text = typeof message === 'string' ? message : '';
  return {
    fbrTax: FBR_TAX_PATTERNS.test(text),
    provincialTax: PROVINCIAL_TAX_PATTERNS.test(text),
    construction: CONSTRUCTION_PATTERNS.test(text),
    verification: VERIFICATION_PATTERNS.test(text),
  };
}

/**
 * Generates and compiles a highly tailored, verified context block for the LLM
 * based on the active knowledge topic flags. Returns empty string if no flags are matched.
 */
export function buildKnowledgeDirective(flags: KnowledgeFlags): string {
  const blocks: string[] = [];

  if (flags.fbrTax) {
    blocks.push(buildFbrTaxContextBlock());
  }

  if (flags.provincialTax) {
    blocks.push(buildProvincialTaxContextBlock());
  }

  if (flags.construction) {
    blocks.push(buildConstructionRatesContextBlock());
  }

  if (flags.verification) {
    blocks.push(buildVerificationChecklistContextBlock());
  }

  if (blocks.length === 0) return '';

  return (
    '=== AUTHORITATIVE REAL-ESTATE KNOWLEDGE BASE ===\n' +
    'The following verified facts must be used in your response. Cite dates and authorities verbatim. ' +
    'Never invent figures or rules outside this block:\n\n' +
    blocks.join('\n\n') +
    '\n==============================================='
  );
}