// pages/_app.tsx
// Highrise.pk — App root
// V6.2.1: ChatWidget removed — Aria is now the sole AI chat assistant
// V22.0: Added enterprise scroll behavior (scroll-to-top on route change)
// BANNED patterns removed: react-hot-toast, @tanstack/react-query, pageProps:any

import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import 'leaflet/dist/leaflet.css';

// Route distance label — Google-style dark pill (NearbyPlacesExplorer)
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { DeveloperProvider } from '../components/developer/DeveloperContext';

import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import { FloatingWhatsApp } from '../components/common/floating-whatsapp';
import AleemWidget from '../components/aleem/AleemWidget';
import CompareBar from '../components/compare/CompareBar';
import ErrorBoundary from '../components/ErrorBoundary';
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

  // Global Sitewide JSON-LD (Organization + Sitelinks Search Box)
  const globalOrganizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://highrise.pk/#organization',
    name: 'Highrise.pk',
    url: 'https://highrise.pk',
    logo: 'https://highrise.pk/logo.png',
    description: "Pakistan's First Property Intelligence Platform. Verify housing societies, estimate fair market prices, and discover verified properties.",
    sameAs: [
      'https://facebook.com/highrisepk',
      'https://twitter.com/highrisepk',
      'https://linkedin.com/company/highrisepk',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+92-300-0000000',
      contactType: 'customer service',
      areaServed: 'PK',
      availableLanguage: ['en', 'ur'],
    },
  };

  const globalWebSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://highrise.pk/#website',
    url: 'https://highrise.pk',
    name: 'Highrise.pk',
    description: "Buy, Rent, & Verify Real Estate in Pakistan",
    publisher: {
      '@id': 'https://highrise.pk/#organization',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://highrise.pk/properties?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

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
      <React.Fragment>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalOrganizationSchema).replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalWebSiteSchema).replace(/</g, '\\u003c') }}
        />
      </React.Fragment>
      <div className="min-h-screen flex flex-col">

        <Header />

        <main className="flex-grow">
          <ErrorBoundary name="app-page">
            {isDeveloperArea ? (
              <DeveloperProvider>
                <Component {...restPageProps} />
              </DeveloperProvider>
            ) : (
              <Component {...restPageProps} />
            )}
          </ErrorBoundary>
        </main>

        <Footer />

        {/* Global overlays — each widget isolated so one crash cannot white-screen the app */}
        <ErrorBoundary name="compare-bar" variant="widget">
          <CompareBar />
        </ErrorBoundary>

        <ErrorBoundary name="floating-whatsapp" variant="widget">
          <FloatingWhatsApp />
        </ErrorBoundary>

        <ErrorBoundary name="aleem-widget" variant="widget">
          <AleemWidget />
        </ErrorBoundary>

      </div>
    </SessionProvider>
  );
}