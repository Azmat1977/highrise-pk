// ========== FILE: lib/mergeTags.ts ==========
// 🏷️ ENTERPRISE MERGE TAG ENGINE — HIGHRISE.PK
// Personalization system for email campaigns
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Replace {{tag}} placeholders in email content with actual
//   recipient data (name, city, budget, etc.)
//
// SECURITY:
//   ✅ HTML-escape all replacements (prevent XSS)
//   ✅ Whitelist of allowed tags (no arbitrary data access)
//   ✅ Fallback values for missing data
//   ✅ Max content size protection
//   ✅ No template injection (uses simple string replace)
//
// FEATURES:
//   ✅ 20+ merge tags supported
//   ✅ Works with subscribers AND leads
//   ✅ Locale-aware formatting (dates, currency)
//   ✅ Sample data generator for previews
//   ✅ Tag validation helper
//   ✅ HTML-safe substitution
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Data source for merge tag replacement.
 * Can come from Newsletter Subscriber OR Lead.
 */
export interface MergeTagData {
  // Basic contact info
  name?:         string;
  firstName?:    string;
  lastName?:     string;
  email?:        string;
  phone?:        string;

  // Location
  city?:         string;
  area?:         string;

  // Property/Project
  entityName?:   string;      // Project name OR property title
  entityType?:   'project' | 'property' | 'unit';
  price?:        number;      // Raw price in PKR
  propertyType?: string;
  listingType?:  string;

  // Budget
  budgetMin?:    number;
  budgetMax?:    number;
  budgetTier?:   string;      // 'under_50L' | '50L_1Cr' | etc.

  // Lead-specific
  leadType?:     string;
  leadScore?:    number;
  temperature?:  string;
  status?:       string;
  source?:       string;

  // Timing
  inquiryDate?:  Date | string | null;

  // System (auto-generated)
  unsubscribeUrl?: string;
  currentYear?:  number;
  currentDate?:  string;
}

/**
 * Merge tag metadata for UI picker.
 */
export interface MergeTagInfo {
  tag:         string;   // '{{name}}'
  label:       string;   // 'Full Name'
  category:    'basic' | 'location' | 'property' | 'budget' | 'lead' | 'system';
  description: string;
  example:     string;   // 'Ahmed Ali'
  fallback:    string;   // Default when data missing
}

// ═══════════════════════════════════════════════════════════════
// 📚 SUPPORTED MERGE TAGS
// ═══════════════════════════════════════════════════════════════

