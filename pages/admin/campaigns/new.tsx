// ========== FILE: pages/admin/campaigns/new.tsx ==========
// 🎯 CREATE NEW CAMPAIGN PAGE — HIGHRISE.PK
// Uses Mission Control enterprise dashboard
// ═══════════════════════════════════════════════════════════════
// SECURITY & DESIGN:
//   ✅ useSession() + useRouter() guard (no AdminGuard)
//   ✅ AdminLayout wrapper
//   ✅ Native Tailwind divs (no Card imports)
//   ✅ Redirects non-admins to login
//   ✅ Loading state during session check
//   ✅ Delegates all logic to MissionControl component
// ═══════════════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { useRouter }        from 'next/router';
import { useSession }       from 'next-auth/react';
import { Loader2 }          from 'lucide-react';
import Head                 from 'next/head';

import AdminLayout          from '@/components/admin/AdminLayout';
import MissionControl       from '@/components/admin/campaigns/MissionControl';

// ═══════════════════════════════════════════════════════════════
// 🚀 PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // ─────────────────────────────────────────────
  // AUTH GUARD (Client-side redirect)
  // Server-side auth is handled by API endpoints
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace(`/login?redirect=${encodeURIComponent('/admin/campaigns/new')}`);
      return;
    }

    const role = (session.user as any)?.role;
    if (role !== 'admin') {
      router.replace('/');
      return;
    }
  }, [session, status, router]);

  // ─────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#029bba] mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">
            Loading Mission Control...
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>New Campaign · Mission Control · Highrise.pk</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <AdminLayout>
        <MissionControl mode="create" />
      </AdminLayout>
    </>
  );
}
// ========== END OF FILE ==========