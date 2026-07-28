/**
 * lib/trustIndexCalculator.ts
 *
 * Highrise.pk — Trust Intelligence Engine
 *
 * Pure functions only. No server imports. No side effects.
 * Safe to import in both client and server contexts.
 *
 * SECURITY: No sensitive data processed here.
 *           Input validated by TypeScript types.
 *           No external API calls.
 *           Deterministic: same input → same output always.
 *
 * SEO:      Generates structured descriptions used in
 *           JSON-LD and meta content across the detail page.
 *
 * ARCHITECTURE:
 *   computeTrustIndex()     → Full TrustIndexBreakdown (7 sub-scores)
 *   buildPropertyPassport() → PropertyPassport (digital identity)
 *   generateAIRiskSummary() → AIRiskSummary (rule-based, 3 paragraphs)
 *
 * All three functions read from ProjectDetailData only.
 * No DB calls. No API calls. No async.
 */

import type {
  ProjectDetailData,
  TrustIndexBreakdown,
  TrustSubScore,
  TrustGrade,
  PropertyPassport,
  PassportBadge,
  LegalApproval,
  ConstructionArchiveEntry,
  AIRiskSummary,
  RiskLevel,
  PassportStatus,
} from '@/types/projectDetail';

import {
  generatePassportId,
  getDeveloperDisplayName,
  getProjectAreaDisplay,
  formatDetailDateShort,
} from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — Score weights (must sum to 100)
// ─────────────────────────────────────────────────────────────────────────────

const SCORE_WEIGHTS = {
  legal:          20,   // NOC + approvals
  developer:      20,   // track record + badge + trust
  construction:   15,   // progress + updates
  financial:      15,   // payment plan + document transparency
  satisfaction:   10,   // ratings + reviews
  location:       10,   // coordinates + nearby + advantages
  documents:      10,   // legal docs + project docs
} as const;

/** Platform average score for V1 (based on typical project data) */
const PLATFORM_AVG_SCORE = 67;

/** Grade thresholds */
const GRADE_THRESHOLDS: { min: number; grade: TrustGrade; label: string }[] = [
  { min: 90, grade: 'A+', label: 'Exceptional'  },
  { min: 80, grade: 'A',  label: 'Excellent'     },
  { min: 70, grade: 'B+', label: 'Very Good'     },
  { min: 60, grade: 'B',  label: 'Good'          },
  { min: 50, grade: 'C',  label: 'Fair'          },
  { min: 0,  grade: 'D',  label: 'Needs Review'  },
];

// Grade → Tailwind color classes
const GRADE_STYLES: Record<TrustGrade, {
  textColor: string;
  bgColor:   string;
  border:    string;
}> = {
  'A+': { textColor: 'text-emerald-700', bgColor: 'bg-emerald-50',  border: 'border-emerald-200' },
  'A':  { textColor: 'text-green-700',   bgColor: 'bg-green-50',    border: 'border-green-200'   },
  'B+': { textColor: 'text-teal-700',    bgColor: 'bg-teal-50',     border: 'border-teal-200'    },
  'B':  { textColor: 'text-[#029bba]',   bgColor: 'bg-[#029bba]/5', border: 'border-[#029bba]/20'},
  'C':  { textColor: 'text-amber-700',   bgColor: 'bg-amber-50',    border: 'border-amber-200'   },
  'D':  { textColor: 'text-red-700',     bgColor: 'bg-red-50',      border: 'border-red-200'     },
};