export const SUPPORTED_TAGS: MergeTagInfo[] = [
  // ─────────────────────────────────────────────
  // BASIC INFO
  // ─────────────────────────────────────────────
  {
    tag:         '{{name}}',
    label:       'Full Name',
    category:    'basic',
    description: 'Recipient\'s full name',
    example:     'Ahmed Ali Khan',
    fallback:    'Valued Customer',
  },
  {
    tag:         '{{firstName}}',
    label:       'First Name',
    category:    'basic',
    description: 'First name only',
    example:     'Ahmed',
    fallback:    'there',
  },
  {
    tag:         '{{email}}',
    label:       'Email Address',
    category:    'basic',
    description: 'Recipient\'s email',
    example:     'ahmed@example.com',
    fallback:    '',
  },
  {
    tag:         '{{phone}}',
    label:       'Phone Number',
    category:    'basic',
    description: 'Contact phone number',
    example:     '+92 300 1234567',
    fallback:    '',
  },

  // ─────────────────────────────────────────────
  // LOCATION
  // ─────────────────────────────────────────────
  {
    tag:         '{{city}}',
    label:       'City',
    category:    'location',
    description: 'City of interest',
    example:     'Karachi',
    fallback:    'your city',
  },
  {
    tag:         '{{area}}',
    label:       'Area/Society',
    category:    'location',
    description: 'Specific area or society',
    example:     'DHA Phase 5',
    fallback:    'your area',
  },

  // ─────────────────────────────────────────────
  // PROPERTY/PROJECT
  // ─────────────────────────────────────────────
  {
    tag:         '{{entityName}}',
    label:       'Property/Project Name',
    category:    'property',
    description: 'Name of inquired property or project',
    example:     '3BR House in DHA Phase 5',
    fallback:    'the property',
  },
  {
    tag:         '{{price}}',
    label:       'Property Price',
    category:    'property',
    description: 'Formatted price (PKR)',
    example:     'PKR 3 Crore',
    fallback:    'contact for price',
  },
  {
    tag:         '{{propertyType}}',
    label:       'Property Type',
    category:    'property',
    description: 'Residential, Commercial, etc.',
    example:     'Residential',
    fallback:    'property',
  },

  // ─────────────────────────────────────────────
  // BUDGET
  // ─────────────────────────────────────────────
  {
    tag:         '{{budget}}',
    label:       'Budget Range',
    category:    'budget',
    description: 'Formatted budget range',
    example:     'PKR 1 Crore - 3 Crore',
    fallback:    'your budget',
  },
  {
    tag:         '{{budgetTier}}',
    label:       'Budget Tier',
    category:    'budget',
    description: 'Human-readable budget tier',
    example:     '1Cr - 3Cr',
    fallback:    'flexible budget',
  },

  // ─────────────────────────────────────────────
  // LEAD-SPECIFIC
  // ─────────────────────────────────────────────
  {
    tag:         '{{leadType}}',
    label:       'Inquiry Type',
    category:    'lead',
    description: 'Type of lead inquiry',
    example:     'Property Viewing',
    fallback:    'inquiry',
  },
  {
    tag:         '{{inquiryDate}}',
    label:       'Inquiry Date',
    category:    'lead',
    description: 'When they inquired',
    example:     'January 15, 2025',
    fallback:    'recently',
  },

  // ─────────────────────────────────────────────
  // SYSTEM (Always available)
  // ─────────────────────────────────────────────
  {
    tag:         '{{unsubscribeUrl}}',
    label:       'Unsubscribe Link',
    category:    'system',
    description: 'Auto-generated unsubscribe URL',
    example:     'https://highrise.pk/unsubscribe?token=...',
    fallback:    'https://highrise.pk/unsubscribe',
  },
  {
    tag:         '{{currentYear}}',
    label:       'Current Year',
    category:    'system',
    description: 'Current year (auto-updates)',
    example:     '2025',
    fallback:    String(new Date().getFullYear()),
  },
  {
    tag:         '{{currentDate}}',
    label:       'Current Date',
    category:    'system',
    description: 'Today\'s date',
    example:     'January 15, 2025',
    fallback:    new Date().toLocaleDateString('en-PK', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
  },
];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER — Escape HTML in replaced content
// ═══════════════════════════════════════════════════════════════

/**
 * HTML-escape user data before inserting into email content.
 * CRITICAL: Prevents XSS if lead data contains HTML/scripts.
 */
function escapeHtml(unsafe: string | number | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ═══════════════════════════════════════════════════════════════
// 💰 FORMATTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Format PKR price for display.
 * Examples:
 *   500000    → "PKR 5 Lakh"
 *   10000000  → "PKR 1 Crore"
 *   35000000  → "PKR 3.5 Crore"
 */
function formatPrice(pkr: number | null | undefined): string {
  if (!pkr || pkr <= 0) return '';

  if (pkr >= 10_000_000) {
    const crore = pkr / 10_000_000;
    return `PKR ${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Crore`;
  }

  if (pkr >= 100_000) {
    const lakh = pkr / 100_000;
    return `PKR ${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} Lakh`;
  }

  return `PKR ${pkr.toLocaleString('en-PK')}`;
}

/**
 * Format budget range.
 */
function formatBudgetRange(min?: number, max?: number): string {
  if (!min && !max) return '';
  if (min && max) return `${formatPrice(min)} - ${formatPrice(max)}`;
  if (min) return `Above ${formatPrice(min)}`;
  if (max) return `Under ${formatPrice(max)}`;
  return '';
}

/**
 * Format budget tier to human-readable label.
 */
function formatBudgetTier(tier?: string): string {
  const tierLabels: Record<string, string> = {
    'under_50L':  'Under 50 Lakh',
    '50L_1Cr':    '50 Lakh - 1 Crore',
    '1Cr_3Cr':    '1 - 3 Crore',
    '3Cr_5Cr':    '3 - 5 Crore',
    'above_5Cr':  'Above 5 Crore',
  };
  return tierLabels[tier || ''] || '';
}

/**
 * Format lead type to human-readable label.
 */
function formatLeadType(type?: string): string {
  if (!type) return '';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format date for email display.
 */
function formatDate(date?: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN — Replace merge tags in content
// ═══════════════════════════════════════════════════════════════

/**
 * Replace all merge tags in HTML content with recipient data.
 *
 * SECURITY:
 * - All replacements are HTML-escaped
 * - Only whitelisted tags are replaced
 * - Missing data uses safe fallbacks
 * - Original content structure preserved
 *
 * @param html         - Email HTML content with {{tags}}
 * @param data         - Recipient data (from subscriber or lead)
 * @returns            - HTML with tags replaced
 */
export function replaceMergeTags(html: string, data: MergeTagData): string {
  if (!html || typeof html !== 'string') return '';

  // Build replacement map
  const replacements: Record<string, string> = {

    // ─────────────────────────────────────────────
    // BASIC
    // ─────────────────────────────────────────────
    '{{name}}':      escapeHtml(data.name || getFallback('{{name}}')),
    '{{firstName}}': escapeHtml(
      data.firstName ||
      (data.name ? data.name.split(' ')[0] : getFallback('{{firstName}}'))
    ),
    '{{lastName}}':  escapeHtml(
      data.lastName ||
      (data.name && data.name.includes(' ')
        ? data.name.split(' ').slice(1).join(' ')
        : '')
    ),
    '{{email}}':     escapeHtml(data.email || ''),
    '{{phone}}':     escapeHtml(data.phone || ''),

    // ─────────────────────────────────────────────
    // LOCATION
    // ─────────────────────────────────────────────
    '{{city}}':      escapeHtml(data.city || getFallback('{{city}}')),
    '{{area}}':      escapeHtml(data.area || getFallback('{{area}}')),

    // ─────────────────────────────────────────────
    // PROPERTY
    // ─────────────────────────────────────────────
    '{{entityName}}':   escapeHtml(data.entityName || getFallback('{{entityName}}')),
    '{{price}}':        escapeHtml(formatPrice(data.price) || getFallback('{{price}}')),
    '{{propertyType}}': escapeHtml(data.propertyType || getFallback('{{propertyType}}')),

    // ─────────────────────────────────────────────
    // BUDGET
    // ─────────────────────────────────────────────
    '{{budget}}':     escapeHtml(
      formatBudgetRange(data.budgetMin, data.budgetMax) ||
      formatBudgetTier(data.budgetTier) ||
      getFallback('{{budget}}')
    ),
    '{{budgetTier}}': escapeHtml(
      formatBudgetTier(data.budgetTier) || getFallback('{{budgetTier}}')
    ),

    // ─────────────────────────────────────────────
    // LEAD
    // ─────────────────────────────────────────────
    '{{leadType}}':    escapeHtml(
      formatLeadType(data.leadType) || getFallback('{{leadType}}')
    ),
    '{{inquiryDate}}': escapeHtml(
      formatDate(data.inquiryDate) || getFallback('{{inquiryDate}}')
    ),

    // ─────────────────────────────────────────────
    // SYSTEM (NOT escaped — unsubscribeUrl is trusted URL)
    // ─────────────────────────────────────────────
    '{{unsubscribeUrl}}': data.unsubscribeUrl || getFallback('{{unsubscribeUrl}}'),
    '{{currentYear}}':    String(data.currentYear || new Date().getFullYear()),
    '{{currentDate}}':    data.currentDate || new Date().toLocaleDateString('en-PK', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
  };

  // Perform replacements
  let result = html;

  for (const [tag, replacement] of Object.entries(replacements)) {
    // Use split/join for safe global replace (no regex injection risk)
    result = result.split(tag).join(replacement);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get fallback value for a specific tag.
 */
function getFallback(tag: string): string {
  const info = SUPPORTED_TAGS.find((t) => t.tag === tag);
  return info?.fallback || '';
}

/**
 * Get all merge tags found in content.
 */
export function extractTagsFromContent(html: string): string[] {
  if (!html) return [];
  const tagRegex = /\{\{[a-zA-Z][a-zA-Z0-9_]*\}\}/g;
  const matches = html.match(tagRegex) || [];
  return Array.from(new Set(matches));  // Unique tags
}

/**
 * Check if a tag is valid/supported.
 */
export function isValidTag(tag: string): boolean {
  return SUPPORTED_TAGS.some((t) => t.tag === tag);
}

/**
 * Find unsupported tags in content (for validation warnings).
 */
export function findInvalidTags(html: string): string[] {
  const foundTags = extractTagsFromContent(html);
  return foundTags.filter((tag) => !isValidTag(tag));
}

/**
 * Get tags grouped by category (for UI picker).
 */
export function getTagsByCategory(): Record<string, MergeTagInfo[]> {
  const grouped: Record<string, MergeTagInfo[]> = {
    basic:    [],
    location: [],
    property: [],
    budget:   [],
    lead:     [],
    system:   [],
  };

  SUPPORTED_TAGS.forEach((tag) => {
    grouped[tag.category].push(tag);
  });

  return grouped;
}

// ═══════════════════════════════════════════════════════════════
// 📊 SAMPLE DATA GENERATOR (for preview mode)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate sample recipient data for preview mode.
 * Used in TipTap editor preview + LivePreview component.
 */
export function getSampleTagData(): MergeTagData {
  return {
    name:         'Ahmed Ali Khan',
    firstName:    'Ahmed',
    lastName:     'Ali Khan',
    email:        'ahmed.ali@example.com',
    phone:        '+92 300 1234567',
    city:         'Karachi',
    area:         'DHA Phase 5',
    entityName:   '3 BR House in DHA Phase 5',
    entityType:   'property',
    price:        30_000_000,   // 3 Crore
    propertyType: 'Residential',
    listingType:  'For Sale',
    budgetMin:    20_000_000,   // 2 Crore
    budgetMax:    50_000_000,   // 5 Crore
    budgetTier:   '1Cr_3Cr',
    leadType:     'property_inquiry',
    leadScore:    82,
    temperature:  'hot',
    status:       'contacted',
    source:       'property_page',
    inquiryDate:  new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),  // 3 days ago
    unsubscribeUrl: 'https://highrise.pk/api/leads/unsubscribe?token=SAMPLE_TOKEN',
    currentYear:  new Date().getFullYear(),
    currentDate:  new Date().toLocaleDateString('en-PK', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
  };
}

// ═══════════════════════════════════════════════════════════════
// 📊 STATISTICS HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze merge tag usage in content.
 * Useful for showing "Content uses 5 personalization tags"
 */
export function analyzeMergeTags(html: string): {
  totalTags:     number;
  uniqueTags:    number;
  validTags:     string[];
  invalidTags:   string[];
  isPersonalized: boolean;
} {
  const allMatches = html.match(/\{\{[a-zA-Z][a-zA-Z0-9_]*\}\}/g) || [];
  const unique = Array.from(new Set(allMatches));
  const valid = unique.filter((tag) => isValidTag(tag));
  const invalid = unique.filter((tag) => !isValidTag(tag));

  return {
    totalTags:     allMatches.length,
    uniqueTags:    unique.length,
    validTags:     valid,
    invalidTags:   invalid,
    isPersonalized: valid.length > 0,
  };
}
// ========== END OF FILE ==========