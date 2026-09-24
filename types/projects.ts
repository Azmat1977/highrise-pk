/**
 * types/projects.ts
 *
 * Shared TypeScript interfaces for the Projects listing page.
 * Imported by ALL section components and the page file.
 * NO server-only imports here — pure types only.
 * Locked before Section 1. Never drift from this shape.
 */

// ─── UNITS ────────────────────────────────────────────────────────────────────

export type AreaUnit = 'marla' | 'kanal' | 'sqft';
export type Currency = 'PKR' | 'USD' | 'GBP' | 'AED';

// ─── ENUMERATIONS ─────────────────────────────────────────────────────────────

export type PropertyType =
  | 'flats'
  | 'plots'
  | 'shops'
  | 'houses'
  | 'commercial_plots'
  | 'offices'
  | 'penthouse'
  | 'farm_houses'
  | 'buildings'
  | 'warehouses'
  | 'industrial_land'
  | 'agricultural_land';

// ─── PROJECT CATEGORIES ──────────────────────────────────
// What KIND of development the project is (developer-built).
// Distinct from PropertyType which describes individual units.

export type ProjectCategory =
  | 'high_rise'
  | 'housing_society'
  | 'commercial_plaza'
  | 'mixed_use'
  | 'townhouse'
  | 'gated_community'
  | 'farmhouse_community'
  | 'industrial_park';

export type ProjectNature =
  | 'residential'
  | 'commercial'
  | 'mixed';

export type PossessionStatus =
  | 'ready_to_move'
  | 'under_construction'
  | 'new_launch'
  | 'pre_launch';

export type SortOption =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'possession'
  | 'newest';

export type ShortlistState = 'loading' | 'saved' | 'unsaved';

export type NocStatus = 'approved' | 'pending' | 'not_applied';

export type DeveloperBadge =
  | 'new_entrant'
  | 'emerging'
  | 'trusted'
  | 'premium';

// ─── FILTER STATE (URL-synced) ────────────────────────────────────────────────

export interface FilterState {
  city:         string;
  type:         PropertyType | '';      // property type (units within project)
  category:     ProjectCategory | '';   // project category
  nature:       ProjectNature | '';     // project nature
  minBudget:    number | null;
  maxBudget:    number | null;
  minArea:      number | null;
  maxArea:      number | null;
  areaUnit:     AreaUnit;
  possession:   PossessionStatus | '';
  noc:          boolean;
  installments: boolean;                // ← NEW: "On Installments" tab
  builder:      string;
  locality:     string;
  sort:         SortOption;
  page:         number;
  tab:          string;
}

export const DEFAULT_FILTERS: FilterState = {
  city:         '',
  type:         '',
  category:     '',
  nature:       '',
  minBudget:    null,
  maxBudget:    null,
  minArea:      null,
  maxArea:      null,
  areaUnit:     'marla',
  possession:   '',
  noc:          false,
  installments: false,
  builder:      '',
  locality:     '',
  sort:         'relevance',
  page:         1,
  tab:          'all_projects',
};

// ─── HIGHRISE SHIELD ──────────────────────────────────────────────────────────

export interface ShieldScore {
  total:         number;          // 0–100 composite
  nocScore:      number;          // 0–30
  verifiedScore: number;          // 0–25
  builderScore:  number;          // 0–25
  deliveryScore: number;          // 0–20
  breakdown:     string | null;   // human-readable summary
}

/**
 * computeStubShield
 *
 * Computes a stub Highrise Shield score from available DB fields.
 * Used until the real scoring pipeline is built.
 *
 * Rule: total ALWAYS equals the sum of the four capped sub-scores.
 * Sub-scores are independent — total never diverges from breakdown.
 *
 * Caps:
 *   nocScore:      0–30
 *   verifiedScore: 0–25
 *   builderScore:  0–25
 *   deliveryScore: 0–20
 *   total:         0–100 (sum of above)
 *
 * Note: highriseScore from DB is used as a HINT for deliveryScore only.
 * It does NOT override the computed total — breakdown always reconciles.
 */