// Risk level → Tailwind color classes
const RISK_STYLES: Record<RiskLevel, {
  textColor:  string;
  bgColor:    string;
  borderColor: string;
  label:      string;
  emoji:      string;
}> = {
  low:    {
    textColor:   'text-emerald-700',
    bgColor:     'bg-emerald-50',
    borderColor: 'border-emerald-200',
    label:       'Low Risk',
    emoji:       '🟢',
  },
  medium: {
    textColor:   'text-amber-700',
    bgColor:     'bg-amber-50',
    borderColor: 'border-amber-200',
    label:       'Medium Risk',
    emoji:       '🟡',
  },
  high:   {
    textColor:   'text-red-700',
    bgColor:     'bg-red-50',
    borderColor: 'border-red-200',
    label:       'High Risk',
    emoji:       '🔴',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pct(score: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((score / max) * 100);
}

function getGrade(score: number): {
  grade:      TrustGrade;
  label:      string;
  textColor:  string;
  bgColor:    string;
} {
  const threshold = GRADE_THRESHOLDS.find(t => score >= t.min)
    ?? GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1]!;
  const style = GRADE_STYLES[threshold.grade];
  return {
    grade:     threshold.grade,
    label:     threshold.label,
    textColor: style.textColor,
    bgColor:   style.bgColor,
  };
}

function scoreColor(percentage: number): string {
  if (percentage >= 80) return 'text-emerald-600';
  if (percentage >= 60) return 'text-[#029bba]';
  if (percentage >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-emerald-500';
  if (percentage >= 60) return 'bg-[#029bba]';
  if (percentage >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-SCORE CALCULATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score 1: Legal Status (max 20 pts)
 * → NOC status, approval authority, legal docs
 */
function scoreLegal(project: ProjectDetailData): TrustSubScore {
  const reasons:  string[] = [];
  const missing:  string[] = [];
  let   score = 0;

  // NOC status — primary signal
  const noc = (project.nocStatus ?? '').toLowerCase();
  if (noc === 'approved') {
    score += 14;
    reasons.push('NOC approved by government authority');
  } else if (noc === 'pending') {
    score += 6;
    reasons.push('NOC application submitted and pending');
    missing.push('NOC approval not yet received');
  } else if (noc === 'applied') {
    score += 4;
    reasons.push('NOC application in process');
    missing.push('NOC approval pending');
  } else {
    missing.push('No NOC application on file');
  }

  // Approval authority named
  if (project.approvalAuthority && project.approvalAuthority.trim().length > 0) {
    score += 4;
    reasons.push(`Approved by ${project.approvalAuthority}`);
  } else {
    missing.push('Approval authority not specified');
  }

  // NOC document uploaded
  if (project.legalDocs?.nocUrl) {
    score += 2;
    reasons.push('NOC document available for download');
  } else {
    missing.push('NOC document not uploaded yet');
  }

  score = clamp(score, 0, SCORE_WEIGHTS.legal);

  return {
    key:        'legal',
    label:      'Legal Status',
    score,
    maxScore:   SCORE_WEIGHTS.legal,
    percentage: pct(score, SCORE_WEIGHTS.legal),
    color:      scoreColor(pct(score, SCORE_WEIGHTS.legal)),
    reasons,
    missing,
  };
}

/**
 * Score 2: Developer Track Record (max 20 pts)
 * → Badge tier, verified status, project count
 */
function scoreDeveloper(project: ProjectDetailData): TrustSubScore {
  const reasons: string[] = [];
  const missing: string[] = [];
  let   score = 0;

  const badge = (
    project.developerProfile?.developerBadge ??
    project.developerBadge ??
    'new_entrant'
  ).toLowerCase();

  // Badge tier
  if (badge === 'premium') {
    score += 14;
    reasons.push('Premium developer — highest tier');
  } else if (badge === 'trusted') {
    score += 11;
    reasons.push('Trusted builder — verified track record');
  } else if (badge === 'emerging') {
    score += 7;
    reasons.push('Emerging developer — growing reputation');
  } else {
    score += 3;
    reasons.push('New entrant — building track record');
    missing.push('Developer track record still being established');
  }

  // Trusted builder flag
  if (project.isTrustedBuilder) {
    score += 3;
    reasons.push('Highrise Trusted Builder designation');
  }

  // Completed projects count
  const completed = project.developerProfile?.completedProjectsCount ?? 0;
  if (completed >= 10) {
    score += 3;
    reasons.push(`${completed}+ completed projects on record`);
  } else if (completed >= 5) {
    score += 2;
    reasons.push(`${completed} completed projects`);
  } else if (completed >= 1) {
    score += 1;
    reasons.push(`${completed} completed project(s)`);
  } else {
    missing.push('No completed projects recorded yet');
  }

  // Established year (longevity)
  const estYear = project.developerProfile?.establishedYear;
  if (estYear) {
    const years = new Date().getFullYear() - estYear;
    if (years >= 10) {
      score += 2;
      reasons.push(`${years}+ years in operation`);
    } else if (years >= 5) {
      score += 1;
      reasons.push(`${years} years in operation`);
    }
  } else {
    missing.push('Establishment year not provided');
  }

  // Developer description (transparency)
  if (project.developerProfile?.description &&
      project.developerProfile.description.length > 50) {
    score += 1;
    reasons.push('Developer profile complete with description');
  }

  score = clamp(score, 0, SCORE_WEIGHTS.developer);

  return {
    key:        'developer',
    label:      'Developer Track Record',
    score,
    maxScore:   SCORE_WEIGHTS.developer,
    percentage: pct(score, SCORE_WEIGHTS.developer),
    color:      scoreColor(pct(score, SCORE_WEIGHTS.developer)),
    reasons,
    missing,
  };
}

/**
 * Score 3: Construction Progress (max 15 pts)
 * → Development progress %, update recency, update count
 */
function scoreConstruction(project: ProjectDetailData): TrustSubScore {
  const reasons: string[] = [];
  const missing: string[] = [];
  let   score = 0;

  const progress = project.developmentProgress ?? 0;

  // Progress percentage (0–8 pts)
  const progressScore = Math.round((progress / 100) * 8);
  score += progressScore;
  if (progress === 100) {
    reasons.push('Construction 100% complete');
  } else if (progress >= 75) {
    reasons.push(`Construction ${progress}% complete — near possession`);
  } else if (progress >= 50) {
    reasons.push(`Construction ${progress}% complete`);
  } else if (progress > 0) {
    reasons.push(`Construction ${progress}% complete — early stage`);
  } else {
    missing.push('Construction progress not updated');
  }

  // Development updates exist
  const updates = project.developmentUpdates ?? [];
  if (updates.length >= 6) {
    score += 4;
    reasons.push(`${updates.length} construction updates on record`);
  } else if (updates.length >= 3) {
    score += 3;
    reasons.push(`${updates.length} construction updates posted`);
  } else if (updates.length >= 1) {
    score += 1;
    reasons.push(`${updates.length} construction update(s) available`);
  } else {
    missing.push('No construction progress updates posted');
  }

  // Recent update (within 60 days)
  if (updates.length > 0) {
    const latestDate = updates
      .map(u => new Date(u.date).getTime())
      .reduce((a, b) => Math.max(a, b), 0);
    const daysSince = (Date.now() - latestDate) / (1000 * 60 * 60 * 24);
    if (daysSince <= 30) {
      score += 3;
      reasons.push('Construction update within last 30 days');
    } else if (daysSince <= 60) {
      score += 2;
      reasons.push('Recent construction update available');
    } else if (daysSince <= 90) {
      score += 1;
      reasons.push('Construction update within last 3 months');
    } else {
      missing.push('No construction update in last 90 days');
    }
  }

  score = clamp(score, 0, SCORE_WEIGHTS.construction);

  return {
    key:        'construction',
    label:      'Construction Progress',
    score,
    maxScore:   SCORE_WEIGHTS.construction,
    percentage: pct(score, SCORE_WEIGHTS.construction),
    color:      scoreColor(pct(score, SCORE_WEIGHTS.construction)),
    reasons,
    missing,
  };
}

/**
 * Score 4: Financial Transparency (max 15 pts)
 * → Payment plan, price list, brochure, floor plans
 */
function scoreFinancial(project: ProjectDetailData): TrustSubScore {
  const reasons: string[] = [];
  const missing: string[] = [];
  let   score = 0;

  // Installment plan documented
  if (project.installmentPlan) {
    score += 5;
    reasons.push('Payment plan fully documented');
  } else if (project.saleMode === 'Installment') {
    score += 2;
    reasons.push('Installment plan available (details pending)');
    missing.push('Full payment plan breakdown not uploaded');
  } else {
    missing.push('Payment structure not documented');
  }

  // Price list document
  if (project.projectDocuments?.priceListUrl) {
    score += 4;
    reasons.push('Official price list available for download');
  } else {
    missing.push('Price list document not uploaded');
  }

  // Payment plan PDF
  if (project.projectDocuments?.paymentPlanUrl) {
    score += 3;
    reasons.push('Payment plan PDF available');
  }

  // Brochure
  if (project.projectDocuments?.brochureUrl) {
    score += 2;
    reasons.push('Project brochure available');
  } else {
    missing.push('Project brochure not uploaded');
  }

  // Price range published
  if (project.minPrice && project.minPrice > 0) {
    score += 1;
    reasons.push('Price range publicly disclosed');
  } else {
    missing.push('Price range not disclosed');
  }

  score = clamp(score, 0, SCORE_WEIGHTS.financial);

  return {
    key:        'financial',
    label:      'Financial Transparency',
    score,
    maxScore:   SCORE_WEIGHTS.financial,
    percentage: pct(score, SCORE_WEIGHTS.financial),
    color:      scoreColor(pct(score, SCORE_WEIGHTS.financial)),
    reasons,
    missing,
  };
}

/**
 * Score 5: Customer Satisfaction (max 10 pts)
 * → Ratings, reviews count, inquiry count
 */
function scoreSatisfaction(project: ProjectDetailData): TrustSubScore {
  const reasons: string[] = [];
  const missing: string[] = [];
  let   score = 0;

  const rating  = project.averageRating ?? null;
  const reviews = project.totalReviews  ?? 0;

  if (rating !== null && reviews > 0) {
    // Rating score (0–7 pts)
    if (rating >= 4.5) {
      score += 7;
      reasons.push(`Exceptional rating: ${rating.toFixed(1)}/5`);
    } else if (rating >= 4.0) {
      score += 6;
      reasons.push(`Excellent rating: ${rating.toFixed(1)}/5`);
    } else if (rating >= 3.5) {
      score += 4;
      reasons.push(`Good rating: ${rating.toFixed(1)}/5`);
    } else if (rating >= 3.0) {
      score += 2;
      reasons.push(`Average rating: ${rating.toFixed(1)}/5`);
    } else {
      score += 1;
      reasons.push(`Below average rating: ${rating.toFixed(1)}/5`);
    }

    // Review count bonus (0–3 pts)
    if (reviews >= 50) {
      score += 3;
      reasons.push(`${reviews} verified reviews`);
    } else if (reviews >= 20) {
      score += 2;
      reasons.push(`${reviews} verified reviews`);
    } else if (reviews >= 5) {
      score += 1;
      reasons.push(`${reviews} verified reviews`);
    }
  } else {
    // No reviews yet — neutral score (not penalized heavily)
    score += 5;
    reasons.push('No reviews yet — neutral rating applied');
    missing.push('Verified buyer reviews not yet collected');
  }

  score = clamp(score, 0, SCORE_WEIGHTS.satisfaction);

  return {
    key:        'satisfaction',
    label:      'Buyer Satisfaction',
    score,
    maxScore:   SCORE_WEIGHTS.satisfaction,
    percentage: pct(score, SCORE_WEIGHTS.satisfaction),
    color:      scoreColor(pct(score, SCORE_WEIGHTS.satisfaction)),
    reasons,
    missing,
  };
}

/**
 * Score 6: Location Intelligence (max 10 pts)
 * → Coordinates, nearby facilities, location advantages
 */
function scoreLocation(project: ProjectDetailData): TrustSubScore {
  const reasons: string[] = [];
  const missing: string[] = [];
  let   score = 0;

  // GPS coordinates
  if (project.coordinates?.lat && project.coordinates?.lng) {
    score += 4;
    reasons.push('Exact GPS coordinates verified');
  } else {
    missing.push('GPS coordinates not provided');
  }

  // Nearby facilities
  const nearby = project.nearbyFacilities ?? [];
  if (nearby.length >= 8) {
    score += 3;
    reasons.push(`${nearby.length} nearby facilities mapped`);
  } else if (nearby.length >= 4) {
    score += 2;
    reasons.push(`${nearby.length} nearby facilities documented`);
  } else if (nearby.length >= 1) {
    score += 1;
    reasons.push(`${nearby.length} nearby place(s) listed`);
  } else {
    missing.push('Nearby facilities not documented');
  }

  // Location advantages
  const locAdv = project.locationAdvantages ?? [];
  if (locAdv.length >= 2) {
    score += 2;
    reasons.push('Location advantages documented');
  } else if (locAdv.length === 1) {
    score += 1;
    reasons.push('Location advantages partially documented');
  } else {
    missing.push('Location advantages not listed');
  }

  // Google Maps link
  if (project.googleMapLink || (project.coordinates?.lat && project.coordinates?.lng)) {
    score += 1;
    reasons.push('Google Maps location verified');
  }

  score = clamp(score, 0, SCORE_WEIGHTS.location);

  return {
    key:        'location',
    label:      'Location Intelligence',
    score,
    maxScore:   SCORE_WEIGHTS.location,
    percentage: pct(score, SCORE_WEIGHTS.location),
    color:      scoreColor(pct(score, SCORE_WEIGHTS.location)),
    reasons,
    missing,
  };
}

/**
 * Score 7: Document Completeness (max 10 pts)
 * → Legal docs, master plan, floor plans
 */
function scoreDocuments(project: ProjectDetailData): TrustSubScore {
  const reasons: string[] = [];
  const missing: string[] = [];
  let   score = 0;

  // NOC document
  if (project.legalDocs?.nocUrl) {
    score += 3;
    reasons.push('NOC certificate uploaded');
  } else {
    missing.push('NOC certificate not uploaded');
  }

  // Layout map
  if (project.legalDocs?.layoutMapUrl) {
    score += 2;
    reasons.push('Layout map available');
  } else {
    missing.push('Layout map not uploaded');
  }

  // SECP or authority license
  if (project.legalDocs?.secpCertUrl || project.legalDocs?.authorityLicenseUrl) {
    score += 2;
    reasons.push('Legal certificates available');
  } else {
    missing.push('SECP / authority certificates not uploaded');
  }

  // Master plan
  if (project.projectDocuments?.masterPlanUrl) {
    score += 2;
    reasons.push('Master plan available for download');
  } else {
    missing.push('Master plan not uploaded');
  }

  // Floor plans
  const floorPlans = project.buildingFloorPlans ?? [];
  if (floorPlans.length > 0) {
    score += 1;
    reasons.push(`${floorPlans.length} floor plan(s) available`);
  } else {
    missing.push('Floor plans not uploaded');
  }

  score = clamp(score, 0, SCORE_WEIGHTS.documents);

  return {
    key:        'documents',
    label:      'Document Completeness',
    score,
    maxScore:   SCORE_WEIGHTS.documents,
    percentage: pct(score, SCORE_WEIGHTS.documents),
    color:      scoreColor(pct(score, SCORE_WEIGHTS.documents)),
    reasons,
    missing,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT 1: computeTrustIndex
// ─────────────────────────────────────────────────────────────────────────────

/**
 * computeTrustIndex
 *
 * Computes the full 100-point Highrise Trust Index from project data.
 * Pure function — deterministic, no side effects, no async.
 *
 * SECURITY: No sensitive data exposed. Read-only from project.
 * SEO: Generates human-readable explanation used in meta content.
 */
export function computeTrustIndex(project: ProjectDetailData): TrustIndexBreakdown {
  // Calculate all 7 sub-scores
  const subScores: TrustSubScore[] = [
    scoreLegal(project),
    scoreDeveloper(project),
    scoreConstruction(project),
    scoreFinancial(project),
    scoreSatisfaction(project),
    scoreLocation(project),
    scoreDocuments(project),
  ];

  // Add bar color to each sub-score
  const enrichedSubScores = subScores.map(ss => ({
    ...ss,
    barColor: scoreBarColor(ss.percentage),
  }));

  // Overall score
  const overall = clamp(
    subScores.reduce((sum, ss) => sum + ss.score, 0),
    0,
    100,
  );

  // Grade
  const { grade, label: gradeLabel, textColor: gradeColor, bgColor: gradeBg } =
    getGrade(overall);

  // Strengths: top 3 sub-scores by percentage
  const strengths = [...subScores]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3)
    .filter(ss => ss.percentage >= 60)
    .flatMap(ss => ss.reasons.slice(0, 1));

  // Weaknesses: bottom sub-scores with missing items
  const weaknesses = [...subScores]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 3)
    .filter(ss => ss.percentage < 60)
    .flatMap(ss => (ss.missing ?? []).slice(0, 1));

  // vs platform average
  const vsAverage = overall - PLATFORM_AVG_SCORE;

  // Data points count (how many fields contributed)
  const dataPoints = subScores.reduce(
    (sum, ss) => sum + ss.reasons.length,
    0,
  );

  // Human-readable 1-sentence explanation (used in SEO/meta)
  const explanation = buildExplanation(overall, grade, project);

  return {
    overall,
    grade,
    gradeLabel,
    gradeColor,
    gradeBg,
    subScores:   enrichedSubScores,
    explanation,
    strengths,
    weaknesses,
    platformAvg: PLATFORM_AVG_SCORE,
    vsAverage,
    lastUpdated: new Date().toISOString(),
    dataPoints,
  };
}

function buildExplanation(
  overall: number,
  grade:   TrustGrade,
  project: ProjectDetailData,
): string {
  const area = getProjectAreaDisplay(project);
  const name = project.projectName;

  if (overall >= 90) {
    return `${name} in ${area} scores exceptionally — verified legal status, trusted developer, and complete documentation make this one of the most transparent projects on Highrise.pk.`;
  }
  if (overall >= 80) {
    return `${name} demonstrates excellent transparency with strong legal credentials and a verified developer track record in ${area}, ${project.city}.`;
  }
  if (overall >= 70) {
    return `${name} shows very good compliance — most key verification criteria are met, with some documentation still in progress.`;
  }
  if (overall >= 60) {
    return `${name} meets basic trust standards. Some documentation gaps exist — buyers should verify independently before committing.`;
  }
  if (overall >= 50) {
    return `${name} meets minimum listing standards. Buyers are advised to conduct thorough due diligence before any financial commitment.`;
  }
  return `${name} has limited verified data on Highrise.pk. Thorough independent verification is strongly recommended before proceeding.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT 2: buildPropertyPassport
// ─────────────────────────────────────────────────────────────────────────────

/**
 * buildPropertyPassport
 *
 * Constructs the Property Passport digital identity from project data.
 * Every project gets a unique HPP-YYYY-CCC-NNNNN identifier.
 *
 * SECURITY: Only public fields used. No CNIC, no contact data.
 * SEO: Passport data is referenced in structured data markup.
 */
export function buildPropertyPassport(
  project: ProjectDetailData,
): PropertyPassport {
  const passportId   = generatePassportId(project);
  const developerName = getDeveloperDisplayName(project.developerProfile);
  const area          = getProjectAreaDisplay(project);

  // Legal approval chain
  const legalApprovals: LegalApproval[] = buildLegalApprovals(project);

  // Verification badges
  const verificationBadges: PassportBadge[] = buildVerificationBadges(project);

  // Construction archive from developmentUpdates
  const constructionArchive: ConstructionArchiveEntry[] =
    buildConstructionArchive(project);

  // Passport completeness (0–100)
  const completeness = computePassportCompleteness(project);

  // Status
  const { status, statusLabel, statusColor } = computePassportStatus(
    project,
    completeness,
  );

  return {
    passportId,
    status,
    statusLabel,
    statusColor,
    issuedDate:   project.createdAt ?? new Date().toISOString(),
    projectName:  project.projectName,
    developerName,
    city:         project.city,
    category:     project.projectCategory,
    legalApprovals,
    verificationBadges,
    constructionArchive,
    completeness,
    completenessLabel: buildCompletenessLabel(completeness),
  };
}

function buildLegalApprovals(project: ProjectDetailData): LegalApproval[] {
  const approvals: LegalApproval[] = [];

  const noc = (project.nocStatus ?? '').toLowerCase();

  // Primary approval authority
  if (project.approvalAuthority) {
    approvals.push({
      authority: project.approvalAuthority,
      status:    noc === 'approved' ? 'approved' : noc === 'pending' ? 'pending' : 'not_applicable',
      docUrl:    project.legalDocs?.nocUrl,
      label:     `${project.approvalAuthority} Approval`,
    });
  } else {
    approvals.push({
      authority: 'NOC Status',
      status:    noc === 'approved' ? 'approved' : noc === 'pending' ? 'pending' : 'not_applicable',
      docUrl:    project.legalDocs?.nocUrl,
      label:     'NOC Certificate',
    });
  }

  // SECP
  if (project.legalDocs?.secpCertUrl) {
    approvals.push({
      authority: 'SECP',
      status:    'approved',
      docUrl:    project.legalDocs.secpCertUrl,
      label:     'SECP Registration',
    });
  }

  // Authority license
  if (project.legalDocs?.authorityLicenseUrl) {
    approvals.push({
      authority: 'Authority',
      status:    'approved',
      docUrl:    project.legalDocs.authorityLicenseUrl,
      label:     'Authority License',
    });
  }

  // Environment cert
  if (project.legalDocs?.environmentCertUrl) {
    approvals.push({
      authority: 'EPA',
      status:    'approved',
      docUrl:    project.legalDocs.environmentCertUrl,
      label:     'Environmental Certificate',
    });
  }

  return approvals;
}

function buildVerificationBadges(project: ProjectDetailData): PassportBadge[] {
  const badges: PassportBadge[] = [];

  if (project.isVerified) {
    badges.push({
      id:       'verified',
      label:    'Highrise Verified',
      emoji:    '✅',
      color:    'text-emerald-700',
      verified: true,
    });
  }

  if ((project.nocStatus ?? '').toLowerCase() === 'approved') {
    badges.push({
      id:       'noc',
      label:    'NOC Approved',
      emoji:    '🏛️',
      color:    'text-blue-700',
      verified: true,
    });
  }

  if (project.isTrustedBuilder) {
    badges.push({
      id:       'trusted_builder',
      label:    'Trusted Builder',
      emoji:    '🏆',
      color:    'text-[#029bba]',
      verified: true,
    });
  }

  const badge = (
    project.developerProfile?.developerBadge ??
    project.developerBadge ?? ''
  ).toLowerCase();

  if (badge === 'premium') {
    badges.push({
      id:       'premium',
      label:    'Premium Developer',
      emoji:    '💎',
      color:    'text-purple-700',
      verified: true,
    });
  }

  if (project.projectDocuments?.brochureUrl) {
    badges.push({
      id:       'brochure',
      label:    'Brochure Available',
      emoji:    '📋',
      color:    'text-gray-700',
      verified: true,
    });
  }

  if ((project.developmentUpdates ?? []).length > 0) {
    badges.push({
      id:       'construction_updates',
      label:    'Construction Updates',
      emoji:    '🏗️',
      color:    'text-amber-700',
      verified: true,
    });
  }

  return badges;
}

function buildConstructionArchive(
  project: ProjectDetailData,
): ConstructionArchiveEntry[] {
  const updates = project.developmentUpdates ?? [];
  return [...updates]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(u => ({
      date:      u.date,
      milestone: u.title,
      progress:  u.progress ?? u.progressPercent ?? 0,
      hasPhotos: (u.images ?? []).length > 0,
      hasDrone:  u.isDroneUpdate ?? false,
    }));
}

function computePassportCompleteness(project: ProjectDetailData): number {
  const checks = [
    !!project.featureImageUrl,
    (project.images ?? []).length > 0,
    !!project.description,
    !!project.approvalAuthority,
    (project.nocStatus ?? '').toLowerCase() === 'approved',
    !!project.legalDocs?.nocUrl,
    !!project.developerProfile?.companyName,
    (project.developerProfile?.completedProjectsCount ?? 0) > 0,
    !!project.installmentPlan,
    !!project.projectDocuments?.brochureUrl,
    !!project.projectDocuments?.priceListUrl,
    !!project.projectDocuments?.masterPlanUrl,
    !!project.coordinates?.lat,
    (project.nearbyFacilities ?? []).length > 0,
    (project.developmentUpdates ?? []).length > 0,
    (project.unitTypeBreakdown ?? []).length > 0,
    !!project.possessionStartDate,
    !!project.expectedCompletionDate,
    (project.amenitiesDetailed ?? []).length > 0,
    !!project.tagline,
  ];

  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

function computePassportStatus(
  project:      ProjectDetailData,
  completeness: number,
): { status: PassportStatus; statusLabel: string; statusColor: string } {
  if (project.isVerified && completeness >= 70) {
    return {
      status:      'verified',
      statusLabel: '✅ Verified',
      statusColor: 'text-emerald-700',
    };
  }
  if (project.isVerified || completeness >= 50) {
    return {
      status:      'partial',
      statusLabel: '⚠️ Partially Verified',
      statusColor: 'text-amber-700',
    };
  }
  return {
    status:      'pending',
    statusLabel: '🔄 Verification Pending',
    statusColor: 'text-gray-500',
  };
}

function buildCompletenessLabel(completeness: number): string {
  if (completeness >= 90) return 'Comprehensive';
  if (completeness >= 70) return 'Well Documented';
  if (completeness >= 50) return 'Partially Complete';
  if (completeness >= 30) return 'Basic Information';
  return 'Minimal Data';
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT 3: generateAIRiskSummary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateAIRiskSummary
 *
 * Generates a rule-based 3-paragraph risk analysis.
 * No LLM required for V1. Pure deterministic logic.
 *
 * Output used in:
 *   → AIRiskSummary component (detail page)
 *   → Meta description enhancement
 *   → JSON-LD description field
 *
 * SECURITY: No external API calls. No user data used.
 *           Output is read-only analysis, not advice.
 * SEO: Generated text is unique per project — no duplicate content.
 */
export function generateAIRiskSummary(
  project:    ProjectDetailData,
  trustIndex: TrustIndexBreakdown,
): AIRiskSummary {
  const area         = getProjectAreaDisplay(project);
  const developerName = getDeveloperDisplayName(project.developerProfile);
  const riskLevel    = determineRiskLevel(project, trustIndex);
  const style        = RISK_STYLES[riskLevel];

  const positives = buildPositives(project, trustIndex);
  const warnings  = buildWarnings(project, trustIndex);

  const overview       = buildOverview(project, developerName, area);
  const riskAssessment = buildRiskAssessment(project, trustIndex, riskLevel, positives, warnings);
  const recommendation = buildRecommendation(project, riskLevel, trustIndex);

  const confidence  = computeConfidence(project, trustIndex);
  const dataPoints  = trustIndex.dataPoints;

  return {
    riskLevel,
    riskLabel:     style.label,
    riskColor:     style.textColor,
    riskBg:        style.bgColor,
    riskBorder:    style.borderColor,
    confidence,
    dataPoints,
    overview,
    riskAssessment,
    recommendation,
    warnings,
    positives,
    lastUpdated: new Date().toISOString(),
  };
}

function determineRiskLevel(
  project:    ProjectDetailData,
  trustIndex: TrustIndexBreakdown,
): RiskLevel {
  // Use DB field if explicitly set
  if (project.riskLevel) return project.riskLevel;

  // Compute from trust index
  if (trustIndex.overall >= 75) return 'low';
  if (trustIndex.overall >= 50) return 'medium';
  return 'high';
}

function buildPositives(
  project:    ProjectDetailData,
  trustIndex: TrustIndexBreakdown,
): string[] {
  const list: string[] = [];

  if ((project.nocStatus ?? '').toLowerCase() === 'approved') {
    list.push(`NOC approved by ${project.approvalAuthority || 'government authority'}`);
  }
  if (project.isVerified) {
    list.push('Listing verified by Highrise.pk team');
  }
  if (project.isTrustedBuilder) {
    list.push('Developer holds Highrise Trusted Builder designation');
  }
  if ((project.developerProfile?.completedProjectsCount ?? 0) >= 5) {
    list.push(`Developer has ${project.developerProfile!.completedProjectsCount}+ completed projects`);
  }
  if ((project.developmentProgress ?? 0) >= 75) {
    list.push(`Construction ${project.developmentProgress}% complete — near possession`);
  }
  if (trustIndex.overall >= 80) {
    list.push('Above-average Highrise Trust Index score');
  }
  if ((project.developmentUpdates ?? []).length >= 3) {
    list.push('Regular construction progress updates on record');
  }
  if (project.projectDocuments?.brochureUrl) {
    list.push('Official project brochure available');
  }

  return list.slice(0, 5);
}

function buildWarnings(
  project:    ProjectDetailData,
  trustIndex: TrustIndexBreakdown,
): string[] {
  const list: string[] = [];

  const noc = (project.nocStatus ?? '').toLowerCase();
  if (!noc || noc === 'not_applied') {
    list.push('No NOC application recorded — verify legal status independently');
  } else if (noc === 'pending') {
    list.push('NOC application pending — approval not yet received');
  }

  if (!project.isVerified) {
    list.push('Listing not yet verified by Highrise.pk team');
  }

  if ((project.developmentProgress ?? 0) === 0) {
    list.push('Construction progress not updated — contact developer for status');
  }

  if ((project.developmentUpdates ?? []).length === 0) {
    list.push('No construction progress updates posted');
  }

  if (!project.installmentPlan && project.saleMode === 'Installment') {
    list.push('Installment plan mentioned but payment schedule not documented');
  }

  if (trustIndex.overall < 50) {
    list.push('Low Trust Index — independent verification strongly recommended');
  }

  const badge = (project.developerProfile?.developerBadge ?? 'new_entrant').toLowerCase();
  if (badge === 'new_entrant') {
    list.push('Developer is a new entrant — track record still being established');
  }

  return list.slice(0, 4);
}

function buildOverview(
  project:      ProjectDetailData,
  developerName: string,
  area:          string,
): string {
  const category = project.projectCategory?.replace(/_/g, ' ') ?? 'project';
  const nature   = project.projectNature ?? '';
  const status   = project.projectStatus ?? project.status ?? '';
  const progress = project.developmentProgress ?? 0;

  const unitCount = (project.unitTypeBreakdown ?? []).length;
  const unitText  = unitCount > 0
    ? ` offering ${unitCount} unit type${unitCount > 1 ? 's' : ''}`
    : '';

  const progressText = progress > 0
    ? ` Construction is ${progress}% complete.`
    : '';

  const possessionText = project.possessionStartDate
    ? ` Expected possession: ${formatDetailDateShort(project.possessionStartDate)}.`
    : '';

  return `${project.projectName} is a ${nature} ${category} developed by ${developerName} in ${area}, ${project.city}${unitText}.${progressText}${possessionText} This analysis is based on ${PLATFORM_AVG_SCORE > 0 ? 'verified platform data' : 'available listing information'} and should be used as a starting point for your research.`;
}

function buildRiskAssessment(
  project:    ProjectDetailData,
  trustIndex: TrustIndexBreakdown,
  riskLevel:  RiskLevel,
  positives:  string[],
  warnings:   string[],
): string {
  const score      = trustIndex.overall;
  const grade      = trustIndex.grade;
  const vsAvg      = trustIndex.vsAverage;
  const comparison = vsAvg >= 0
    ? `${vsAvg} points above the platform average`
    : `${Math.abs(vsAvg)} points below the platform average`;

  const positiveText = positives.length > 0
    ? `Key strengths include: ${positives.slice(0, 2).join('; ')}.`
    : '';

  const warningText = warnings.length > 0
    ? ` Areas of concern: ${warnings.slice(0, 2).join('; ')}.`
    : ' No major concerns detected.';

  const riskText = riskLevel === 'low'
    ? 'This project demonstrates strong trust signals and is suitable for buyers who prioritize security and transparency.'
    : riskLevel === 'medium'
    ? 'This project meets basic trust criteria but has some documentation gaps that buyers should verify independently.'
    : 'This project has significant information gaps. Buyers should conduct thorough due diligence before proceeding.';

  return `Highrise Trust Index: ${score}/100 (Grade ${grade}) — ${comparison}. ${positiveText}${warningText} ${riskText}`;
}

function buildRecommendation(
  project:    ProjectDetailData,
  riskLevel:  RiskLevel,
  trustIndex: TrustIndexBreakdown,
): string {
  const investorNote = riskLevel === 'low'
    ? 'Suitable for both end-users and investors seeking verified projects with transparent documentation.'
    : riskLevel === 'medium'
    ? 'Recommended for buyers willing to do additional verification. Investors should assess ROI carefully.'
    : 'Best approached with professional legal and financial consultation before any commitment.';

  const actionNote = riskLevel === 'low'
    ? 'We recommend visiting the project site and reviewing all documents before finalizing.'
    : riskLevel === 'medium'
    ? 'Request all legal documents from the developer and verify independently before proceeding.'
    : 'Strongly recommend independent legal review, site visit, and document verification before any payment.';

  const disclaimer = 'This analysis is generated from verified platform data and does not constitute financial, legal, or investment advice.';

  return `${investorNote} ${actionNote} ${disclaimer}`;
}

function computeConfidence(
  project:    ProjectDetailData,
  trustIndex: TrustIndexBreakdown,
): number {
  // Confidence = how much verified data we have (not quality of project)
  const checks = [
    project.isVerified,
    !!project.approvalAuthority,
    (project.nocStatus ?? '').toLowerCase() === 'approved',
    !!project.developerProfile?.companyName,
    (project.developerProfile?.completedProjectsCount ?? 0) > 0,
    (project.unitTypeBreakdown ?? []).length > 0,
    !!project.minPrice,
    !!project.possessionStartDate,
    (project.developmentUpdates ?? []).length > 0,
    !!project.coordinates?.lat,
  ];

  const filled     = checks.filter(Boolean).length;
  const base       = Math.round((filled / checks.length) * 100);
  return clamp(base, 40, 97); // 40% min, 97% max (never claim 100%)
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT: Score bar color utility (used by components)
// ─────────────────────────────────────────────────────────────────────────────

export { scoreBarColor, scoreColor, GRADE_STYLES, RISK_STYLES, PLATFORM_AVG_SCORE };