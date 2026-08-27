// lib/knowledge/constructionRates.ts
// ENTERPRISE KNOWLEDGE BASE — SECTOR-WISE CONSTRUCTION COSTS PER SQ.FT. (PAKISTAN)
// Sourced: Association of Builders and Developers (ABAD) & regional construction index averages
// Last Verified Date: August 2026
// Current Status: Active (Q3 2026 material price trends)

export interface CostTier {
  range: string;
  materialsIncluded: string[];
}

export interface ConstructionRates {
  meta: {
    lastChecked: string;
    effectivePeriod: string;
    note: string;
  };
  ratesByTier: {
    economy: {
      greyStructure: string;
      finishing: string;
      turnkeyTotal: string;
      details: CostTier;
    };
    standard: {
      greyStructure: string;
      finishing: string;
      turnkeyTotal: string;
      details: CostTier;
    };
    premium: {
      greyStructure: string;
      finishing: string;
      turnkeyTotal: string;
      details: CostTier;
    };
  };
  coveredAreaBaselines: Array<{
    houseSize: string;
    coveredAreaSqFt: number;
    estimatedCostRangeStandard: string;
  }>;
}

export const constructionRatesData: ConstructionRates = {
  meta: {
    lastChecked: 'August 2026',
    effectivePeriod: 'Q3/Q4 2026 (Includes updated sariya/cement/labor cost index)',
    note: 'Rates are estimates based on standard material specifications. Interior finishes (premium marble, imported sanitary) can scale costs upward.',
  },
  ratesByTier: {
    economy: {
      greyStructure: 'PKR 1,800 - 2,100 / sq.ft.',
      finishing: 'PKR 1,500 - 1,800 / sq.ft.',
      turnkeyTotal: 'PKR 3,300 - 3,900 / sq.ft.',
      details: {
        range: 'Economic grade local building materials',
        materialsIncluded: ['Local grade-B bricks', 'Standard DG/Maple cement', 'Local sariya (grade-40)', 'Basic local plumbing/wiring', 'Ordinary floor chips/marble'],
      },
    },
    standard: {
      greyStructure: 'PKR 2,200 - 2,500 / sq.ft.',
      finishing: 'PKR 2,000 - 2,400 / sq.ft.',
      turnkeyTotal: 'PKR 4,200 - 4,900 / sq.ft.',
      details: {
        range: 'A-Grade residential build — Highly Recommended for standard homes',
        materialsIncluded: ['A-Grade first-class bricks', 'Premium brand cement (Maple Leaf/Bestway)', 'Premium Amreli/Mughal grade-60 steel (sariya)', 'Fast Cables / GM Cables wiring', 'Porta/Faisal sanitary fixtures', 'Standard porcelain floor tiles'],
      },
    },
    premium: {
      greyStructure: 'PKR 2,600 - 3,000 / sq.ft.',
      finishing: 'PKR 3,000 - 4,000 / sq.ft.',
      turnkeyTotal: 'PKR 5,600 - 7,000 / sq.ft.',
      details: {
        range: 'Luxury/Executive grade custom finishes',
        materialsIncluded: ['Solid premium foundation specs', 'Grade-60 premium epoxy coated steel', 'Imported luxury porcelain or Italian marble flooring', 'Custom solid Ash/Oak woodwork', 'Imported Grohe / Kohler sanitary fixtures', 'Smart home wiring integration'],
      },
    },
  },
  coveredAreaBaselines: [
    {
      houseSize: '5 Marla (Double Story)',
      coveredAreaSqFt: 1900,
      estimatedCostRangeStandard: 'PKR 80 Lakh - 95 Lakh (Standard A-Grade Turnkey)',
    },
    {
      houseSize: '10 Marla (Double Story)',
      coveredAreaSqFt: 3300,
      estimatedCostRangeStandard: 'PKR 1.4 Crore - 1.65 Crore (Standard A-Grade Turnkey)',
    },
    {
      houseSize: '1 Kanal (Double Story)',
      coveredAreaSqFt: 5500,
      estimatedCostRangeStandard: 'PKR 2.3 Crore - 2.7 Crore (Standard A-Grade Turnkey)',
    },
  ],
};

/**
 * Compiles a readable construction rates summary block to inject into the LLM system prompt.
 */
export function buildConstructionRatesContextBlock(): string {
  const meta = constructionRatesData.meta;
  const eco = constructionRatesData.ratesByTier.economy;
  const std = constructionRatesData.ratesByTier.standard;
  const prem = constructionRatesData.ratesByTier.premium;
  const baselines = constructionRatesData.coveredAreaBaselines;

  return `
[VERIFIED CONSTRUCTION COSTS (PAKISTAN)]
Effective: ${meta.effectivePeriod} (Verified ${meta.lastChecked})
Source: Industry average construction index (A-Grade specifications)

1. RATES PER SQ.FT. (Cost range depends on structural choices):
   * Economy Tier:
     - Grey Structure: ${eco.greyStructure} | Finishing: ${eco.finishing} | Total Turnkey: ${eco.turnkeyTotal}
   * Standard A-Grade (Recommended):
     - Grey Structure: ${std.greyStructure} | Finishing: ${std.finishing} | Total Turnkey: ${std.turnkeyTotal}
   * Premium / Luxury Tier:
     - Grey Structure: ${prem.greyStructure} | Finishing: ${prem.finishing} | Total Turnkey: ${prem.turnkeyTotal}

2. TYPICAL RESIDENTIAL BASELINES (A-Grade Standard Spec Turnkey Total):
${baselines.map(b => `   - ${b.houseSize} (Covered Area ~${b.coveredAreaSqFt} sq.ft.): ${b.estimatedCostRangeStandard}`).join('\n')}

INSTRUCTION: Use these ranges when asked about material costs, cost to build, grey structure cost, or full construction rates. Inform the user that material prices (steel, cement) fluctuate weekly.
`.trim();
}