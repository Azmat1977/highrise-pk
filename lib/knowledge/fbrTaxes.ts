// lib/knowledge/fbrTaxes.ts
// ENTERPRISE KNOWLEDGE BASE — FEDERAL REAL ESTATE TAXES (PAKISTAN)
// Verified & Sourced: Federal Board of Revenue (FBR) Finance Act 2024-2025
// Last Verified Date: July 2026
// Current Status: In effect for Fiscal Year 2025-2026 / 2026-2027

export interface TaxRateSlab {
  filer: string;
  lateFiler: string;
  nonFiler: string;
  conditions?: string;
}

export interface FBRTaxKnowledge {
  meta: {
    authority: string;
    governingAct: string;
    lastChecked: string;
    effectiveFrom: string;
    officialSourceUrl: string;
  };
  sections: {
    section236C: {
      name: string;
      description: string;
      target: string; // Seller
      rates: TaxRateSlab;
    };
    section236K: {
      name: string;
      description: string;
      target: string; // Buyer
      ratesByValue: Array<{
        slabName: string;
        range: string;
        filer: string;
        lateFiler: string;
        nonFiler: string;
      }>;
    };
    section7E: {
      name: string;
      description: string;
      rate: string;
      exemptions: string[];
      transferCondition: string;
    };
    cgtDisposal: {
      name: string;
      description: string;
      postJuly2024Acquisitions: {
        filer: string;
        lateFiler: string;
        nonFiler: string;
        note: string;
      };
      preJuly2024Acquisitions: Array<{
        holdingPeriod: string;
        filerRate: string;
        lateFilerRate: string;
        nonFilerRate: string;
      }>;
    };
  };
}

export const fbrTaxesData: FBRTaxKnowledge = {
  meta: {
    authority: 'Federal Board of Revenue (FBR), Government of Pakistan',
    governingAct: 'Income Tax Ordinance, 2001 (amended via Finance Act)',
    lastChecked: 'August 2026',
    effectiveFrom: 'July 1, 2024 (validated for 2025-2026 / 2026-2027 periods)',
    officialSourceUrl: 'https://www.fbr.gov.pk',
  },
  sections: {
    section236C: {
      name: 'Section 236C — Advance Tax on Sale/Transfer of Immovable Property',
      description: 'Adjustable withholding tax collected from the seller/transferor of property at the time of register or transfer of title.',
      target: 'Seller / Transferor',
      rates: {
        filer: '3%',
        lateFiler: '6%',
        nonFiler: '10%',
        conditions: 'Applicable to all transfers of immovable property. Adjustable against final tax liability at year-end.',
      },
    },
    section236K: {
      name: 'Section 236K — Advance Tax on Purchase/Acquisition of Immovable Property',
      description: 'Withholding tax collected from the purchaser/transferee of property at the time of registering or executing the transfer.',
      target: 'Buyer / Transferee',
      ratesByValue: [
        {
          slabName: 'Tier 1 (Up to PKR 5 Crore)',
          range: 'Property value up to PKR 50 Million',
          filer: '3%',
          lateFiler: '6%',
          nonFiler: '12%',
        },
        {
          slabName: 'Tier 2 (PKR 5 Crore to 10 Crore)',
          range: 'Property value between PKR 50 Million and 100 Million',
          filer: '3%',
          lateFiler: '6%',
          nonFiler: '15%',
        },
        {
          slabName: 'Tier 3 (PKR 10 Crore+)',
          range: 'Property value exceeding PKR 100 Million',
          filer: '3%',
          lateFiler: '6%',
          nonFiler: '20%',
        },
      ],
    },
    section7E: {
      name: 'Section 7E — Tax on Deemed Income from Capital Assets',
      description: 'Deemed rental income tax on resident individuals owning immovable capital assets in Pakistan with a total value exceeding PKR 2.5 Crore (25 Million). Deemed rental income is assumed to be 5% of the property value, taxed at 20% (effectively 1% of the property value annually).',
      rate: '1% of FBR property value annually',
      exemptions: [
        'One self-owned residential property occupied by the owner.',
        'Capital assets owned by federal/provincial governments or local authorities.',
        'Agricultural land where active farming is performed (excluding farmhouse land structures).',
        'Properties belonging to martyrs of Armed Forces, war-wounded persons, and federal/provincial government employees.',
        'Properties acquired in the first year of construction (under active development).',
      ],
      transferCondition: 'A Seller must obtain an FBR-issued Section 7E Exemption Certificate (Form A) or pay the 1% deemed tax at the time of transfer to make the transfer legally valid.',
    },
    cgtDisposal: {
      name: 'Capital Gains Tax (CGT) on Disposal of Immovable Property',
      description: 'Tax charged on the profit (gain) earned upon the resale of immovable assets (plots, houses, apartments). Calculated on (Sale Price - Purchase Price).',
      postJuly2024Acquisitions: {
        filer: '15%',
        lateFiler: '20%',
        nonFiler: '45%',
        note: 'Flat rates apply to properties acquired on or after July 1, 2024, regardless of holding period, as introduced in Finance Act 2024.',
      },
      preJuly2024Acquisitions: [
        { holdingPeriod: 'Up to 1 Year', filerRate: '15%', lateFilerRate: '15%', nonFilerRate: '30%' },
        { holdingPeriod: '1 to 2 Years', filerRate: '12.5%', lateFilerRate: '12.5%', nonFilerRate: '25%' },
        { holdingPeriod: '2 to 3 Years', filerRate: '10%', lateFilerRate: '10%', nonFilerRate: '20%' },
        { holdingPeriod: '3 to 4 Years', filerRate: '7.5%', lateFilerRate: '7.5%', nonFilerRate: '15%' },
        { holdingPeriod: '4 to 5 Years', filerRate: '5%', lateFilerRate: '5%', nonFilerRate: '10%' },
        { holdingPeriod: '5 to 6 Years', filerRate: '2.5%', lateFilerRate: '2.5%', nonFilerRate: '5%' },
        { holdingPeriod: 'Above 6 Years', filerRate: '0% (Exempt)', lateFilerRate: '0% (Exempt)', nonFilerRate: '0% (Exempt)' },
      ],
    },
  },
};

