/**
 * types/projectDetail.ts
 *
 * Highrise.pk — Project Detail Page Types (Wave 1)
 * All types exclusive to /projects/[slug] detail page.
 *
 * IMPORTS from types/projects.ts where possible — zero duplication.
 * NO server-only imports — pure types + pure functions only.
 *
 * Rule Set A: Brand locked
 * Rule Set B: Security typed
 * Rule Set C: SEO structured data types included
 */

import type { DeveloperBadge, NocStatus } from './projects';

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS — convenience (components import from one place)
// ─────────────────────────────────────────────────────────────────────────────

export type { DeveloperBadge, NocStatus };

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectImage {
  url:        string;
  publicId?:  string;
  caption?:   string;
  isPrimary?: boolean;
  order?:     number;
  category?:  string;
  type?:      string;
}

export interface ProjectVideo {
  url:        string;
  title?:     string;
  platform?:  string;
  thumbnail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface UnitTypeOffering {
  type?:           string;
  name?:           string;
  category?:       'residential' | 'commercial';
  totalUnits?:     number;
  availableUnits?: number;
  soldUnits?:      number;
  priceRange?:     { min: number; max: number };
  minPrice?:       number;
  maxPrice?:       number;
  areaRange?:      { min: number; max: number; unit: string };
  minArea?:        number;
  maxArea?:        number;
  areaUnit?:       string;
  bedrooms?:       number;
  bathrooms?:      number;
  description?:    string;
  features?:       string[];
  interiorImages?: { url: string; caption?: string }[];
  image?:          string;
  imageUrl?:       string;
  floorPlanPdfUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR PLANS
// ─────────────────────────────────────────────────────────────────────────────

export interface FloorPlan {
  floorName:    string;
  floorNumber?: number;
  floorType?:   string;
  pdfUrl?:      string;
  imageUrl?:    string;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTION TIMELINE
// ─────────────────────────────────────────────────────────────────────────────

export interface ConstructionMilestone {
  date:             string;       // ISO
  title:            string;
  description?:     string;
  images?:          string[];
  progress?:        number;       // 0–100
  progressPercent?: number;       // alias
  isDroneUpdate?:   boolean;
  engineerNote?:    string;
  qualityChecks?:   string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// NEARBY PLACES
// ─────────────────────────────────────────────────────────────────────────────

export type NearbyCategory =
  | 'hospital'
  | 'school'
  | 'restaurant'
  | 'park'
  | 'mall'
  | 'mosque'
  | 'bank'
  | 'transport'
  | 'other';

export interface NearbyPlace {
  name:      string;
  category:  NearbyCategory;
  distance?: string;
  icon?:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AMENITIES
// ─────────────────────────────────────────────────────────────────────────────

export interface AmenityItem {
  name:         string;
  description?: string;
  icon?:        string;
  category:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPER PROFILE (detail page shape — richer than listing card)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeveloperProfileDetail {
  companyName?:            string;
  name?:                   string;
  ceoName?:                string;
  logoUrl?:                string;
  description?:            string;
  establishedYear?:        number;
  totalProjects?:          number;
  completedProjectsCount?: number;
  highriseScore?:          number;
  riskLevel?:              'low' | 'medium' | 'high';
  verificationLevel?:      string;
  isVerified?:             boolean;
  developerBadge?:         string;
  website?:                string;
  // Contact intentionally omitted — contact gating enforced
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPER ACCOUNTABILITY — Track record metrics
// Built from developerProfile fields + computed
// ─────────────────────────────────────────────────────────────────────────────

export interface DeveloperAccountability {
  totalProjects:         number;
  completedProjects:     number;
  ongoingProjects:       number;
  delayedProjects:       number;
  cancelledProjects:     number;
  averageDelayMonths:    number;       // 0 = no delays recorded
  customerRating:        number | null; // 0–5
  repeatBuyerPercent:    number | null; // 0–100
  hasLitigation:         boolean;
  isSECPVerified:        boolean;
  isLDAApproved:         boolean;
  establishedYear:       number | null;
  yearsInOperation:      number;       // computed: current year - established
  trustTier:             'new_entrant' | 'emerging' | 'trusted' | 'premium';
  trustTierLabel:        string;
  trustTierEmoji:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTALLMENT PLAN
// ─────────────────────────────────────────────────────────────────────────────

export interface InstallmentPlan {
  totalPrice?:          number;
  bookingAmount?:       number;
  bookingPercent?:      number;
  downPayment?:         number;
  downPaymentPercent?:  number;
  monthlyAmount?:       number;
  monthlyDuration?:     number;
  quarterlyAmount?:     number;
  quarterlyDuration?:   number;
  halfYearlyAmount?:    number;
  halfYearlyDuration?:  number;
  possessionAmount?:    number;
  possessionPercent?:   number;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface LegalDocs {
  nocUrl?:             string;
  secpCertUrl?:        string;
  layoutMapUrl?:       string;
  environmentCertUrl?: string;
  authorityLicenseUrl?: string;
}

export interface ProjectDocuments {
  brochureUrl?:    string;
  priceListUrl?:   string;
  masterPlanUrl?:  string;
  paymentPlanUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETED / RELATED PROJECTS (developer track record display)
// ─────────────────────────────────────────────────────────────────────────────

export interface RelatedProject {
  name:     string;
  type:     string;
  location: string;
  year:     number;
  image?:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT ROW (inventory table)
// ─────────────────────────────────────────────────────────────────────────────

export type UnitStatus = 'available' | 'reserved' | 'sold' | 'on_hold' | 'cancelled';

export interface UnitRow {
  _id:          string;
  unitNumber:   string;
  floorNumber:  number;
  floorName?:   string;
  unitType:     string;
  price:        number;
  area?:        number;
  areaSqft?:    number;
  areaMarla?:   number;
  areaUnit?:    string;
  status:       UnitStatus;
  bedrooms?:    number;
  bathrooms?:   number;
  facing?:      string;
  listingType?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMILAR PROJECT (card in SimilarProjectsSection)
// ─────────────────────────────────────────────────────────────────────────────

export interface SimilarProject {
  _id:             string;
  slug:            string;
  projectName:     string;
  city:            string;
  area:            string;
  projectCategory: string;
  minPrice?:       number;
  maxPrice?:       number;
  highriseScore?:  number;
  riskLevel?:      string;
  isVerified?:     boolean;
  isTrustedBuilder?: boolean;
  developerBadge?: string;
  primaryImage:    string | null;
  developerName?:  string;
  createdAt?:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PROJECT DATA SHAPE (full detail page)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectDetailData {
  _id:               string;
  slug:              string;
  projectName:       string;
  tagline?:          string;
  shortDescription?: string;
  description?:      string;

  // Location
  city:               string;
  areaName?:          string;
  area?:              string;
  specificLocation?:  string;
  googleMapLink?:     string;
  coordinates?:       { lat?: number; lng?: number };

  // Classification
  projectCategory:  string;
  projectNature:    string;
  status:           string;
  projectStatus?:   string;
  saleMode?:        string;
  deliveryStatus?:  string;

  // Trust signals
  isVerified:        boolean;
  isFeatured?:       boolean;
  isTrustedBuilder?: boolean;
  highriseScore?:    number;
  riskLevel?:        'low' | 'medium' | 'high';
  verificationLevel?: string;
  nocStatus?:        string;
  approvalAuthority?: string;

  // Verification Panel (Fact-Based Regulatory Evidence)
  verificationPanel?: {
    verifiedBy?:      string;
    source?:          string;
    verifiedAt?:      string;
    legalDisclaimer?: string;
  };

  // Timeline
  launchDate?:             string;
  expectedCompletionDate?: string;
  possessionStartDate?:    string;
  developmentProgress?:    number;

  // Inventory
  totalUnits?:     number;
  unitsSold?:      number;
  unitsAvailable?: number;

  // Pricing
  minPrice?: number;
  maxPrice?: number;

  // Media
  featureImageUrl?: string;
  images?:          ProjectImage[];
  videos?:          ProjectVideo[];
  droneVideoUrl?:   string;
  virtualTourUrl?:  string;

  // Floor details
  floorDetails?: {
    totalFloors?:           number;
    floorsForParking?:      number;
    floorsForCommercial?:   number;
    floorsForResidential?:  number;
  };

  // Content sections
  amenitiesDetailed?:   AmenityItem[];
  unitTypeBreakdown?:   UnitTypeOffering[];
  buildingFloorPlans?:  FloorPlan[];
  installmentPlan?:     InstallmentPlan;
  nearbyFacilities?:    NearbyPlace[];
  locationAdvantages?:  { title: string; points: string[] }[];
  developmentUpdates?:  ConstructionMilestone[];
  completedProjects?:   RelatedProject[];
  relatedProjects?:     RelatedProject[];

  // Legal
  legalDocs?:         LegalDocs;
  projectDocuments?:  ProjectDocuments;

  // Developer
  developer:          string;   // ObjectId ref
  developerId?:       string;
  developerProfile?:  DeveloperProfileDetail;
  developerBadge?:    string;

  // Engagement
  averageRating?:  number;
  totalReviews?:   number;

  // Meta
  projectId?: string;   // HR-PRJ-XXXXX public reference (ProjectIdChip + inquiry context)
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PROPS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectDetailPageProps {
  project:      ProjectDetailData;
  initialUnits: UnitRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST INDEX — 7 sub-scores, 100 points total
// ─────────────────────────────────────────────────────────────────────────────

export interface TrustSubScore {
  key:         string;
  label:       string;
  score:       number;      // actual points earned
  maxScore:    number;      // maximum possible
  percentage:  number;      // score / maxScore * 100
  color:       string;      // Tailwind color class
  reasons:     string[];    // why this score was given
  missing?:    string[];    // what would improve this score
}

export interface TrustIndexBreakdown {
  overall:      number;         // 0–100 sum of all sub-scores
  grade:        TrustGrade;
  gradeLabel:   string;
  gradeColor:   string;         // Tailwind text color class
  gradeBg:      string;         // Tailwind bg color class
  subScores:    TrustSubScore[];
  explanation:  string;         // 1-sentence human-readable summary
  strengths:    string[];       // top 3 positives
  weaknesses:   string[];       // top 3 gaps
  platformAvg:  number;         // platform average (hardcoded 67 for V1)
  vsAverage:    number;         // overall - platformAvg (positive = above)
  lastUpdated:  string;         // ISO date
  dataPoints:   number;         // how many fields contributed
}

export type TrustGrade = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY PASSPORT — digital identity per project
// ─────────────────────────────────────────────────────────────────────────────

export type PassportStatus = 'verified' | 'partial' | 'pending';

export interface PassportBadge {
  id:       string;
  label:    string;
  emoji:    string;
  color:    string;   // Tailwind color class
  verified: boolean;
}

export interface LegalApproval {
  authority:   string;      // 'LDA' | 'CDA' | 'DHA' | 'SECP' etc.
  status:      'approved' | 'pending' | 'not_applicable';
  docUrl?:     string;
  label:       string;
}

export interface PropertyPassport {
  passportId:    string;      // HPP-YYYY-CCC-NNNNN
  status:        PassportStatus;
  statusLabel:   string;
  statusColor:   string;      // Tailwind color class
  issuedDate:    string;      // ISO
  projectName:   string;
  developerName: string;
  city:          string;
  category:      string;

  // Verification chain
  legalApprovals:       LegalApproval[];
  verificationBadges:   PassportBadge[];
  constructionArchive:  ConstructionArchiveEntry[];

  // Passport completeness (0–100)
  completeness:         number;
  completenessLabel:    string;
}

export interface ConstructionArchiveEntry {
  date:       string;   // ISO
  milestone:  string;
  progress:   number;   // 0–100
  hasPhotos:  boolean;
  hasDrone:   boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI RISK SUMMARY — rule-based for V1 (no LLM required)
// ─────────────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high';

export interface AIRiskSummary {
  riskLevel:        RiskLevel;
  riskLabel:        string;
  riskColor:        string;     // Tailwind text color
  riskBg:           string;     // Tailwind bg color
  riskBorder:       string;     // Tailwind border color
  confidence:       number;     // 0–100
  dataPoints:       number;     // fields used in analysis
  overview:         string;     // paragraph 1: what this project is
  riskAssessment:   string;     // paragraph 2: risks and trust signals
  recommendation:   string;     // paragraph 3: who this is best for
  warnings:         string[];   // red flags (if any)
  positives:        string[];   // green flags
  lastUpdated:      string;     // ISO
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTIONS BAR
// ─────────────────────────────────────────────────────────────────────────────

export type InquiryType =
  | 'project_interest'
  | 'call_back'
  | 'site_visit'
  | 'general_inquiry';

export interface QuickAction {
  id:       string;
  label:    string;
  icon:     string;         // Lucide icon name
  type:     'favorite' | 'compare' | 'share' | 'inquiry' | 'download';
  primary?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION TAB NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionTab {
  id:    string;
  label: string;
}

export const DETAIL_SECTION_TABS: readonly SectionTab[] = [
  { id: 'overview',   label: 'Overview'      },
  { id: 'units',      label: 'Units & Pricing'},
  { id: 'about',      label: 'About'         },
  { id: 'features',   label: 'Features'      },
  { id: 'location',   label: 'Location'      },
  { id: 'developer',  label: 'Developer'     },
  { id: 'payment',    label: 'Payment Plan'  },
  { id: 'legal',      label: 'Documents'     },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// UNIT STATUS STYLING
// ─────────────────────────────────────────────────────────────────────────────

export const UNIT_STATUS_STYLES: Record<UnitStatus, string> = {
  available: 'bg-green-100 text-green-700 border-green-200',
  reserved:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  sold:      'bg-red-100 text-red-700 border-red-200',
  on_hold:   'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-400 border-gray-200',
};

// ─────────────────────────────────────────────────────────────────────────────
// NEARBY CATEGORY CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const NEARBY_CATEGORY_LABELS: Record<NearbyCategory, string> = {
  hospital:   'Hospital',
  school:     'School',
  restaurant: 'Restaurant',
  park:       'Park',
  mall:       'Shopping Mall',
  mosque:     'Mosque',
  bank:       'Bank',
  transport:  'Transport',
  other:      'Other',
};

// ─────────────────────────────────────────────────────────────────────────────
// PURE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * formatDetailPrice
 * Consistent PKR formatting for detail page.
 * Returns "Contact for Price" on zero/null.
 */
export function formatDetailPrice(price: number | null | undefined): string {
  if (!price || price === 0) return 'Contact for Price';
  if (price >= 10_000_000) {
    const crore = price / 10_000_000;
    return `${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Crore`;
  }
  if (price >= 100_000) {
    const lac = price / 100_000;
    return `${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(2)} Lac`;
  }
  return `Rs. ${price.toLocaleString()}`;
}

/**
 * formatDetailDate
 * Formats ISO date string for Pakistan locale.
 */
export function formatDetailDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * formatDetailDateShort
 * Short month-year format (e.g. "Jan 2026")
 */
export function formatDetailDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      year: 'numeric', month: 'short',
    });
  } catch {
    return '';
  }
}

/**
 * convertToSqftAndMarla
 * Area conversion utility (same logic as inline, now centralized).
 */
export function convertToSqftAndMarla(
  value: number,
  fromUnit: string,
): { sqft: number; marla: number } {
  const toSqFt: Record<string, number> = {
    sqft: 1, 'sq.ft': 1, 'sq ft': 1,
    sqm: 10.764, 'sq.m': 10.764,
    marla: 272.25, kanal: 5445,
  };
  const factor = toSqFt[(fromUnit ?? '').trim().toLowerCase()] ?? 1;
  const sqft   = value * factor;
  return {
    sqft:  Math.round(sqft),
    marla: parseFloat((sqft / 272.25).toFixed(2)),
  };
}

/**
 * getYouTubeEmbedUrl
 * Extracts YouTube video ID and returns embed URL.
 */
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  const m = url.match(
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  );
  return m && m[2].length === 11
    ? `https://www.youtube.com/embed/${m[2]}`
    : url;
}

/**
 * getMapEmbedUrl
 * Generates Google Maps embed URL from project coordinates or address.
 */
export function getMapEmbedUrl(project: ProjectDetailData): string {
  if (project.coordinates?.lat && project.coordinates?.lng) {
    return `https://maps.google.com/maps?q=${project.coordinates.lat},${project.coordinates.lng}&z=15&output=embed`;
  }
  if (project.googleMapLink) {
    const m = project.googleMapLink.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (m) {
      return `https://maps.google.com/maps?q=${m[1]},${m[2]}&z=15&output=embed`;
    }
  }
  const area = project.areaName ?? project.area ?? '';
  const q    = encodeURIComponent(
    `${project.specificLocation ? project.specificLocation + ', ' : ''}${area}, ${project.city}, Pakistan`
  );
  return `https://maps.google.com/maps?q=${q}&z=14&output=embed`;
}

/**
 * getMapsDirectLink
 * Returns Google Maps link for "Open in Maps" button.
 */
export function getMapsDirectLink(project: ProjectDetailData): string {
  if (project.coordinates?.lat && project.coordinates?.lng) {
    return `https://www.google.com/maps?q=${project.coordinates.lat},${project.coordinates.lng}`;
  }
  if (project.googleMapLink) return project.googleMapLink;
  const area = project.areaName ?? project.area ?? '';
  return `https://www.google.com/maps/search/${encodeURIComponent(
    area + ', ' + project.city + ', Pakistan'
  )}`;
}

/**
 * generatePassportId
 * Creates a deterministic passport ID from project data.
 * Format: HPP-YYYY-CCC-NNNNN
 * Example: HPP-2026-ISB-00847
 */
export function generatePassportId(project: ProjectDetailData): string {
  const year    = project.createdAt
    ? new Date(project.createdAt).getFullYear()
    : new Date().getFullYear();

  const cityCode = (project.city ?? 'PKK')
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, 'X');

  // Deterministic numeric suffix from _id
  const idStr  = project._id ?? '00000';
  const suffix = parseInt(idStr.slice(-5), 16) % 100000;
  const padded = String(suffix).padStart(5, '0');

  return `HPP-${year}-${cityCode}-${padded}`;
}

/**
 * getDeveloperDisplayName
 * Safe developer name extraction from profile.
 */
export function getDeveloperDisplayName(
  profile: DeveloperProfileDetail | null | undefined
): string {
  return profile?.companyName ?? profile?.name ?? 'Verified Developer';
}

/**
 * getPrimaryImageUrl
 * Resolves primary image from project data.
 */
export function getPrimaryImageUrl(project: ProjectDetailData): string {
  if (project.featureImageUrl) return project.featureImageUrl;
  if (Array.isArray(project.images) && project.images.length > 0) {
    const primary = project.images.find(img => img.isPrimary);
    return primary?.url ?? project.images[0]?.url ?? '';
  }
  return '';
}

/**
 * getProjectAreaDisplay
 * Returns the best available area/locality string.
 */
export function getProjectAreaDisplay(project: ProjectDetailData): string {
  return project.areaName ?? project.area ?? '';
}

/**
 * computeDeveloperAccountability
 *
 * V1.1 — Smart Fallback Edition
 *
 * Computes DeveloperAccountability from:
 *   1. DeveloperProfile fields (if available and populated)
 *   2. FALLBACK: completedProjects array (if profile fields are missing)
 *   3. FALLBACK: current project itself counts as 1 ongoing
 *
 * This handles the real-world case where `developerProfile` is null
 * or has missing numeric fields. Never shows "—" when data can be
 * derived from the current project.
 *
 * V2 will use direct DB aggregation on DeveloperProfile.deliveryHistory.
 */
export function computeDeveloperAccountability(
  profile: DeveloperProfileDetail | null | undefined,
  completedProjectsArray?: RelatedProject[] | null,
  currentProjectIsOngoing?: boolean,
): DeveloperAccountability {
  const badge = (profile?.developerBadge ?? 'new_entrant') as DeveloperBadge;

  const trustTierMap: Record<
    string,
    { tier: DeveloperAccountability['trustTier']; label: string; emoji: string }
  > = {
    premium:     { tier: 'premium',     label: 'Premium Developer',   emoji: '💎' },
    trusted:     { tier: 'trusted',     label: 'Trusted Builder',      emoji: '🏆' },
    emerging:    { tier: 'emerging',    label: 'Emerging Developer',   emoji: '⭐' },
    new_entrant: { tier: 'new_entrant', label: 'New Entrant',          emoji: '🆕' },
  };

  const tierInfo = trustTierMap[badge] ?? trustTierMap['new_entrant']!;

  const established   = profile?.establishedYear ?? null;
  const currentYear   = new Date().getFullYear();
  const yearsInOp     = established ? currentYear - established : 0;

  // ── Smart count computation ──
  // Priority: profile fields → array counts → 0 fallback

  const arrayCompletedCount = (completedProjectsArray ?? []).length;
  const currentOngoingCount = currentProjectIsOngoing ? 1 : 0;

  const completedProjects = profile?.completedProjectsCount
    ?? arrayCompletedCount;

  const totalProjectsRaw = profile?.totalProjects
    ?? (arrayCompletedCount + currentOngoingCount);

  const totalProjects = totalProjectsRaw > 0 ? totalProjectsRaw : 0;

  // Ongoing = total - completed (never negative)
  const ongoingProjects = Math.max(
    currentOngoingCount,
    totalProjects - completedProjects,
  );

  return {
    totalProjects,
    completedProjects,
    ongoingProjects,
    delayedProjects:     0,
    cancelledProjects:   0,
    averageDelayMonths:  0,
    customerRating:      null,
    repeatBuyerPercent:  null,
    hasLitigation:       false,
    isSECPVerified:      profile?.verificationLevel === 'secp' || false,
    isLDAApproved:       false,
    establishedYear:     established,
    yearsInOperation:    yearsInOp,
    trustTier:           tierInfo.tier,
    trustTierLabel:      tierInfo.label,
    trustTierEmoji:      tierInfo.emoji,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DURATION HELPERS (Wave 5A — Hero Redesign)
// Used in ProjectDetailHero to show Start → Possession duration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculateDurationMonths
 *
 * Calculates the number of full calendar months between two dates.
 * Handles invalid inputs gracefully (returns 0).
 *
 * @param startDate - ISO date string (e.g. "2026-01-15")
 * @param endDate   - ISO date string (e.g. "2028-01-15")
 * @returns         - Integer number of months (0 if invalid or negative)
 *
 * @example
 *   calculateDurationMonths('2026-01-15', '2028-01-15')  // → 24
 *   calculateDurationMonths('2026-01-15', '2027-07-15')  // → 18
 *   calculateDurationMonths(null, '2028-01-15')          // → 0
 */
export function calculateDurationMonths(
  startDate: string | null | undefined,
  endDate:   string | null | undefined,
): number {
  if (!startDate || !endDate) return 0;

  try {
    const start = new Date(startDate);
    const end   = new Date(endDate);

    // Validate parsed dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (end.getTime() < start.getTime()) return 0;

    const yearDiff  = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth()    - start.getMonth();

    const totalMonths = yearDiff * 12 + monthDiff;

    return totalMonths >= 0 ? totalMonths : 0;
  } catch {
    return 0;
  }
}

/**
 * formatDurationLabel
 *
 * Formats a month count into a human-readable label.
 * Uses years when duration is exactly divisible by 12.
 *
 * @param months - Number of months
 * @returns      - Human-readable string
 *
 * @example
 *   formatDurationLabel(0)   // → ''
 *   formatDurationLabel(1)   // → '1 month'
 *   formatDurationLabel(12)  // → '1 year'
 *   formatDurationLabel(18)  // → '18 months'
 *   formatDurationLabel(24)  // → '2 years'
 *   formatDurationLabel(36)  // → '3 years'
 *   formatDurationLabel(30)  // → '30 months'
 */
export function formatDurationLabel(months: number): string {
  if (!months || months <= 0) return '';

  if (months === 1)               return '1 month';
  if (months < 12)                return `${months} months`;
  if (months === 12)              return '1 year';
  if (months % 12 === 0)          return `${months / 12} years`;

  // Non-round year values → show in months for precision
  return `${months} months`;
}

/**
 * calculateAndFormatDuration
 *
 * Convenience wrapper — combines the two helpers above.
 * Returns empty string if either date is missing/invalid.
 *
 * @example
 *   calculateAndFormatDuration('2026-01-15', '2028-01-15')  // → '2 years'
 *   calculateAndFormatDuration('2026-01-15', '2027-07-15')  // → '18 months'
 *   calculateAndFormatDuration(null, '2028-01-15')          // → ''
 */
export function calculateAndFormatDuration(
  startDate: string | null | undefined,
  endDate:   string | null | undefined,
): string {
  const months = calculateDurationMonths(startDate, endDate);
  return formatDurationLabel(months);
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML HELPERS (Wave 5B — About Section)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * stripHtmlTags
 *
 * Extracts plain text from HTML string.
 * Used for character counting, SEO meta descriptions, etc.
 *
 * @example
 *   stripHtmlTags('<p>Hello <strong>world</strong></p>')  // → 'Hello world'
 */
export function stripHtmlTags(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * truncateText
 *
 * Truncates text at word boundary.
 * Used for SEO descriptions, previews, etc.
 *
 * @example
 *   truncateText('This is a long sentence', 10)  // → 'This is a...'
 */
export function truncateText(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  const cutoff    = lastSpace > maxChars * 0.5 ? lastSpace : maxChars;
  return `${text.slice(0, cutoff)}...`;
}