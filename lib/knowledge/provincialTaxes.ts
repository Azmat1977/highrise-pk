// lib/knowledge/provincialTaxes.ts
// ENTERPRISE KNOWLEDGE BASE — PROVINCIAL REAL ESTATE TRANSFER TAXES (PAKISTAN)
// Sourced: Punjab Revenue Authority (PRA), Sindh Revenue Board (SRB), Islamabad Capital Territory Administration
// Last Verified Date: August 2026
// Current Status: FY 2025-2026 / 2026-2027 Provincial Budgets

export interface ProvincialCharges {
  stampDuty: string;
  cvt: string;
  townTaxOrTma?: string;
  registrationFee: string;
  notes?: string;
}

export interface ProvincialTaxKnowledge {
  meta: {
    lastChecked: string;
    effectiveFrom: string;
  };
  jurisdictions: {
    punjab: {
      name: string;
      urban: ProvincialCharges;
      rural: ProvincialCharges;
    };
    ict: {
      name: string;
      urban: ProvincialCharges;
    };
    sindh: {
      name: string;
      urban: ProvincialCharges;
    };
  };
}

export const provincialTaxesData: ProvincialTaxKnowledge = {
  meta: {
    lastChecked: 'August 2026',
    effectiveFrom: 'Fiscal Year 2025-2026 (applicable into 2026-2027)',
  },
  jurisdictions: {
    punjab: {
      name: 'Punjab (Lahore, Rawalpindi, Faisalabad, Multan, etc.)',
      urban: {
        stampDuty: '1% of FBR value',
        cvt: '2% of FBR value',
        townTaxOrTma: '1% (TMA/Metropolitan Corporation fee)',
        registrationFee: 'Fixed PKR 500 or 1% based on district ceiling',
        notes: 'Total urban provincial transfer costs are typically ~4% of the FBR valuation of the property.',
      },
      rural: {
        stampDuty: '3% of FBR value',
        cvt: 'Exempt or 0.5% depending on Tehsil category',
        townTaxOrTma: 'Exempt',
        registrationFee: 'Fixed PKR 500',
        notes: 'Rural land transfers go through Patwari / Tehsildar via Mutation (Inteqal). Urban transfers go through Sub-Registrar registry.',
      },
    },
    ict: {
      name: 'Islamabad Capital Territory (ICT)',
      urban: {
        stampDuty: '1.5% of FBR value',
        cvt: '2% of FBR value',
        townTaxOrTma: 'Exempt',
        registrationFee: 'Fixed PKR 1,000 for standard limits',
        notes: 'Total municipal-level transfer taxes are 3.5% of FBR value. Administered by ICT Revenue Department and CDA.',
      },
    },
    sindh: {
      name: 'Sindh (Karachi, Hyderabad, Sukkur, etc.)',
      urban: {
        stampDuty: '2% of FBR value',
        cvt: '1% of FBR value',
        townTaxOrTma: '1% (KMC/District Council tax)',
        registrationFee: '1% of FBR value',
        notes: 'Sindh has a flat Sub-Registrar collection model of ~5% total provincial-level tax on urban registry.',
      },
    },
  },
};

/**
 * Compiles a readable Provincial tax summary block to inject into the LLM system prompt.
 */
export function buildProvincialTaxContextBlock(): string {
  const meta = provincialTaxesData.meta;
  const pb = provincialTaxesData.jurisdictions.punjab;
  const ict = provincialTaxesData.jurisdictions.ict;
  const sd = provincialTaxesData.jurisdictions.sindh;

  return `
[VERIFIED PROVINCIAL REAL ESTATE CHARGES]
Effective: ${meta.effectiveFrom} (Verified ${meta.lastChecked})

1. PUNJAB (Lahore, Rawalpindi, etc.):
   * Urban Transfers (Registry):
     - Stamp Duty: ${pb.urban.stampDuty}
     - CVT: ${pb.urban.cvt}
     - Metropolitan Corporation / TMA Tax: ${pb.urban.townTaxOrTma}
     - Registration Fee: ${pb.urban.registrationFee}
     - Total local charges: ~4% of FBR value.
   * Rural Transfers (Mutation / Inteqal):
     - Stamp Duty: ${pb.rural.stampDuty} | CVT/TMA: Exempt | mutation managed by Patwari.

2. ISLAMABAD (ICT):
   - Stamp Duty: ${ict.urban.stampDuty}
   - CVT: ${ict.urban.cvt}
   - Registration Fee: ${ict.urban.registrationFee}
   - Total ICT charges: ~3.5% of FBR value.

3. SINDH (Karachi, etc.):
   - Stamp Duty: ${sd.urban.stampDuty}
   - CVT: ${sd.urban.cvt}
   - Town / KMC Tax: ${sd.urban.townTaxOrTma}
   - Registration Fee: ${sd.urban.registrationFee}
   - Total Sindh charges: ~5% of FBR value.

INSTRUCTION: Distinguish provincial stamp duties/CVT from FBR federal taxes. Note that provincial taxes are calculated on FBR valuation tables, not the market price.
`.trim();
}