/**
 * Compiles a readable FBR tax summary block to inject into the LLM system prompt.
 * Kept ultra-compact to comply with context budget limits.
 */
export function buildFbrTaxContextBlock(): string {
  const meta = fbrTaxesData.meta;
  const s236c = fbrTaxesData.sections.section236C;
  const s236k = fbrTaxesData.sections.section236K;
  const s7e = fbrTaxesData.sections.section7E;
  const cgt = fbrTaxesData.sections.cgtDisposal;

  return `
[VERIFIED FBR TAX DATA]
Source: ${meta.authority} (${meta.governingAct})
Effective: ${meta.effectiveFrom} (Verified ${meta.lastChecked})
Source Portal: ${meta.officialSourceUrl}

1. SELLER TAX (Section 236C):
   - Filer: ${s236c.rates.filer} | Late Filer: ${s236c.rates.lateFiler} | Non-Filer: ${s236c.rates.nonFiler}

2. BUYER TAX (Section 236K):
${s236k.ratesByValue.map(s => `   - ${s.slabName} (${s.range}): Filer: ${s.filer} | Late Filer: ${s.lateFiler} | Non-Filer: ${s.nonFiler}`).join('\n')}

3. DEEMED TAX (Section 7E):
   - Rate: ${s7e.rate} for properties > PKR 2.5 Crore total value.
   - Core Exemptions: First house (self-occupied), Martyr/Armed forces, active agriculture land, first year of construction.
   - Requirement: Seller MUST provide 7E Form-A exemption certificate or pay 1% at transfer.

4. CAPITAL GAINS TAX (CGT):
   * For Property acquired ON/AFTER July 1, 2024:
     - Filer: ${cgt.postJuly2024Acquisitions.filer} | Late Filer: ${cgt.postJuly2024Acquisitions.lateFiler} | Non-Filer: ${cgt.postJuly2024Acquisitions.nonFiler} (Flat, no holding period exemption)
   * For Property acquired BEFORE July 1, 2024:
     - Holding period sliding scale applies. Tax drops by ~2.5% per year, completely exempt (0%) after 6 years of holding.

INSTRUCTION: Quote these exact numbers when asked about federal taxes, withholding, filer vs non-filer, 7E, or CGT. Cite "${meta.authority} (${meta.lastChecked})" as the source.
`.trim();
}