// File: tailwind.config.js
// COMPLETE REPLACEMENT

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {

      // ── Brand & Design System Colors ──────────────────────────────────────
      colors: {
        // Primary palette (locked)
        primary:      "#029bba",   // Teal/Cyan — CTAs, active states, links
        primaryDark:  "#017a8a",   // Hover state for primary
        secondary:    "#004063",   // Dark Navy — headings, hero text

        // Status colors (locked)
        success:      "#10b981",   // Green — success banners, verified badges
        warning:      "#f59e0b",   // Amber — warnings, incomplete states
        danger:       "#ef4444",   // Red — errors, destructive actions
        info:         "#029bba",   // Info banners (same as primary)

        // Accent colors (section-specific)
        accent:       "#10b981",   // Global accent = green (success)
        accentOrange: "#ea580c",   // Resale sections
        accentPurple: "#7c3aed",   // Installment sections
        accentTeal:   "#0d9488",   // Possession / rent sections
        accentIndigo: "#4f46e5",   // Ballot / pre-launch sections

        // Neutrals
        muted:        "#666666",   // Subtle body text
        background:   "#f8f9fa",   // Page background
        card:         "#ffffff",   // Card backgrounds
        border:       "#e5e7eb",   // Soft borders
        light:        "#F5F9FF",   // Light tint backgrounds

        // Hero & dark surfaces
        darkHero:     "#001f2b",   // Dark hero sections
      },

      // ── Keyframes ─────────────────────────────────────────────────────────
      keyframes: {

        // Modal / element entrance (translateY + scale + opacity)
        fadeIn: {
          "0%":   {
            opacity: "0",
            transform: "translateY(8px) scale(0.98)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
        },

        // Simple opacity fade (page transitions, banners)
        fadeInSimple: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },

        // Skeleton loader shimmer
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },

        // Slide down (dropdowns, collapsibles)
        slideDown: {
          "0%":   { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },

        // Slide up (bottom sheets, nav)
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },

        // Pulse glow (trust badges, verified indicators)
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(2, 155, 186, 0.4)" },
          "50%":       { boxShadow: "0 0 0 8px rgba(2, 155, 186, 0)" },
        },

        // Spinner (loading states)
        spin: {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },

      // ── Animations ────────────────────────────────────────────────────────
      animation: {
        // Modal / card entrance — used as animate-fadeIn
        "fadeIn":       "fadeIn 0.2s ease-out forwards",

        // Legacy hyphen version — kept for backward compat
        "fade-in":      "fadeInSimple 0.3s ease-out forwards",

        // Skeleton loaders
        "shimmer":      "shimmer 2s infinite linear",

        // Dropdowns
        "slide-down":   "slideDown 0.2s ease-out forwards",

        // Bottom sheets
        "slide-up":     "slideUp 0.2s ease-out forwards",

        // Trust badges
        "pulse-glow":   "pulseGlow 2s ease-in-out infinite",

        // Spinner (alternative to Tailwind's built-in animate-spin)
        "spin-slow":    "spin 2s linear infinite",
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        sans: [
          "Segoe UI",
          "Tahoma",
          "Geneva",
          "Verdana",
          "sans-serif",
        ],
      },

      // ── Spacing extras ────────────────────────────────────────────────────
      spacing: {
        "18":  "4.5rem",   // 72px — section gaps
        "22":  "5.5rem",   // 88px — hero padding
        "30":  "7.5rem",   // 120px — large section gaps
        "128": "32rem",    // 512px — max widths
      },

      // ── Border radius extras ──────────────────────────────────────────────
      borderRadius: {
        "2xl":  "1rem",    // Cards
        "3xl":  "1.5rem",  // Modal panels
        "4xl":  "2rem",    // Hero cards, large panels
      },

      // ── Box shadows ───────────────────────────────────────────────────────
      boxShadow: {
        // Card elevations
        "card":    "0 2px 8px rgba(0, 0, 0, 0.08)",
        "card-md": "0 8px 24px rgba(0, 0, 0, 0.10)",
        "card-lg": "0 16px 48px rgba(0, 0, 0, 0.12)",

        // Primary glow (CTAs, active states)
        "primary":    "0 4px 16px rgba(2, 155, 186, 0.3)",
        "primary-lg": "0 8px 32px rgba(2, 155, 186, 0.35)",

        // Danger
        "danger": "0 4px 16px rgba(239, 68, 68, 0.25)",

        // Success
        "success": "0 4px 16px rgba(16, 185, 129, 0.25)",
      },

      // ── Z-index scale ─────────────────────────────────────────────────────
      zIndex: {
        "60":  "60",   // Dropdowns above sticky nav
        "70":  "70",   // Tooltips
        "80":  "80",   // Sticky progress bar
        "90":  "90",   // Sticky tab nav
        "100": "100",  // Modals base
        "110": "110",  // Modal backdrops
        "120": "120",  // Modal panels (above backdrop)
        "130": "130",  // Toast / emergency banners
      },

      // ── Max width extras ──────────────────────────────────────────────────
      maxWidth: {
        "8xl":  "88rem",   // 1408px — wide admin panels
        "9xl":  "96rem",   // 1536px — full-width layouts
        "10xl": "104rem",  // 1664px — ultra-wide
      },

      // ── Backdrop blur ─────────────────────────────────────────────────────
      backdropBlur: {
        xs: "2px",
      },
    },
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: [

    // Rich text content (blog, property descriptions)
    require("@tailwindcss/typography"),

    // scrollbar-hide — required by:
    //   TabNavigation (horizontal scroll on mobile)
    //   ProgressBar pill row
    //   Property galleries
    function scrollbarHide({ addUtilities }) {
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width":    "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        ".scrollbar-default": {
          "-ms-overflow-style": "auto",
          "scrollbar-width":    "auto",
          "&::-webkit-scrollbar": {
            display: "block",
          },
        },
      });
    },

    // line-clamp (native in Tailwind v3.3+ but plugin ensures compat)
    // Used by: property cards, listing pages, blog cards
    function lineClamp({ addUtilities }) {
      addUtilities({
        ".line-clamp-1": {
          overflow: "hidden",
          display: "-webkit-box",
          "-webkit-box-orient": "vertical",
          "-webkit-line-clamp": "1",
        },
        ".line-clamp-2": {
          overflow: "hidden",
          display: "-webkit-box",
          "-webkit-box-orient": "vertical",
          "-webkit-line-clamp": "2",
        },
        ".line-clamp-3": {
          overflow: "hidden",
          display: "-webkit-box",
          "-webkit-box-orient": "vertical",
          "-webkit-line-clamp": "3",
        },
        ".line-clamp-4": {
          overflow: "hidden",
          display: "-webkit-box",
          "-webkit-box-orient": "vertical",
          "-webkit-line-clamp": "4",
        },
      });
    },
  ],
};