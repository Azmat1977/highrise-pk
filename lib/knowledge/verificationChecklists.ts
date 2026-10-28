// lib/knowledge/verificationChecklists.ts
// ENTERPRISE KNOWLEDGE BASE — NOC AUTHORITIES & LEGAL VERIFICATION CHECKLISTS
// Sourced: Punjab Land Records Authority (PLRA), CDA, SBCA, LDA, RDA portals
// Last Verified Date: August 2026

export interface AuthorityMeta {
  name: string;
  city: string;
  verificationMethod: string;
}

export interface VerificationChecklists {
  authorities: Record<string, AuthorityMeta>;
  legalDocuments: Array<{
    document: string;
    purpose: string;
    howToVerify: string;
  }>;
  redFlags: string[];
}

export const verificationChecklistsData: VerificationChecklists = {
  authorities: {
    cda: { name: 'Capital Development Authority', city: 'Islamabad', verificationMethod: 'CDA official website portal (Approved Housing Schemes list) or visiting One Window Operations.' },
    lda: { name: 'Lahore Development Authority', city: 'Lahore', verificationMethod: 'LDA Web Portal / LDA mobile app approved societies database.' },
    rda: { name: 'Rawalpindi Development Authority', city: 'Rawalpindi', verificationMethod: 'RDA official site status checklist (Approved, Under-Process, Illegal list).' },
    sbca: { name: 'Sindh Building Control Authority', city: 'Karachi', verificationMethod: 'SBCA web verification for layout plan approvals, NOC for sale and advertisement.' },
    dha: { name: 'Defence Housing Authority (All chapters)', city: 'National (LHR, ISB, KHI, MTN, Pesh)', verificationMethod: 'DHA Office One-Window. Requires Transfer Letter verification and Membership verification directly from the respective DHA Chapter office.' },
  },
  legalDocuments: [
    {
      document: 'Fard-e-Malkiat (Record of Rights)',
      purpose: 'Confirms actual ownership and land classification (agricultural/residential) in government revenue records.',
      howToVerify: 'Verify online via PLRA Arazi Record Centers (Punjab Land Records Authority portal), Sindh Land Record System, or local Patwari/Tehsildar ledger registry.',
    },
    {
      document: 'NOC / Layout Plan (LOP) Approval',
      purpose: 'Confirms the housing society has legally approved boundaries, zoning approvals, and access paths.',
      howToVerify: 'Cross-check the project name on the respective development authority website (CDA/LDA/RDA) list of approved cooperative societies.',
    },
    {
      document: 'Allotment Letter / Transfer Letter',
      purpose: 'Establishes the current files or plots allocated to the owner in private or cooperative societies.',
      howToVerify: 'Must be verified physically at the society’s head office registrar desk. Never accept a photocopy as absolute proof.',
    },
    {
      document: 'Non-Encumbrance Certificate (NEC)',
      purpose: 'Confirms that the property is free from any outstanding bank mortgages, financial liens, or court litigation.',
      howToVerify: 'Acquired from the local Sub-Registrar / Tehsildar office after analyzing historical registry records.',
    },
  ],
  redFlags: [
    'Price is significantly lower (30%+) than the average market rate of neighboring developed plots.',
    'Seller refuses to provide copy of the front/back of the original allotment letter or Fard for verification.',
    'Developer is selling "files" with no physical, on-ground demarcated land or map layout.',
    'Society is marketing blocks that do not possess LDA/CDA/RDA approval, claiming "NOC is under process".',
    'Pressure to pay "cash bayana" immediately without signing an official agreement to sell (Iqrar-Nama) witnessed by two individuals.',
  ],
};

/**
 * Compiles a readable legal verification summary block to inject into the LLM system prompt.
 */
export function buildVerificationChecklistContextBlock(): string {
  const auth = verificationChecklistsData.authorities;
  const docs = verificationChecklistsData.legalDocuments;
  const flags = verificationChecklistsData.redFlags;

  return `
[VERIFIED LEGAL & DOCUMENTATION VERIFICATION]
1. URBAN REGULATORY AUTHORITIES (NOC Check portals):
   - Islamabad: CDA (${auth.cda.verificationMethod})
   - Lahore: LDA (${auth.lda.verificationMethod})
   - Rawalpindi: RDA (${auth.rda.verificationMethod})
   - Karachi: SBCA (${auth.sbca.verificationMethod})
   - DHA / Bahria: Verify directly at the respective land transfer office.

2. MANDATORY DOCUMENT CHECKLIST:
${docs.map(d => `   - ${d.document}: ${d.purpose} (Verify via: ${d.howToVerify})`).join('\n')}

3. RISKY RED FLAGS (Advise caution if encountered):
${flags.map(f => `   - ${f}`).join('\n')}

INSTRUCTION: Use this when asked how to verify land, what is LDA/RDA NOC status, Fard/Registry processes, or how to buy safely.
`.trim();
}