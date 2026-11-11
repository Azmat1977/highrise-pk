// File: lib/design-system/typography.ts
// Highrise.pk Design System -- Typography Presets
// Consistent font sizes, weights, and line heights across all pages.
// Usage: className={typography.sectionTitle}

export const typography = {
  // ========================================================================
  // PAGE-LEVEL HEADINGS
  // ========================================================================

  // Main page title (h1) -- used once per page
  pageTitle: 'text-2xl md:text-3xl font-black text-[#004063] tracking-tight leading-tight',

  // Page subtitle -- below pageTitle
  pageSubtitle: 'text-sm md:text-base text-[#666666] font-medium',

  // Homepage hero title (h1, marketing only)
  heroTitle: 'text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight',

  // Homepage hero subtitle
  heroSubtitle: 'text-base sm:text-lg leading-relaxed',

  // ========================================================================
  // SECTION HEADINGS (h2)
  // ========================================================================

  // Section title inside card header bar
  sectionTitle: 'text-lg font-semibold text-[#004063] flex items-center gap-2',

  // Section title (standalone, no icon)
  sectionTitlePlain: 'text-lg font-semibold text-[#004063]',

  // ========================================================================
  // CARD HEADINGS (h3)
  // ========================================================================

  // Card title standard
  cardTitle: 'text-lg font-semibold text-[#004063] flex items-center gap-2',

  // Card subtitle
  cardSubtitle: 'text-sm font-semibold text-[#333333]',

  // ========================================================================
  // PRICE TYPOGRAPHY
  // ========================================================================

  // Hero price (detail pages)
  priceHero: 'text-3xl md:text-[32px] font-black text-[#004063] tracking-tight',

  // Card price (listing cards, compare) — darkened for WCAG AA
  priceCard: 'text-xl font-bold text-[#017a8a]',

  // Price per unit
  priceUnit: 'text-sm text-gray-500 font-medium',

  // Price label (e.g. "Monthly Rent")
  priceLabel: 'text-xs text-[#666666]',

  // ========================================================================
  // BODY TEXT
  // ========================================================================

  // Default body text
  body: 'text-sm text-gray-700 leading-relaxed',

  // Body with emphasis
  bodyBold: 'text-sm font-semibold text-gray-900',

  // Body small
  bodySm: 'text-xs text-gray-600 leading-relaxed',

  // Prose (rich text descriptions)
  prose: 'prose prose-sm max-w-none text-gray-700 leading-relaxed',

  // ========================================================================
  // LABELS & CAPTIONS
  // ========================================================================

  // Field label (forms, detail rows)
  label: 'text-sm font-bold text-[#004063]',

  // Uppercase micro-label (highlight cards, spec grids)
  microLabel: 'text-[10px] font-bold text-gray-400 uppercase tracking-wider',

  // Caption (timestamps, metadata)
  caption: 'text-xs text-gray-500',

  // Mono caption (IDs, coordinates)
  monoCaption: 'font-mono text-xs bg-gray-100 px-2 py-1 rounded',

  // ========================================================================
  // BADGES & CHIPS
  // ========================================================================

  // Badge text
  badge: 'text-xs font-bold',

  // Chip text
  chip: 'text-xs font-semibold',

  // Pill text (media chips, action pills)
  pill: 'text-xs font-bold',

  // ========================================================================
  // BUTTONS
  // ========================================================================

  // Button text (default)
  buttonText: 'text-sm font-semibold',

  // Button text (small)
  buttonTextSm: 'text-xs font-bold',

  // ========================================================================
  // BREADCRUMBS
  // ========================================================================

  breadcrumb: 'text-xs text-gray-500',
  breadcrumbActive: 'text-xs font-semibold text-gray-900',

  // ========================================================================
  // NAVIGATION
  // ========================================================================

  navItem: 'text-sm font-medium',
  navItemActive: 'text-sm font-bold text-white',
  jumpLink: 'text-sm font-medium whitespace-nowrap',

  // ========================================================================
  // TABLE / LIST
  // ========================================================================

  tableHeader: 'text-xs font-bold text-gray-500 uppercase tracking-wider',
  tableCell: 'text-sm text-gray-900',
  tableCellMuted: 'text-sm text-gray-500',
  listLabel: 'text-sm text-gray-500',
  listValue: 'text-sm font-semibold text-gray-900',
} as const;