export function computeStubShield(fields: {
  nocStatus:     NocStatus;
  isVerified:    boolean;
  developerBadge:string | null;
  highriseScore: number;          // DB hint for delivery component only
}): ShieldScore {
  // Each component capped at its stated maximum
  const nocScore      = fields.nocStatus === 'approved' ? 30 : 0;
  const verifiedScore = fields.isVerified ? 25 : 0;
  const builderScore  = ['trusted', 'premium'].includes(
    fields.developerBadge ?? '') ? 25 : 0;

  // Delivery score derived from DB hint, capped 0–20
  // Represents: on-time delivery history, reviews (stub only)
  const rawDelivery   = fields.highriseScore
    - nocScore - verifiedScore - builderScore;
  const deliveryScore = Math.min(20, Math.max(0, rawDelivery));

  // Total is ALWAYS the sum — never a separate field that can diverge
  const total = nocScore + verifiedScore + builderScore + deliveryScore;

  return {
    total,
    nocScore,
    verifiedScore,
    builderScore,
    deliveryScore,
    breakdown: [
      nocScore      > 0 ? `NOC Approved (+${nocScore})`         : null,
      verifiedScore > 0 ? `Verified Listing (+${verifiedScore})`: null,
      builderScore  > 0 ? `Trusted Builder (+${builderScore})`  : null,
      deliveryScore > 0 ? `Delivery Record (+${deliveryScore})` : null,
    ].filter(Boolean).join(' · ') || null,
  };
}

/// --- PROJECT LISTING CARD ---------------------------------------------------
// Single shape consumed by ALL 18 sections. No per-section variants.

export interface ProjectListing {
  _id:              string;
  slug:             string;
  projectName:      string;
  tagline:          string | null;

  // Location
  city:             string;
  area:             string;
  locality:         string | null;

  // Property classification
  propertyType:     PropertyType[];     // can be multi: ["flats","shops"]
  projectCategory:  string;
  projectNature:    string;
  projectStatus:    PossessionStatus;
  saleMode?:        string | null;
  unitsAvailable?:  number | null;
  totalUnits?:      number | null;

  // Pricing (PKR — display as Lakh/Crore/Arab)
  minPrice:         number | null;      // PKR absolute
  maxPrice:         number | null;      // PKR absolute
  priceOnRequest:   boolean;

  // Area (Marla primary)
  minAreaMarla:     number | null;
  maxAreaMarla:     number | null;

  // Configuration (flats/houses/penthouse only)
  minBedrooms:      number | null;
  maxBedrooms:      number | null;

  // Possession
  possessionDate:   string | null;      // ISO date
  possessionQuarter:string | null;      // "Q2 2026"

  // Trust signals
  isVerified:       boolean;
  nocStatus:        NocStatus;
  nocAuthority:     string | null;      // "CDA"|"LDA"|"DHA"|"RDA"
  nocNumber:        string | null;      // registration number
  legalDocumentUrl: string | null;      // "View Certificates" link
  shield:           ShieldScore;

  // Developer
  developerId:      string | null;      // For inquiry routing to correct developer
  developerName:    string;
  developerSlug:    string;
  developerLogoUrl: string | null;
  developerBadge:   DeveloperBadge | null;
  isTrustedBuilder: boolean;
  marketedBy:       string | null;      // agency/marketing partner

  // Media
  primaryImage:     string | null;
  imageCount:       number;

  // Engagement
  isShortlisted:    boolean;    // SSR: always false — corrected client-side
  inquiryCount:     number | null;
  amenities:        string[];   // for Compare table

  // Fair Price
  fairPriceUrl:     string | null;  // /tools/fair-price?project=[slug]

  // Metadata
  isFeatured:       boolean;
  highriseScore:    number;         // 0–100, maps to shield.total
  createdAt:        string;         // ISO date
}

