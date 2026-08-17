// pages/_app.tsx
// Highrise.pk — App root
// V6.2.1: ChatWidget removed — Aria is now the sole AI chat assistant
// V22.0: Added enterprise scroll behavior (scroll-to-top on route change)
// BANNED patterns removed: react-hot-toast, @tanstack/react-query, pageProps:any

import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { DeveloperProvider } from '../components/developer/DeveloperContext';

import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import { FloatingWhatsApp } from '../components/common/floating-whatsapp';
import AriaWidget from '../components/aria/AriaWidget';
import CompareBar from '../components/compare/CompareBar';
import '../styles/globals.css';

// ─── Typed page props (NextAuth session + optional Aria context) ──────────────

interface HighrisePageProps {
  session?: Session | null;
  [key: string]: unknown;
}

type HighriseAppProps = AppProps<HighrisePageProps>;

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App({ Component, pageProps }: HighriseAppProps): React.ReactElement {
  const { session, ...restPageProps } = pageProps;
  const router = useRouter();
  const isDeveloperArea = router.pathname === '/developer' || router.pathname.startsWith('/developer/');

  // ── Enterprise Scroll Behavior ─────────────────────────────
  // Matches Zameen / MagicBricks / Zillow / Rightmove standards:
  //
  //   ✅ Fresh page load      → Scroll to TOP (hero visible)
  //   ✅ Page refresh          → Scroll to TOP (never mid-page)
  //   ✅ Cross-page navigation → Scroll to TOP (hero visible)
  //   ✅ Same-page filter (shallow: false with same pathname) → TOP
  //   ✅ Hash anchors (#project-grid) → Preserve anchor scroll
  //   ✅ Browser back/forward → Preserve native scroll restoration
  //
  // We disable browser's automatic scroll restoration on mount so
  // refreshes land at top. Router events handle navigation.

  useEffect(() => {
    // Disable browser's automatic scroll restoration on refresh
    // This prevents refreshes from landing mid-page
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Scroll to top on initial mount (handles refresh + first load)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []); // Empty deps — runs once on app mount

  // ── Context-aware scroll behavior (Enterprise Pattern) ────
  // Matches Zameen/MagicBricks/Zillow standards:
  //
  //   ✅ Cross-page nav (Home → Projects)  → scroll to TOP
  //   ❌ Same-page filter change            → STAY IN PLACE
  //   ❌ Sort dropdown change               → STAY IN PLACE
  //   ❌ Pagination click                   → component handles (scroll to grid)
  //
  // Individual components (BrowseByCity, Pagination, HotspotAreas etc.)
  // call window.scrollTo() themselves when they need specific scroll behavior.
  // This ref tracks the previous pathname to detect cross-page vs same-page nav.
  const previousPathnameRef = React.useRef<string>('');

  useEffect(() => {
    // Initialize with current pathname on mount
    if (typeof window !== 'undefined') {
      previousPathnameRef.current = window.location.pathname;
    }

    // Capture "from" pathname BEFORE navigation completes
    const handleRouteChangeStart = () => {
      if (typeof window !== 'undefined') {
        previousPathnameRef.current = window.location.pathname;
      }
    };

    // Only scroll to top on cross-page navigation, not same-page filter changes
    const handleRouteChangeComplete = (url: string) => {
      // If URL has a hash anchor (e.g. #main-project-grid),
      // let the browser handle the anchor scroll — don't override it
      if (url.includes('#')) return;

      // Extract pathname from new URL (strip query + hash)
      const nextPathname = url.split('?')[0].split('#')[0];

      // Same pathname = same page (filter/sort change) → DON'T scroll
      // Components handle their own scroll intent for same-page updates
      if (previousPathnameRef.current === nextPathname) return;

      // ── ENTERPRISE SCROLL ENFORCEMENT ──
      // Double-rAF technique defeats any child component that tries to
      // scroll (via useEffect, IntersectionObserver, or scrollIntoView)
      // after routeChangeComplete fires. Used by Vercel, Stripe, Linear.
      //
      // Frame 1: Immediate scroll (before paint)
      // Frame 2: After first paint (defeats layout shifts)
      // Frame 3: After 100ms (defeats delayed useEffect scrolls)
      // Frame 4: After 300ms (defeats slow-loading section observers)

      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        });
      });

      // Safety net for delayed component mounts (skeleton loaders, images)
      setTimeout(() => {
        if (window.scrollY > 0) {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }
      }, 100);

      setTimeout(() => {
        if (window.scrollY > 0) {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }
      }, 300);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router]);

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen flex flex-col">

        <Header />

        <main className="flex-grow">
          {isDeveloperArea ? (
            <DeveloperProvider>
              <Component {...restPageProps} />
            </DeveloperProvider>
          ) : (
            <Component {...restPageProps} />
          )}
        </main>

        <Footer />

        {/* ═══════════════════════════════════════════════════════════
            GLOBAL OVERLAYS & FLOATING WIDGETS
            All render via React Portal → guaranteed z-index above
            everything else. Order below is intentional:
            
            1. CompareBar (bottom bar, z-9998) — hides on /compare page
            2. FloatingWhatsApp (bottom-right, z-40) — external contact
            3. AriaWidget (bottom-right, z-50) — AI assistant
            
            CompareBar rendered FIRST so it visually anchors bottom,
            while WhatsApp + Aria float above it in the corner stack.
        ═══════════════════════════════════════════════════════════ */}

        {/* Sticky Compare Bar — appears when 1+ items in compare list.
            Portal-rendered, hides automatically on /compare page. */}
        <CompareBar />

        {/* Floating WhatsApp — external direct contact (different purpose than Aria) */}
        <FloatingWhatsApp />

        {/* Aria AI Sales Bot — sole AI chat assistant (replaced ChatWidget V6.2.1) */}
        {/* Context is 'general' by default. Property/society/project pages pass their own context. */}
        <AriaWidget />

      </div>
    </SessionProvider>
  );
}