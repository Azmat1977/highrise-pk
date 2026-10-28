// ========== FILE: lib/areaUnits.ts ==========
// 📐 AREA UNIT CONVERSION LIBRARY — HIGHRISE.PK
// Pure functions for converting between Pakistani + International area units
//
// Architecture:
//   - All conversions use sqft as the base unit (universal pivot)
//   - Conversion formula: value × unit.sqftPerUnit = totalSqft
//   - To convert: totalSqft / targetUnit.sqftPerUnit = targetValue
//
// Sources:
//   - Pakistan Bureau of Statistics standard measurements
//   - Survey of Pakistan land measurement guidelines
//   - PEC (Pakistan Engineering Council) construction standards
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type AreaUnitKey =
  // Pakistani primary
  | 'marla'              // Standard 272.25 sqft
  | 'marla_punjab'       // Punjab Standard 250 sqft (Bahria, Gulberg areas)
  | 'marla_old'          // Old Lahore 225 sqft
  | 'kanal'              // 20 marla = 5,445 sqft
  // International standard
  | 'sqft'               // Square Feet
  | 'sqm'                // Square Meter
  | 'sqyd'               // Square Yard (Karachi/Sindh)
  | 'acre'               // 43,560 sqft
  | 'hectare'            // 10,000 sqm
  // Pakistani rural
  | 'bigha'              // Punjab rural — 9,000 sqft
  | 'murabba'            // 25 acres = 1,089,000 sqft
  | 'ghumao'             // KP rural — 4,840 sqft
  | 'tola';              // Very small — 6.05 sqft

export type UnitCategory = 'pakistani' | 'international' | 'rural';

export interface AreaUnit {
  key: AreaUnitKey;
  name: string;                     // Display name
  shortName: string;                // Short abbreviation
  pluralName: string;               // Plural form
  sqftPerUnit: number;              // Base conversion factor
  category: UnitCategory;
  region: string;                   // Where commonly used
  description: string;              // Short context
  isCommon: boolean;                // Show in compact UI by default
}