// ─── SUPPORTING PAGE TYPES ────────────────────────────────────────────────────

export interface HotspotArea {
  area:          string;
  city:          string;
  projectCount:  number;
  verifiedCount: number;
  verifiedPct:   number;
}

export interface CityCount {
  city:          string;
  count:         number;
  image:         string | null;
  verifiedCount: number;     // projects with isVerified === true
  verifiedPct:   number;     // 0–100 percentage
  province:      string | null;  // "Punjab" | "Sindh" | "KPK" | etc.
}

// Legacy — used for property-level counts (not on projects page)
export interface CategoryCount {
  type:   PropertyType;
  label:  string;
  count:  number;
}

// Project categories with live counts (used on /projects)
export interface ProjectCategoryCount {
  category: ProjectCategory;
  label:    string;
  count:    number;
}

// Project nature with live counts
export interface ProjectNatureCount {
  nature:  ProjectNature;
  label:   string;
  count:   number;
}

export interface BudgetBand {
  key:    string;           // "under_50L" | "50L_1Cr" | "1Cr_2Cr" | "above_2Cr"
  label:  string;           // "Under 50 Lakh"
  minPKR: number | null;
  maxPKR: number | null;
  count:  number;
}

export interface PlatformStats {
  // Pakistan-wide totals (hero stats bar)
  totalProjects:   number;
  totalDevelopers: number;
  totalVerified:   number;
  totalCities:     number;
  // City-scoped totals (Section 4 Shield Trust Row)
  // When filters.city is empty: same as Pakistan-wide
  // When filters.city is set: only that city's counts
  cityScopedTotal?:    number;
  cityScopedVerified?: number;
  cityScopedNoc?:      number;
}

// ─── PAGE PROPS ───────────────────────────────────────────────────────────────

export interface ReadyPropertyItem {
  _id:          string;
  slug:         string;
  title:        string;
  price:        number | null;
  city:         string;
  location:     string | null;
  propertyType: string;
  purpose:      'sale' | 'rent';
  bedrooms:     number | null;
  areaSize:     number | null;
  areaUnit:     string | null;
  primaryImage: string | null;
}

export interface ProjectsPageProps {
  initialFilters:   FilterState;
  initialProjects:  ProjectListing[];
  totalCount:       number;
  cityCounts:       CityCount[];
  categoryCounts:   ProjectCategoryCount[];
  natureCounts:     ProjectNatureCount[];
  budgetBands:      BudgetBand[];
  hotspots:         HotspotArea[];
  platformStats:    PlatformStats;
  tabCounts:        TabCount[];
  featuredProjects: ProjectListing[];
  readyProperties:  ReadyPropertyItem[];
}

// ─── UTILITY: PKR FORMATTING ──────────────────────────────────────────────────

export function formatPKR(amount: number): string {
  if (amount >= 1_000_000_000) {
    const v = amount / 1_000_000_000;
    return `${v % 1 === 0 ? v : v.toFixed(1)} Arab`;
  }
  if (amount >= 10_000_000) {
    const v = amount / 10_000_000;
    return `${v % 1 === 0 ? v : v.toFixed(1)} Cr`;
  }
  if (amount >= 100_000) {
    const v = amount / 100_000;
    return `${v % 1 === 0 ? v : v.toFixed(1)} Lakh`;
  }
  return amount.toLocaleString('en-PK');
}

// Price range display
export function formatPriceRange(
  min: number | null,
  max: number | null,
  onRequest: boolean
): string {
  if (onRequest || (!min && !max)) return 'Contact for Price';
  if (min && max) return `PKR ${formatPKR(min)} – ${formatPKR(max)}`;
  if (min) return `PKR ${formatPKR(min)}+`;
  if (max) return `Up to PKR ${formatPKR(max)}`;
  return 'Contact for Price';
}

// ─── UTILITY: AREA FORMATTING ─────────────────────────────────────────────────

