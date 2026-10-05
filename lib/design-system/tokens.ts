// File: lib/design-system/tokens.ts
// Highrise.pk Design System -- Color, Spacing, Shadow, and Radius Tokens
// Single source of truth for all visual constants across the platform.
// Import from this file instead of hardcoding values in components.

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Brand
  primary: '#029bba',
  primaryHover: '#017a8a',
  primaryLight: '#029bba10', // 10% opacity teal
  secondary: '#004063',
  secondaryLight: '#00406310',

  // Semantic
  success: '#10b981',
  successLight: '#d1fae5',
  successDark: '#065f46',
  error: '#ef4444',
  errorLight: '#fef2f2',
  errorDark: '#991b1b',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  warningDark: '#92400e',
  info: '#3b82f6',
  infoLight: '#eff6ff',

  // Platform-specific
  whatsapp: '#25D366',
  whatsappHover: '#128C7E',
  abPurple: '#7c3aed',

  // Neutrals
  white: '#ffffff',
  black: '#000000',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Text
  textPrimary: '#111827',
  textSecondary: '#666666',
  textMuted: '#6b7280',
  textCaption: '#9ca3af',
  textInverse: '#ffffff',

  // Backgrounds
  pageBg: '#f8f9fa',
  cardBg: '#ffffff',
  inputBg: '#f9fafb',
  overlayBg: 'rgba(0, 0, 0, 0.5)',
  overlayBlurBg: 'rgba(0, 0, 0, 0.6)',

  // Borders
  borderDefault: '#e5e7eb',
  borderLight: '#f3f4f6',
  borderFocus: '#029bba',
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  // Section gaps
  sectionGap: 'space-y-6',
  sectionGapLg: 'space-y-8',
  sectionGapXl: 'space-y-10',

  // Card internal
  cardPadding: 'p-6',
  cardPaddingSm: 'p-4',
  cardPaddingLg: 'p-8',

  // Grid gaps
  gridGap: 'gap-6',
  gridGapSm: 'gap-4',
  gridGapLg: 'gap-8',

  // Container padding
  containerPx: 'px-4 sm:px-6',
  containerPy: 'py-6 lg:py-8',
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  card: 'shadow-sm',
  cardHover: 'shadow-md',
  modal: 'shadow-xl',
  dropdown: 'shadow-2xl',
  floating: 'shadow-lg',
  sticky: 'shadow-md',
  bottomBar: 'shadow-[0_-4px_20px_rgba(0,0,0,0.08)]',
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const radii = {
  input: 'rounded-xl',
  card: 'rounded-2xl',
  modal: 'rounded-2xl',
  pill: 'rounded-full',
  button: 'rounded-xl',
  chip: 'rounded-lg',
  badge: 'rounded-lg',
  image: 'rounded-xl',
} as const;

// ============================================================================
// CONTAINER WIDTHS
// ============================================================================

export const containers = {
  // Detail pages (Property, Project, Agent, Society, Developer profiles)
  detail: 'max-w-[1120px] mx-auto px-4 sm:px-6 py-6 lg:py-8',

  // Functional pages (Directories, Dashboards, Forms, Search)
  functional: 'max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5',

  // Marketing pages (Home hero sections)
  marketing: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',

  // Narrow content (Blog posts, Legal pages)
  narrow: 'max-w-4xl mx-auto px-4 sm:px-6 py-8 lg:py-12',
} as const;

// ============================================================================
// GRID LAYOUTS
// ============================================================================

export const grids = {
  // Detail page two-column: fluid left + fixed 340px sidebar
  detailTwoCol: 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6',

  // Functional page two-column: fluid left + fixed 340px sidebar
  functionalTwoCol: 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6',

  // Three-column equal
  threeCol: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',

  // Four-column grid
  fourCol: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4',
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  dropdown: 'z-10',
  sticky: 'z-20',
  stickyNav: 'z-30',
  modal: 'z-[100]',
  modalContent: 'z-[110]',
  authModal: 'z-[120]',
  toast: 'z-[200]',
  mobileBar: 'z-50',
} as const;

// ============================================================================
// TRANSITION
// ============================================================================

export const transitions = {
  default: 'transition-all duration-200',
  slow: 'transition-all duration-300',
  fast: 'transition-all duration-150',
  color: 'transition-colors duration-200',
  transform: 'transition-transform duration-200',
  opacity: 'transition-opacity duration-200',
} as const;

// ============================================================================
// BREAKPOINTS (reference only -- use Tailwind responsive prefixes in JSX)
// ============================================================================

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  mobile: 375, // minimum test width per Rule Set A
} as const;