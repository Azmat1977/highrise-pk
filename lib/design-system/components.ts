// File: lib/design-system/components.ts
// Highrise.pk Design System -- Reusable Component Class Presets
// Composable Tailwind class strings for consistent UI across all pages.
// Usage: className={cn(components.card, components.cardWithHeader)}
// Note: Use a simple cn() utility or template literals to compose classes.

// ============================================================================
// HELPER: Class composition utility
// ============================================================================

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// CARDS
// ============================================================================

export const card = {
  // Base card
  base: 'bg-white rounded-2xl shadow-sm border border-gray-100',

  // Card with header bar (section-style)
  withHeader: 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden',

  // Card header bar
  header: 'px-6 py-4 border-b border-gray-100 flex items-center justify-between',

  // Card body
  body: 'p-6',

  // Card body (compact)
  bodySm: 'p-4',

  // Card body (spacious)
  bodyLg: 'p-8',

  // Interactive card (hover effect)
  interactive: 'bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#029bba]/40 hover:-translate-y-0.5 transition-all cursor-pointer',

  // Highlight card (gray background, used in spec grids)
  highlight: 'p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3',

  // Highlight icon container
  highlightIcon: 'w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0',
} as const;

// ============================================================================
// BUTTONS
// ============================================================================
// All variants share one keyboard-focus treatment so tabbing through the
// site shows a single, clearly visible teal ring (WCAG 2.4.7).

const buttonFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/60 focus-visible:ring-offset-2';

export const button = {
  // Primary (deep teal) -- white text reaches WCAG AA (5.1:1) on #017a8a;
  // hover steps to the locked navy #004063 (11:1). Brand teal #029bba stays
  // on links, icons, focus rings and surfaces; only the button fill darkens.
  primary: `inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#017a8a] text-white font-semibold text-sm rounded-xl hover:bg-[#004063] transition-colors ${buttonFocus}`,

  // Primary small
  primarySm: `inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#017a8a] text-white font-bold text-xs rounded-lg hover:bg-[#004063] transition-colors ${buttonFocus}`,

  // Outline
  outline: `inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 text-[#333333] font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors ${buttonFocus}`,

  // Ghost (no border, no bg)
  ghost: `inline-flex items-center justify-center gap-2 px-3 py-2 text-[#666666] font-medium text-sm rounded-xl hover:bg-gray-100 transition-colors ${buttonFocus}`,

  // Danger
  danger: `inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#ef4444] text-white font-semibold text-sm rounded-xl hover:bg-red-600 transition-colors ${buttonFocus}`,

  // Success
  success: `inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#10b981] text-white font-semibold text-sm rounded-xl hover:bg-emerald-600 transition-colors ${buttonFocus}`,

  // WhatsApp
  whatsapp: `inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white font-medium text-sm rounded-xl hover:bg-[#128C7E] transition-colors ${buttonFocus}`,

  // Floating action pill (hero overlay buttons)
  floatingPill: 'flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold text-[#004063] hover:bg-white transition-all shadow-sm',

  // Icon-only button
  iconOnly: 'flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-[#666666] transition-colors',

  // Disabled state (append to any button)
  disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
} as const;

// ============================================================================
// FORM INPUTS
// ============================================================================

export const input = {
  // Text input
  text: 'w-full rounded-xl border-gray-200 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/30',

  // Textarea
  textarea: 'w-full rounded-xl border-gray-200 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/30 min-h-[100px] resize-y',

  // Select
  select: 'w-full rounded-xl border-gray-200 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/30 bg-white',

  // Error state (append to input)
  error: 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/30',

  // Label
  label: 'block text-sm font-bold text-[#004063] mb-1.5',

  // Helper text
  helper: 'text-xs text-gray-500 mt-1',

  // Error text
  errorText: 'text-xs text-[#ef4444] mt-1',
} as const;

// ============================================================================
// BADGES & CHIPS
// ============================================================================

export const badge = {
  // Primary badge (darkened to #017a8a for WCAG AA 5.1:1 with white text)
  primary: 'inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#017a8a] text-white shadow-sm',

  // Success badge
  success: 'inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#10b981] text-white shadow-sm',

  // Warning badge
  warning: 'inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#f59e0b] text-white shadow-sm',

  // Error badge
  error: 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800',

  // Pending badge
  pending: 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800',

  // Approved badge
  approved: 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800',

  // Rejected badge
  rejected: 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800',

  // Outline chip
  chip: 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700',

  // Pill (media chips, action pills)
  pill: 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-[#029bba] hover:bg-[#029bba]/5 transition-colors',

  // Negotiable badge
  negotiable: 'inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider rounded-full border border-emerald-100',
} as const;

// ============================================================================
// MODALS
// ============================================================================

export const modal = {
  // Backdrop
  backdrop: 'fixed inset-0 z-[100] flex items-center justify-center p-4',

  // Backdrop overlay
  overlay: 'absolute inset-0 bg-black/60 backdrop-blur-sm',

  // Modal container
  container: 'relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fadeIn',

  // Modal container (wide)
  containerWide: 'relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn',

  // Close button
  closeBtn: 'absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-[#666666] transition-colors',
} as const;

// ============================================================================
// BANNERS & TOASTS
// ============================================================================

export const banner = {
  // Success toast (bottom center)
  successToast: 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl bg-[#004063] text-white text-sm font-medium shadow-xl animate-fadeIn',

  // Error banner (inline)
  errorInline: 'p-3 bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700 text-sm rounded-lg',

  // Warning banner (inline)
  warningInline: 'p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg',

  // Info banner (inline)
  infoInline: 'p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg',
} as const;

// ============================================================================
// SAFETY & DISCLAIMER
// ============================================================================

export const safety = {
  // Safety First warning card (sidebar)
  warningCard: 'bg-[#fffdf0] border border-[#fef08a] rounded-2xl p-5',

  // Full-width bottom disclaimer
  disclaimer: 'bg-amber-50 border-t border-amber-100',

  // Disclaimer inner
  disclaimerInner: 'max-w-6xl mx-auto px-4 py-5 flex items-start gap-3',

  // Disclaimer text
  disclaimerText: 'text-sm text-amber-700',
} as const;

// ============================================================================
// MOBILE BOTTOM BAR
// ============================================================================

export const mobileBar = {
  container: 'fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3',
  inner: 'flex items-center justify-between gap-3',
} as const;

// ============================================================================
// SKELETON LOADERS
// ============================================================================

export const skeleton = {
  shimmer: 'animate-shimmer bg-gray-100 rounded',
  text: 'h-4 bg-gray-100 rounded animate-shimmer',
  title: 'h-6 w-3/4 bg-gray-100 rounded animate-shimmer',
  image: 'w-full h-48 bg-gray-100 rounded-2xl animate-shimmer',
  card: 'h-32 bg-gray-100 rounded-2xl animate-shimmer',
} as const;

// ============================================================================
// JUMP LINKS / SCROLL NAV
// ============================================================================

export const jumpNav = {
  container: 'fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-md transition-all duration-300',
  inner: 'max-w-7xl mx-auto px-4',
  nav: 'flex items-center gap-1 overflow-x-auto scrollbar-hide py-3',
  link: 'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
  linkActive: 'bg-[#029bba] text-white shadow-sm',
  linkInactive: 'text-[#666666] hover:bg-gray-100',
} as const;