export function formatAreaMarla(marla: number): string {
  if (marla >= 20) {
    const kanal = marla / 20;
    return `${kanal % 1 === 0 ? kanal : kanal.toFixed(1)} Kanal`;
  }
  return `${marla} Marla`;
}

export function formatAreaRange(
  min: number | null,
  max: number | null
): string {
  if (!min && !max) return '';
  if (min && max) {
    return `${formatAreaMarla(min)} – ${formatAreaMarla(max)}`;
  }
  if (min) return `${formatAreaMarla(min)}+`;
  return `Up to ${formatAreaMarla(max!)}`;
}

// ─── UTILITY: URL ↔ FILTER STATE ─────────────────────────────────────────────

export function parseFiltersFromQuery(
  query: Record<string, string | string[] | undefined>
): FilterState {
  const str  = (k: string) =>
    typeof query[k] === 'string' ? (query[k] as string) : '';
  const num  = (k: string) => {
    const v = parseInt(str(k), 10);
    return isNaN(v) ? null : v;
  };
  const bool = (k: string) => str(k) === 'true';

  return {
    city:         str('city'),
    type:         (str('type') as PropertyType) || '',
    category:     (str('category') as ProjectCategory) || '',
    nature:       (str('nature') as ProjectNature) || '',
    minBudget:    num('minBudget'),
    maxBudget:    num('maxBudget'),
    minArea:      num('minArea'),
    maxArea:      num('maxArea'),
    areaUnit:     (str('areaUnit') as AreaUnit) || 'marla',
    possession:   (str('possession') as PossessionStatus) || '',
    noc:          bool('noc'),
    installments: bool('installments'),
    builder:      str('builder'),
    locality:     str('locality'),
    sort:         (str('sort') as SortOption) || 'relevance',
    page:         Math.max(1, num('page') ?? 1),
    tab:          str('tab') || 'all_projects',
  };
}

export function buildQueryString(filters: FilterState): string {
  const p = new URLSearchParams();
  if (filters.city)       p.set('city',       filters.city);
  if (filters.type)       p.set('type',       filters.type);
  if (filters.category)   p.set('category',   filters.category);
  if (filters.nature)     p.set('nature',     filters.nature);
  if (filters.minBudget != null) p.set('minBudget', String(filters.minBudget));
  if (filters.maxBudget != null) p.set('maxBudget', String(filters.maxBudget));
  if (filters.minArea   != null) p.set('minArea',   String(filters.minArea));
  if (filters.maxArea   != null) p.set('maxArea',   String(filters.maxArea));
  if (filters.areaUnit !== 'marla') p.set('areaUnit', filters.areaUnit);
  if (filters.possession)  p.set('possession', filters.possession);
  if (filters.noc)          p.set('noc',          'true');
  if (filters.installments) p.set('installments', 'true');
  if (filters.builder)      p.set('builder',      filters.builder);
  if (filters.locality)    p.set('locality',   filters.locality);
  if (filters.sort !== 'relevance') p.set('sort', filters.sort);
  if (filters.page > 1)   p.set('page',       String(filters.page));
  if (filters.tab !== 'all_projects') p.set('tab', filters.tab);
  return p.toString();
}

// ─── UTILITY: REGEX ESCAPE ────────────────────────────────────────────────────

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── PROPERTY TYPE CONFIG ─────────────────────────────────────────────────────

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  flats:             'Flats / Apartments',
  plots:             'Plots',
  shops:             'Shops',
  houses:            'Houses',
  commercial_plots:  'Commercial Plots',
  offices:           'Offices',
  penthouse:         'Penthouses',
  farm_houses:       'Farm Houses',
  buildings:         'Buildings',
  warehouses:        'Warehouses',
  industrial_land:   'Industrial Land',
  agricultural_land: 'Agricultural Land',
};

