// ========== FILE: pages/agent/register.tsx ==========
// 🔄 REDIRECT STUB - HIGHRISE.PK
// V5.8.0 — Legacy agent register page → /onboarding/business
//
// Why a stub?
// - Lesson #141: Duplicate registration forms create maintenance nightmare
// - One canonical onboarding flow per role (enterprise standard)
// - /onboarding/business is the single source of truth for agent applications
// - Preserves SEO + backlinks to /agent/register
//
// This page:
//   1. Server-side redirects (308 permanent) for crawlers
//   2. Client-side fallback for edge cases
//   3. Preserves callbackUrl/query params
// ═══════════════════════════════════════════════════════════════

import type { GetServerSideProps } from 'next';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Loader2, ArrowRight } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// SERVER-SIDE REDIRECT (308 Permanent — SEO-friendly)
// ═══════════════════════════════════════════════════════════════

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Preserve query params (e.g. ?source=blog, ?ref=...)
  const qs = ctx.req.url?.split('?')[1];
  const destination = qs
    ? `/onboarding/business?${qs}`
    : '/onboarding/business';

  return {
    redirect: {
      destination,
      permanent: true, // 308 — tells search engines this is permanent
    },
  };
};

// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE FALLBACK
// ═══════════════════════════════════════════════════════════════
// This will rarely render — getServerSideProps redirects first.
// Only shown if SSR redirect fails (extreme edge cases).
// ═══════════════════════════════════════════════════════════════

export default function AgentRegisterRedirect(): ReactElement {
  const router = useRouter();

  useEffect(() => {
    void router.replace('/onboarding/business');
  }, [router]);

  return (
    <>
      <Head>
        <title>Redirecting... | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta httpEquiv="refresh" content="0; url=/onboarding/business" />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#004063] mb-2">
            Taking you to the agent application...
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            We&apos;ve moved agent registration to a unified onboarding flow.
            You&apos;ll be redirected automatically.
          </p>
          <Link
            href="/onboarding/business"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#029bba] text-white font-semibold text-sm hover:bg-[#027a94] transition-colors"
          >
            Continue to Agent Onboarding
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

// ========== END OF FILE ==========