// ═══════════════════════════════════════════════════════════════
// AREA UNIT DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const AREA_UNITS: Record<AreaUnitKey, AreaUnit> = {

  // ─── PAKISTANI PRIMARY ───────────────────────────────────────
  marla: {
    key: 'marla',
    name: 'Marla (Modern 272 sqft)',
    shortName: 'Marla',
    pluralName: 'Marlas',
    sqftPerUnit: 272.25,
    category: 'pakistani',
    region: 'DHA, modern societies — Standard',
    description: 'Modern standard Marla — used in DHA Lahore, Bahria new phases, all post-1980 societies',
    isCommon: true,
  },

  marla_punjab: {
    key: 'marla_punjab',
    name: 'Marla (Punjab Standard)',
    shortName: 'Marla (250)',
    pluralName: 'Marlas (Punjab)',
    sqftPerUnit: 250,
    category: 'pakistani',
    region: 'Bahria Town, Gulberg, parts of Punjab',
    description: 'Punjab standard Marla used in many older planned societies',
    isCommon: false,
  },

  marla_old: {
    key: 'marla_old',
    name: 'Marla (Old Lahore)',
    shortName: 'Marla (225)',
    pluralName: 'Marlas (Old)',
    sqftPerUnit: 225,
    category: 'pakistani',
    region: 'Old Lahore + Punjab pre-1980s',
    description: 'Pre-standardization Marla used in old DHA + heritage areas',
    isCommon: false,
  },

  kanal: {
    key: 'kanal',
    name: 'Kanal',
    shortName: 'Kanal',
    pluralName: 'Kanals',
    sqftPerUnit: 5445,                // 20 marla × 272.25
    category: 'pakistani',
    region: 'Punjab, KPK, Islamabad',
    description: 'Larger residential plots — 1 Kanal = 20 Marla',
    isCommon: true,
  },

  // ─── INTERNATIONAL STANDARD ──────────────────────────────────
  sqft: {
    key: 'sqft',
    name: 'Square Feet',
    shortName: 'sq ft',
    pluralName: 'Square Feet',
    sqftPerUnit: 1,
    category: 'international',
    region: 'Universal — All Pakistan',
    description: 'Used for built-up area, apartments, commercial spaces',
    isCommon: true,
  },

  sqm: {
    key: 'sqm',
    name: 'Square Meter',
    shortName: 'sq m',
    pluralName: 'Square Meters',
    sqftPerUnit: 10.7639,             // 1 sqm = 10.7639 sqft
    category: 'international',
    region: 'International standard',
    description: 'Used in engineering drawings + overseas buyer reference',
    isCommon: true,
  },

  sqyd: {
    key: 'sqyd',
    name: 'Square Yard',
    shortName: 'sq yd',
    pluralName: 'Square Yards',
    sqftPerUnit: 9,                   // 1 sqyd = 9 sqft (3ft × 3ft)
    category: 'international',
    region: 'Karachi, Sindh, parts of South Punjab',
    description: 'Primary plot measurement in Karachi (e.g. 200 sq yd plot)',
    isCommon: true,
  },

  acre: {
    key: 'acre',
    name: 'Acre',
    shortName: 'Acre',
    pluralName: 'Acres',
    sqftPerUnit: 43560,
    category: 'international',
    region: 'Farmhouses, large plots, rural land',
    description: '1 Acre = 8 Kanal — used for farmhouses and rural land',
    isCommon: true,
  },

  hectare: {
    key: 'hectare',
    name: 'Hectare',
    shortName: 'Ha',
    pluralName: 'Hectares',
    sqftPerUnit: 107639,              // 10,000 sqm × 10.7639
    category: 'international',
    region: 'Government surveys, agricultural records',
    description: 'Used in revenue records and large agricultural surveys',
    isCommon: false,
  },

  // ─── PAKISTANI RURAL ─────────────────────────────────────────
  bigha: {
    key: 'bigha',
    name: 'Bigha',
    shortName: 'Bigha',
    pluralName: 'Bighas',
    sqftPerUnit: 9000,                // Punjab Bigha (varies by region)
    category: 'rural',
    region: 'Rural Punjab (Bigha size varies)',
    description: 'Rural land — Bigha size varies: Punjab ~9000, Sindh ~17424 sqft',
    isCommon: false,
  },

  murabba: {
    key: 'murabba',
    name: 'Murabba',
    shortName: 'Murabba',
    pluralName: 'Murabbas',
    sqftPerUnit: 1089000,             // 25 acres
    category: 'rural',
    region: 'Rural Punjab, agricultural',
    description: '1 Murabba = 25 Acres — agricultural land grants',
    isCommon: false,
  },

  ghumao: {
    key: 'ghumao',
    name: 'Ghumao',
    shortName: 'Ghumao',
    pluralName: 'Ghumao',
    sqftPerUnit: 4840,                // KPK standard
    category: 'rural',
    region: 'KPK, parts of Balochistan',
    description: 'Rural land measurement — equivalent to 1 Acre / 9',
    isCommon: false,
  },

  tola: {
    key: 'tola',
    name: 'Tola',
    shortName: 'Tola',
    pluralName: 'Tolas',
    sqftPerUnit: 6.05,
    category: 'rural',
    region: 'Historical, small land parcels',
    description: 'Very small unit — rarely used in modern transactions',
    isCommon: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// EXPORTED HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Array of all units (for iteration in UI)
 */
export const ALL_UNITS: AreaUnit[] = Object.values(AREA_UNITS);

/**
 * Common units only (default UI display)
 */
export const COMMON_UNITS: AreaUnit[] = ALL_UNITS.filter((u) => u.isCommon);

/**
 * Units by category (for grouped dropdowns)
 */
export const UNITS_BY_CATEGORY: Record<UnitCategory, AreaUnit[]> = {
  pakistani: ALL_UNITS.filter((u) => u.category === 'pakistani'),
  international: ALL_UNITS.filter((u) => u.category === 'international'),
  rural: ALL_UNITS.filter((u) => u.category === 'rural'),
};

/**
 * Category display metadata (for UI labels)
 */
export const CATEGORY_META: Record<UnitCategory, { label: string; description: string }> = {
  pakistani: {
    label: 'Pakistani Standard',
    description: 'Marla & Kanal — most common in residential transactions',
  },
  international: {
    label: 'International Units',
    description: 'Sqft, Sqm, Sqyd, Acre — universal measurements',
  },
  rural: {
    label: 'Rural / Agricultural',
    description: 'Bigha, Murabba, Ghumao — used in rural land records',
  },
};

// ═══════════════════════════════════════════════════════════════
// CONVERSION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert value from one unit to another.
 * @returns Converted value (rounded to 4 decimal places)
 */
export function convert(value: number, fromKey: AreaUnitKey, toKey: AreaUnitKey): number {
  if (!isFinite(value) || value < 0) return 0;
  if (fromKey === toKey) return value;

  const fromUnit = AREA_UNITS[fromKey];
  const toUnit = AREA_UNITS[toKey];

  if (!fromUnit || !toUnit) return 0;

  // Pivot through sqft
  const totalSqft = value * fromUnit.sqftPerUnit;
  const result = totalSqft / toUnit.sqftPerUnit;

  // Round to 4 decimal places (handles floating point noise)
  return Math.round(result * 10000) / 10000;
}

/**
 * Convert value to ALL units at once (for the conversion chart).
 */
export function convertToAll(value: number, fromKey: AreaUnitKey): Record<AreaUnitKey, number> {
  const result = {} as Record<AreaUnitKey, number>;
  for (const unit of ALL_UNITS) {
    result[unit.key] = convert(value, fromKey, unit.key);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// FORMATTING HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Smart number formatter:
 * - Whole numbers: no decimals (1,234)
 * - Small decimals: up to 4 places (1.2345)
 * - Large decimals: 2 places (1,234.56)
 * - Very small: scientific (1.23e-4)
 */
export function formatAreaValue(value: number): string {
  if (!isFinite(value)) return '0';
  if (value === 0) return '0';

  const abs = Math.abs(value);

  // Whole number
  if (Number.isInteger(value)) {
    return value.toLocaleString('en-PK');
  }

  // Very small numbers
  if (abs < 0.0001) {
    return value.toExponential(2);
  }

  // Small numbers — show up to 4 decimals
  if (abs < 1) {
    return value.toFixed(4).replace(/\.?0+$/, '');
  }

  // Mid-range — 2 decimals max
  if (abs < 10000) {
    return value.toLocaleString('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  // Large numbers — comma separator, no decimals
  return Math.round(value).toLocaleString('en-PK');
}

/**
 * Format value with unit name (e.g. "10 Marlas", "1 Kanal")
 */
export function formatWithUnit(value: number, unitKey: AreaUnitKey): string {
  const unit = AREA_UNITS[unitKey];
  if (!unit) return formatAreaValue(value);

  const formattedValue = formatAreaValue(value);
  const useplural = value !== 1;
  const unitLabel = useplural ? unit.pluralName : unit.name;

  return `${formattedValue} ${unitLabel}`;
}

// ═══════════════════════════════════════════════════════════════
// COMMON PAKISTANI PLOT SIZES (Quick Links)
// ═══════════════════════════════════════════════════════════════

export interface CommonSize {
  label: string;                    // Display label
  value: number;                    // Numeric value
  unit: AreaUnitKey;                // Unit
  category: 'small' | 'standard' | 'large' | 'commercial';
  description: string;
}

export const COMMON_SIZES: CommonSize[] = [
  // Small residential
  { label: '3 Marla', value: 3, unit: 'marla', category: 'small', description: 'Compact urban home' },
  { label: '5 Marla', value: 5, unit: 'marla', category: 'small', description: 'Most popular family home size' },
  { label: '7 Marla', value: 7, unit: 'marla', category: 'small', description: 'Mid-tier residential plot' },

  // Standard residential
  { label: '10 Marla', value: 10, unit: 'marla', category: 'standard', description: 'Standard family home' },
  { label: '1 Kanal', value: 1, unit: 'kanal', category: 'standard', description: 'Large family home' },
  { label: '2 Kanal', value: 2, unit: 'kanal', category: 'large', description: 'Premium residence' },

  // Large
  { label: '4 Kanal', value: 4, unit: 'kanal', category: 'large', description: 'Estate-size plot' },
  { label: '8 Kanal', value: 8, unit: 'kanal', category: 'large', description: '1 Acre — mini farmhouse' },
  { label: '1 Acre', value: 1, unit: 'acre', category: 'large', description: 'Farmhouse standard' },

  // Karachi-specific
  { label: '120 Sq Yd', value: 120, unit: 'sqyd', category: 'small', description: 'Karachi small home' },
  { label: '200 Sq Yd', value: 200, unit: 'sqyd', category: 'standard', description: 'Karachi standard plot' },
  { label: '500 Sq Yd', value: 500, unit: 'sqyd', category: 'large', description: 'Karachi large plot' },
];

// ═══════════════════════════════════════════════════════════════
// SEO LANDING PAGE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export interface SeoLandingConfig {
  slug: string;                     // URL slug e.g. 'marla-to-sqft'
  fromUnit: AreaUnitKey;
  toUnit: AreaUnitKey;
  title: string;                    // SEO title
  metaDescription: string;          // SEO meta description
  h1: string;                       // Page H1
  intro: string;                    // Intro paragraph (long-tail SEO)
  defaultValue: number;             // Pre-filled example value
  priority: number;                 // Sitemap priority (0.5–1.0)
}

/**
 * Top 12 highest-search-volume conversion combos for Pakistan.
 * Each generates a dedicated SEO landing page.
 */
export const SEO_LANDING_PAGES: SeoLandingConfig[] = [
  {
    slug: 'marla-to-sqft',
    fromUnit: 'marla',
    toUnit: 'sqft',
    title: 'Marla to Square Feet Converter | 1 Marla = ? Sqft | Highrise.pk',
    metaDescription: 'Convert Marla to Square Feet instantly. 1 Marla equals 272.25 sqft (standard). Free Pakistani area unit converter with city-specific variations.',
    h1: 'Marla to Square Feet Converter',
    intro: 'In Pakistan, 1 Marla equals 272.25 square feet (standard measurement). Use this free converter to instantly calculate any Marla value to Sqft. Useful for plot sizes, construction estimates, and property documentation.',
    defaultValue: 5,
    priority: 1.0,
  },
  {
    slug: 'sqft-to-marla',
    fromUnit: 'sqft',
    toUnit: 'marla',
    title: 'Square Feet to Marla Converter | Sqft to Marla | Highrise.pk',
    metaDescription: 'Convert Square Feet to Marla instantly. 272.25 sqft = 1 Marla (standard). Free Pakistani property area converter with accurate calculations.',
    h1: 'Square Feet to Marla Converter',
    intro: 'Converting square feet to Marla is essential for Pakistani property transactions. 272.25 sqft equals 1 Marla. Use this free tool to instantly convert any sqft value to Marla — perfect for plot comparisons and documentation.',
    defaultValue: 1361,
    priority: 1.0,
  },
  {
    slug: 'kanal-to-sqft',
    fromUnit: 'kanal',
    toUnit: 'sqft',
    title: 'Kanal to Square Feet Converter | 1 Kanal = 5445 Sqft | Highrise.pk',
    metaDescription: 'Convert Kanal to Square Feet instantly. 1 Kanal equals 5,445 sqft (20 Marla). Free Pakistani plot size calculator for accurate measurements.',
    h1: 'Kanal to Square Feet Converter',
    intro: '1 Kanal equals 5,445 square feet, which is 20 Marla. Kanal is commonly used for larger plots in Punjab, KPK, and Islamabad. Use this free converter for instant accurate calculations.',
    defaultValue: 1,
    priority: 0.95,
  },
  {
    slug: 'marla-to-kanal',
    fromUnit: 'marla',
    toUnit: 'kanal',
    title: 'Marla to Kanal Converter | 20 Marla = 1 Kanal | Highrise.pk',
    metaDescription: 'Convert Marla to Kanal instantly. 20 Marla equals 1 Kanal. Free Pakistani area unit converter — perfect for plot size comparisons.',
    h1: 'Marla to Kanal Converter',
    intro: 'In Pakistani land measurements, 20 Marla equals 1 Kanal. This converter helps you instantly understand plot sizes — whether you have 10 Marla (half Kanal) or 40 Marla (2 Kanal). Free, accurate, mobile-friendly.',
    defaultValue: 20,
    priority: 0.95,
  },
  {
    slug: 'kanal-to-marla',
    fromUnit: 'kanal',
    toUnit: 'marla',
    title: 'Kanal to Marla Converter | 1 Kanal = 20 Marla | Highrise.pk',
    metaDescription: 'Convert Kanal to Marla instantly. 1 Kanal equals 20 Marla. Free Pakistani area unit converter for residential plot calculations.',
    h1: 'Kanal to Marla Converter',
    intro: '1 Kanal equals 20 Marla in Pakistani land measurements. This is the standard conversion used for residential plots across Punjab, KPK, and Islamabad. Use this tool for instant accurate conversions.',
    defaultValue: 1,
    priority: 0.95,
  },
  {
    slug: 'sqyd-to-marla',
    fromUnit: 'sqyd',
    toUnit: 'marla',
    title: 'Square Yards to Marla Converter | Sq Yd to Marla | Highrise.pk',
    metaDescription: 'Convert Square Yards to Marla instantly. Common for converting Karachi plots (200 sq yd) to Marla. Free Pakistani area converter.',
    h1: 'Square Yards to Marla Converter',
    intro: 'Karachi uses Square Yards (sq yd) while Lahore uses Marla. 1 Marla = 30.25 sq yd. Use this converter to translate between regional Pakistani plot measurements — perfect for buyers comparing across cities.',
    defaultValue: 200,
    priority: 0.9,
  },
  {
    slug: 'marla-to-sqyd',
    fromUnit: 'marla',
    toUnit: 'sqyd',
    title: 'Marla to Square Yards Converter | Marla to Sq Yd | Highrise.pk',
    metaDescription: 'Convert Marla to Square Yards instantly. 1 Marla = 30.25 sq yd. Perfect for comparing Lahore Marla plots with Karachi Sq Yd plots.',
    h1: 'Marla to Square Yards Converter',
    intro: 'Converting Marla to Square Yards helps Pakistani property buyers compare plots between Punjab/KPK (Marla) and Sindh/Karachi (Sq Yd). 1 Marla equals 30.25 Square Yards. Free instant conversion below.',
    defaultValue: 5,
    priority: 0.9,
  },
  {
    slug: 'acre-to-kanal',
    fromUnit: 'acre',
    toUnit: 'kanal',
    title: 'Acre to Kanal Converter | 1 Acre = 8 Kanal | Highrise.pk',
    metaDescription: 'Convert Acres to Kanal instantly. 1 Acre equals 8 Kanal (160 Marla). Free Pakistani farmhouse and large land converter.',
    h1: 'Acre to Kanal Converter',
    intro: '1 Acre equals 8 Kanal or 160 Marla in Pakistani land measurements. Acres are commonly used for farmhouses, agricultural land, and large estates. Use this converter for instant accurate calculations.',
    defaultValue: 1,
    priority: 0.85,
  },
  {
    slug: 'kanal-to-acre',
    fromUnit: 'kanal',
    toUnit: 'acre',
    title: 'Kanal to Acre Converter | 8 Kanal = 1 Acre | Highrise.pk',
    metaDescription: 'Convert Kanal to Acre instantly. 8 Kanal equals 1 Acre. Free Pakistani area unit converter for farmhouses and large plots.',
    h1: 'Kanal to Acre Converter',
    intro: '8 Kanal equals 1 Acre — useful for converting farmhouse plots and rural land. Use this free converter to instantly translate any Kanal value into Acres, whether for farm purchase, agricultural records, or property comparison.',
    defaultValue: 8,
    priority: 0.85,
  },
  {
    slug: 'sqft-to-sqm',
    fromUnit: 'sqft',
    toUnit: 'sqm',
    title: 'Square Feet to Square Meter Converter | Sqft to Sqm | Highrise.pk',
    metaDescription: 'Convert Square Feet to Square Meter instantly. 1 sqm = 10.7639 sqft. Free converter for engineering, construction, and international comparisons.',
    h1: 'Square Feet to Square Meter Converter',
    intro: 'Converting square feet to square meters is essential for engineering drawings, overseas property comparisons, and construction documents. 1 sqm equals 10.7639 sqft. Use this free tool for instant accurate conversions.',
    defaultValue: 1000,
    priority: 0.8,
  },
  {
    slug: 'sqm-to-sqft',
    fromUnit: 'sqm',
    toUnit: 'sqft',
    title: 'Square Meter to Square Feet Converter | Sqm to Sqft | Highrise.pk',
    metaDescription: 'Convert Square Meter to Square Feet instantly. 1 sqm equals 10.7639 sqft. Free area unit converter for engineering and property use.',
    h1: 'Square Meter to Square Feet Converter',
    intro: '1 square meter equals 10.7639 square feet. This converter is essential for engineering drawings, international property listings, and overseas buyer comparisons. Free, instant, mobile-friendly.',
    defaultValue: 100,
    priority: 0.8,
  },
  {
    slug: 'marla-to-sqm',
    fromUnit: 'marla',
    toUnit: 'sqm',
    title: 'Marla to Square Meter Converter | Marla to Sqm | Highrise.pk',
    metaDescription: 'Convert Marla to Square Meter instantly. 1 Marla = 25.29 sqm. Perfect for overseas buyers comparing Pakistani property in international units.',
    h1: 'Marla to Square Meter Converter',
    intro: '1 Marla equals approximately 25.29 square meters. This conversion is essential for overseas Pakistanis comparing local plot sizes against international standards. Free instant conversion below.',
    defaultValue: 5,
    priority: 0.8,
  },
];

/**
 * Get SEO landing config by slug (for [combo].tsx)
 */
export function getSeoLandingBySlug(slug: string): SeoLandingConfig | null {
  return SEO_LANDING_PAGES.find((p) => p.slug === slug) ?? null;
}

/**
 * Get all SEO slugs (for sitemap + getStaticPaths)
 */
export function getAllSeoSlugs(): string[] {
  return SEO_LANDING_PAGES.map((p) => p.slug);
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION HISTORY (localStorage helpers)
// ═══════════════════════════════════════════════════════════════

export interface ConversionHistoryEntry {
  id: string;
  fromValue: number;
  fromUnit: AreaUnitKey;
  toUnit: AreaUnitKey;
  toValue: number;
  timestamp: number;
}

const HISTORY_KEY = 'highrise_area_converter_history';
const MAX_HISTORY = 10;

/**
 * Get conversion history from localStorage.
 * Returns empty array on SSR or if storage unavailable.
 */
export function getConversionHistory(): ConversionHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

/**
 * Add new conversion to history (newest first, capped at 10)
 */
export function addToConversionHistory(entry: Omit<ConversionHistoryEntry, 'id' | 'timestamp'>): ConversionHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getConversionHistory();

    // Skip duplicates (same from/to/value)
    const isDuplicate = existing.length > 0 &&
      existing[0].fromValue === entry.fromValue &&
      existing[0].fromUnit === entry.fromUnit &&
      existing[0].toUnit === entry.toUnit;

    if (isDuplicate) return existing;

    const newEntry: ConversionHistoryEntry = {
      ...entry,
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
    };

    const updated = [newEntry, ...existing].slice(0, MAX_HISTORY);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getConversionHistory();
  }
}

/**
 * Clear all conversion history.
 */
export function clearConversionHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Silent — storage unavailable
  }
}

// ═══════════════════════════════════════════════════════════════
// EDUCATIONAL CONTENT (For SEO + User Education)
// ═══════════════════════════════════════════════════════════════

export interface EducationalSection {
  id: string;
  title: string;
  content: string;
  relatedUnits: AreaUnitKey[];
}

export const EDUCATIONAL_SECTIONS: EducationalSection[] = [
  {
    id: 'what-is-marla',
    title: 'What is a Marla?',
    content: `A Marla is the most widely used unit of area measurement in Pakistan, especially for residential plots. The standard Marla equals 272.25 square feet (approximately 25.29 square meters). The term originated during the British colonial era as a sub-unit of an acre — specifically 1/160th of an acre.

In modern Pakistan, the standard Marla is used across all of Punjab, KPK, Islamabad, and most of Balochistan. Common plot sizes you'll encounter include 3 Marla (compact homes), 5 Marla (most popular family size), 7 Marla, 10 Marla (standard family home), and larger Kanal-based plots. When you see a property listed as "5 Marla House," it means the plot occupies 1,361.25 sqft (5 × 272.25).`,
    relatedUnits: ['marla', 'marla_old', 'kanal'],
  },
  {
    id: 'old-vs-new-marla',
    title: '3 Different Marla Standards in Pakistan',
    content: `Not all Marlas are equal! Pakistan actually has THREE different Marla measurements in active use, which can confuse buyers and impact valuations significantly.

The Modern Marla (272.25 sqft) is the official standard used in DHA Lahore, Bahria Town new phases, and all post-1980 planned societies. This is what most modern property documents reference.

The Punjab Standard Marla (250 sqft) is used in many older planned societies including parts of Bahria Town, Gulberg, and several Punjab housing schemes built between 1950-1980. If you're buying in these areas, your "10 Marla plot" is actually 2,500 sqft — 222 sqft less than a modern DHA 10 Marla.

The Old Lahore Marla (225 sqft) is found in Walled City Lahore, Inner Rawalpindi, and pre-independence heritage properties. A "10 Marla plot" here is only 2,250 sqft — 472 sqft less than modern standard.

Always confirm which Marla standard applies before signing any property document. When in doubt, demand the actual square footage in writing.`,
    relatedUnits: ['marla', 'marla_punjab', 'marla_old'],
  },
  {
    id: 'kanal-vs-acre',
    title: 'When to Use Kanal vs Acre',
    content: `Both Kanal and Acre measure larger plots, but they serve different contexts. A Kanal equals 5,445 sqft (20 Marla), while an Acre equals 43,560 sqft (8 Kanal or 160 Marla). The choice depends on what you're buying and where.

Use Kanal when discussing residential plots — most premium Pakistani properties in DHA, Bahria Town, and luxury societies are sold as 1 Kanal, 2 Kanal, or 4 Kanal. Use Acre when dealing with farmhouses (typically 1-4 acres), agricultural land, large commercial parcels, or rural properties. Real estate documents often mix the two units, so understanding the conversion (1 Acre = 8 Kanal) is essential. For Karachi-based farmhouses, you'll also encounter Square Yard measurements — 1 Acre = 4,840 sq yd.`,
    relatedUnits: ['kanal', 'acre', 'sqyd'],
  },
  {
    id: 'sqyd-karachi',
    title: 'Why Karachi Uses Square Yards',
    content: `If you're property-hunting in Karachi, you'll notice everything is measured in Square Yards (sq yd) rather than Marla. This regional difference dates back to British administration in Sindh, where Imperial units (yards) became standardized for land records. While Punjab adopted the Mughal-era Marla system, Sindh retained Square Yards — and the tradition continues today.

Common Karachi plot sizes include 80 sq yd (compact), 120 sq yd (small home), 200 sq yd (standard family plot), 240 sq yd (popular DHA Karachi size), 400 sq yd, and 500 sq yd (large home). The conversion is straightforward: 1 Marla = 30.25 sq yd. So a "200 sq yd Karachi plot" equals approximately 6.6 Marla — slightly larger than a 5 Marla but smaller than 7 Marla. When comparing properties between Lahore and Karachi, always convert to the same unit (or use sqft as the universal baseline) to avoid confusion.`,
    relatedUnits: ['sqyd', 'marla', 'sqft'],
  },
];

// ========== END OF FILE ==========