// ─── PROJECT CATEGORY LABELS ─────────────────────────────
// Display names for project types (what developers build)

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  high_rise:           'High-Rise Apartments & Flats',
  commercial_plaza:    'Commercial Plazas, Shops & Offices',
  mixed_use:           'Mixed-Use Towers & Malls',
  townhouse:           'Townhouses & Luxury Villas',
  gated_community:     'Gated Communities',
  farmhouse_community: 'Farmhouse Projects',
  industrial_park:     'Industrial & Logistics Parks',
  housing_society:     'Housing Societies & Plots',
};

export const PROJECT_NATURE_LABELS: Record<ProjectNature, string> = {
  residential: 'Residential',
  commercial:  'Commercial',
  mixed:       'Mixed-Use',
};

// Mapping from raw DB values → normalized ProjectCategory
// (DB may store variations like "High-Rise" vs "high_rise")
export function normalizeProjectCategory(raw: string): ProjectCategory | null {
  const cleaned = raw.toLowerCase().replace(/[\s-]+/g, '_');
  const validCategories: ProjectCategory[] = [
    'high_rise', 'housing_society', 'commercial_plaza',
    'mixed_use', 'townhouse', 'gated_community',
    'farmhouse_community', 'industrial_park',
  ];

  // Handle common variations
  const aliasMap: Record<string, ProjectCategory> = {
    'high_rise':           'high_rise',
    'highrise':            'high_rise',
    'housing_society':     'housing_society',
    'society':             'housing_society',
    'commercial_plaza':    'commercial_plaza',
    'plaza':               'commercial_plaza',
    'commercial':          'commercial_plaza',
    'mixed_use':           'mixed_use',
    'mixed':               'mixed_use',
    'townhouse':           'townhouse',
    'gated_community':     'gated_community',
    'gated':               'gated_community',
    'farmhouse':           'farmhouse_community',
    'farmhouse_community': 'farmhouse_community',
    'farm_house':          'farmhouse_community',
    'industrial':          'industrial_park',
    'industrial_park':     'industrial_park',
  };

  return aliasMap[cleaned]
    ?? (validCategories.includes(cleaned as ProjectCategory)
        ? (cleaned as ProjectCategory)
        : null);
}

export function normalizeProjectNature(raw: string): ProjectNature | null {
  const cleaned = raw.toLowerCase().trim();
  if (cleaned.includes('mixed')) return 'mixed';
  if (cleaned.includes('commercial')) return 'commercial';
  if (cleaned.includes('residential')) return 'residential';
  return null;
}

// PKR budget steps (mirrors Zameen — used in Advanced filters for precision)
export const PKR_BUDGET_STEPS = [
  500_000,      // 5 Lakh
  1_000_000,    // 10 Lakh
  2_000_000,    // 20 Lakh
  3_500_000,    // 35 Lakh
  5_000_000,    // 50 Lakh
  6_500_000,    // 65 Lakh
  8_000_000,    // 80 Lakh
  10_000_000,   // 1 Crore
  12_500_000,   // 1.25 Cr
  15_000_000,   // 1.5 Cr
  20_000_000,   // 2 Cr
  30_000_000,   // 3 Cr
  50_000_000,   // 5 Cr
  100_000_000,  // 10 Cr
  500_000_000,  // 50 Cr
  1_000_000_000,// 1 Arab
  5_000_000_000,// 5 Arab
] as const;

// Marla area steps
export const MARLA_STEPS = [
  2, 3, 5, 8, 10, 15, 20, 30, 40, 50,
] as const;

// ─── SECTION 10 — MAIN GRID PAGINATION ────────────────────
// Hybrid Load More → Pagination pattern (Zameen/MagicBricks standard)

/** Max "Load More" clicks before switching to numbered pagination */
export const MAX_LOAD_MORE_CLICKS = 3;

/** Projects per page (must match SSR PAGE_SIZE) */
export const PROJECTS_PER_PAGE = 12;

/** Response shape for /api/projects/list endpoint (Load More) */
export interface ProjectListResponse {
  success:  boolean;
  projects: ProjectListing[];
  hasMore:  boolean;
  page:     number;
  total:    number;
  error?:   string;
}

/** View mode for Section 10 grid */
export type GridViewMode = 'grid' | 'list';

/** Sort dropdown options (mirrors SortOption but with labels) */
export interface SortOptionConfig {
  value: SortOption;
  label: string;
}

export const SORT_OPTIONS: readonly SortOptionConfig[] = [
  { value: 'relevance',  label: 'Relevance (Best Match)' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'possession', label: 'Possession: Soonest First' },
] as const;

// ─── DISCOVERY TABS ──────────────────────────────────────
// Pakistani-market focused tabs above the project grid.
// Each tab is a one-click intent filter — the platform's
// competitive edge over Zameen (which has no tab UX).

export type DiscoveryTabKey =
  | 'all_projects'
  | 'ready_to_move'
  | 'installments'
  | 'new_launch'
  | 'top_rated'
  | 'govt_approved';

export interface DiscoveryTab {
  key:         DiscoveryTabKey;
  label:       string;
  urduLabel:   string;
  description: string;   // for accessibility / tooltip
}

export const DISCOVERY_TABS: readonly DiscoveryTab[] = [
  {
    key:         'all_projects',
    label:       'All Projects',
    urduLabel:   'Sab kuch dekhein',
    description: 'Browse every verified project',
  },
  {
    key:         'ready_to_move',
    label:       'Ready to Move',
    urduLabel:   'Abhi shift ho jayen',
    description: 'Projects with immediate possession',
  },
  {
    key:         'installments',
    label:       'On Installments',
    urduLabel:   'Aasan qisto\'n par',
    description: 'Flexible installment payment plans',
  },
  {
    key:         'new_launch',
    label:       'New Launches',
    urduLabel:   'Naye projects',
    description: 'Just-launched investment opportunities',
  },
  {
    key:         'top_rated',
    label:       'Top Rated',
    urduLabel:   'Sabse trusted',
    description: 'Highest Highrise Shield scores',
  },
  {
    key:         'govt_approved',
    label:       'Govt Approved',
    urduLabel:   'LDA/CDA/DHA verified',
    description: 'Only NOC-approved by government authorities',
  },
] as const;

// Live count per tab (populated by SSR aggregation)
export interface TabCount {
  key:   DiscoveryTabKey;
  count: number;
}

// Translate tab key → filter patch. Applied on tab click.
// 'all_projects' clears all tab-driven filters.
export function tabToFilterPatch(
  tab: DiscoveryTabKey
): Partial<FilterState> {
  switch (tab) {
    case 'ready_to_move':
      return {
        tab:          'ready_to_move',
        possession:   'ready_to_move',
        installments: false,
        noc:          false,
        sort:         'relevance',
      };
    case 'installments':
      return {
        tab:          'installments',
        possession:   '',
        installments: true,
        noc:          false,
        sort:         'relevance',
      };
    case 'new_launch':
      return {
        tab:          'new_launch',
        possession:   'new_launch',
        installments: false,
        noc:          false,
        sort:         'newest',
      };
    case 'top_rated':
      return {
        tab:          'top_rated',
        possession:   '',
        installments: false,
        noc:          false,
        sort:         'relevance',   // maps to highriseScore DESC in SSR sortMap
      };
    case 'govt_approved':
      return {
        tab:          'govt_approved',
        possession:   '',
        installments: false,
        noc:          true,
        sort:         'relevance',
      };
    case 'all_projects':
    default:
      return {
        tab:          'all_projects',
        possession:   '',
        installments: false,
        noc:          false,
        sort:         'relevance',
      };
  }
}

// ─── BUDGET TIERS ────────────────────────────────────────
// Named budget bands for primary filter (clean single dropdown).
// Users can still use Min/Max Budget in Advanced Filters for precision.

export type BudgetTierKey =
  | 'under_25L'
  | '25L_50L'
  | '50L_1Cr'
  | '1Cr_2Cr'
  | '2Cr_5Cr'
  | '5Cr_10Cr'
  | 'above_10Cr';

export interface BudgetTier {
  key:    BudgetTierKey;
  label:  string;
  minPKR: number | null;
  maxPKR: number | null;
}

export const BUDGET_TIERS: readonly BudgetTier[] = [
  { key: 'under_25L',   label: 'Under 25 Lakh',       minPKR: null,          maxPKR: 2_500_000 },
  { key: '25L_50L',     label: '25 Lakh – 50 Lakh',   minPKR: 2_500_000,     maxPKR: 5_000_000 },
  { key: '50L_1Cr',     label: '50 Lakh – 1 Crore',   minPKR: 5_000_000,     maxPKR: 10_000_000 },
  { key: '1Cr_2Cr',     label: '1 Crore – 2 Crore',   minPKR: 10_000_000,    maxPKR: 20_000_000 },
  { key: '2Cr_5Cr',     label: '2 Crore – 5 Crore',   minPKR: 20_000_000,    maxPKR: 50_000_000 },
  { key: '5Cr_10Cr',    label: '5 Crore – 10 Crore',  minPKR: 50_000_000,    maxPKR: 100_000_000 },
  { key: 'above_10Cr',  label: 'Above 10 Crore',      minPKR: 100_000_000,   maxPKR: null },
] as const;

/**
 * Given current minBudget/maxBudget filter values, return matching
 * tier key — or empty string if custom range doesn't match a preset.
 * Used to keep the primary Budget dropdown in sync with URL state.
 */
export function getMatchingBudgetTier(
  minBudget: number | null,
  maxBudget: number | null,
): BudgetTierKey | '' {
  for (const tier of BUDGET_TIERS) {
    if (tier.minPKR === minBudget && tier.maxPKR === maxBudget) {
      return tier.key;
    }
  }
  return '';
}

/**
 * Given a tier key, return the { minBudget, maxBudget } patch
 * to apply to FilterState. Empty key resets both to null.
 */
export function budgetTierToRange(tierKey: BudgetTierKey | ''):
  { minBudget: number | null; maxBudget: number | null } {
  if (!tierKey) return { minBudget: null, maxBudget: null };
  const tier = BUDGET_TIERS.find(t => t.key === tierKey);
  if (!tier) return { minBudget: null, maxBudget: null };
  return { minBudget: tier.minPKR, maxBudget: tier.maxPKR };
}

// ─── SHARE SYSTEM ────────────────────────────────────────────────────────────

export type ShareChannel =
  | 'whatsapp'
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'email'
  | 'copy_link'
  | 'qr_code'
  | 'print'
  | 'native'; // Web Share API (mobile)

export interface ShareEvent {
  projectId:   string;
  projectSlug: string;
  channel:     ShareChannel;
  timestamp:   string;        // ISO
  utmSource:   string;        // always 'highrise_share'
  utmMedium:   ShareChannel;  // which channel
  utmCampaign: string;        // project slug
}

export interface ShareMenuProps {
  project:    ProjectListing;
  isOpen:     boolean;
  onClose:    () => void;
  /** Anchor element for positioning (optional — defaults to centered modal) */
  anchorRef?: React.RefObject<HTMLElement>;
}

// ─── FAVORITES / SHORTLIST SYSTEM ─────────────────────────────────────────────
// Aligned with existing models/Favorite.ts (separate collection)
// Supports dual entity types: 'property' | 'project' | 'unit'
// Backend endpoints (all existing):
//   GET  /api/favorites                → list favorites
//   GET  /api/favorites?mode=has&...   → check if favorited
//   POST /api/favorites/toggle         → add or remove (idempotent)

/** Entity types supported by favorites system (matches Favorite model) */
export type FavoriteEntityType = 'property' | 'project' | 'unit';

/** localStorage key for guest favorites (before login) */
export const FAVORITES_STORAGE_KEY = 'highrise_favorites';

/** Max favorites per user (enforced server-side in /toggle) */
export const MAX_FAVORITES_PER_USER = 500;

/** Guest favorite record — stored in localStorage before login */
export interface GuestFavorite {
  entityType: FavoriteEntityType;
  entityId:   string;
  addedAt:    string; // ISO timestamp
}

/** Response shape from POST /api/favorites/toggle */
export interface FavoriteToggleResponse {
  success:  boolean;
  message?: string;
  data?: {
    isFavorited:      boolean;
    action:           'added' | 'removed';
    entityType:       FavoriteEntityType;
    entityId:         string;
    totalFavorites?:  number;
  };
  error?:      string;
  requestId?:  string;
  retryAfter?: number;
}

/** Response shape from GET /api/favorites?mode=has */
export interface FavoriteHasResponse {
  success:    boolean;
  requestId?: string;
  isFavorite: boolean;
  entityType: FavoriteEntityType;
  entityId:   string;
}

/** Response shape from GET /api/favorites (list mode) */
export interface FavoritesListResponse {
  success:    boolean;
  requestId?: string;
  data?: {
    favorites: Array<{
      _id:            string;
      entityType:     FavoriteEntityType;
      entityId:       string | { _id: string; [key: string]: unknown };
      createdAt:      string;
      updatedAt:      string;
    }>;
    grouped: {
      properties: Array<Record<string, unknown>>;
      projects:   Array<Record<string, unknown>>;
    };
    pagination: {
      mode:       'cursor' | 'offset';
      cursor:     string | null;
      nextCursor: string | null;
      page:       number;
      limit:      number;
      total:      number;
      pages:      number;
      hasNext:    boolean;
      hasPrev:    boolean;
    };
  };
}

// ─── COMPARE SYSTEM ───────────────────────────────────────────────────────────
// Aligned with existing models/Comparison.ts (upgraded for dual entity support).
// Backend endpoints:
//   GET    /api/compare              → list current comparison (populated)
//   POST   /api/compare/add          → add entity to comparison
//   DELETE /api/compare/remove       → remove entity from comparison
//   DELETE /api/compare/clear        → clear all
//   GET    /api/compare/[shareId]    → view shared comparison

/** Entity types supported by compare (matches Comparison schema) */
export type CompareEntityType = 'property' | 'project';

/** localStorage keys for compare persistence */
export const COMPARE_STORAGE_KEY  = 'highrise_compare_v2';
export const COMPARE_SESSION_KEY  = 'highrise_compare_session';

/** Max items in one comparison (industry standard, Amazon uses same) */
export const MAX_COMPARE_ITEMS = 4;

/** Guest-side compare item stored in localStorage */
export interface CompareItem {
  entityType: CompareEntityType;
  entityId:   string;
  addedAt:    string; // ISO
}

/** Response shape from POST /api/compare/add */
export interface CompareAddResponse {
  success:  boolean;
  message?: string;
  reason?:  'duplicate' | 'limit_reached' | 'not_found' | 'error';
  data?: {
    _id?:       string;
    count:      number;
    limit:      number;
    shareId?:   string;
    sessionId?: string | null;
  };
  error?: string;
}

/** Response shape from DELETE /api/compare/remove */
export interface CompareRemoveResponse {
  success:  boolean;
  message?: string;
  data?: {
    count: number;
    limit: number;
  };
  error?: string;
}

/** Response shape from GET /api/compare (list) */
export interface CompareListResponse {
  success: boolean;
  message?: string;
  data?: {
    _id?:        string;
    properties:  Array<Record<string, unknown>>;  // legacy field
    projects?:   Array<Record<string, unknown>>;  // new field
    entities?:   Array<{
      entityType: CompareEntityType;
      data:       Record<string, unknown>;
    }>;
    shareId?:    string | null;
    isShared?:   boolean;
    count:       number;
    limit:       number;
    expiresAt?:  string;
  };
}