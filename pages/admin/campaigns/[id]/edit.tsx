// ========== FILE: pages/admin/campaigns/[id]/edit.tsx ==========
// ✏️ EDIT CAMPAIGN PAGE — HIGHRISE.PK
// Loads existing campaign data and delegates to Mission Control
// ═══════════════════════════════════════════════════════════════
// SECURITY & DESIGN:
//   ✅ useSession() + useRouter() guard (no AdminGuard)
//   ✅ AdminLayout wrapper
//   ✅ Native Tailwind divs (no Card imports)
//   ✅ Redirects non-admins to login
//   ✅ Loads campaign via authenticated fetch
//   ✅ Handles not-found (404) gracefully
//   ✅ Handles deleted campaigns
//   ✅ Handles immutable campaigns (sent/sending)
//   ✅ credentials: 'include' on all fetches
//   ✅ Delegates all edit logic to MissionControl
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useRouter }                  from 'next/router';
import { useSession }                 from 'next-auth/react';
import Link                           from 'next/link';
import Head                           from 'next/head';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Lock,
  Trash2,
} from 'lucide-react';

import AdminLayout    from '@/components/admin/AdminLayout';
import MissionControl, { CampaignFormData } from '@/components/admin/campaigns/MissionControl';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

interface CampaignData extends Partial<CampaignFormData> {
  _id?:       string;
  status?:    string;
  isDeleted?: boolean;
}

type LoadState =
  | { type: 'loading' }
  | { type: 'ready'; data: CampaignData }
  | { type: 'not_found' }
  | { type: 'deleted' }
  | { type: 'immutable'; status: string }
  | { type: 'error'; message: string };

// ═══════════════════════════════════════════════════════════════
// 🚀 PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function EditCampaignPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status: sessionStatus } = useSession();

  const [loadState, setLoadState] = useState<LoadState>({ type: 'loading' });

  // ─────────────────────────────────────────────
  // AUTH GUARD
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (!session) {
      const currentPath = router.asPath;
      router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    const role = (session.user as any)?.role;
    if (role !== 'admin') {
      router.replace('/');
      return;
    }
  }, [session, sessionStatus, router]);

  // ─────────────────────────────────────────────
  // FETCH CAMPAIGN
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    if (sessionStatus !== 'authenticated') return;
    if ((session?.user as any)?.role !== 'admin') return;

    let cancelled = false;

    const fetchCampaign = async () => {
      try {
        const res = await fetch(`/api/newsletter/campaigns/${id}`, {
          credentials: 'include',
        });

        if (cancelled) return;

        if (res.status === 404) {
          setLoadState({ type: 'not_found' });
          return;
        }

        if (res.status === 400) {
          setLoadState({
            type:    'error',
            message: 'Invalid campaign ID',
          });
          return;
        }

        if (!res.ok) {
          setLoadState({
            type:    'error',
            message: 'Failed to load campaign',
          });
          return;
        }

        const result = await res.json();

        if (cancelled) return;

        if (!result.success || !result.campaign) {
          setLoadState({
            type:    'error',
            message: result.message || 'Failed to load campaign',
          });
          return;
        }

        const c = result.campaign;

        // Check if deleted
        if (c.isDeleted) {
          setLoadState({ type: 'deleted' });
          return;
        }

        // Check if immutable (sent/sending/failed)
        if (!['draft', 'scheduled'].includes(c.status)) {
          setLoadState({ type: 'immutable', status: c.status });
          return;
        }

        // Success — populate form data
        setLoadState({
          type: 'ready',
          data: {
            _id:         c._id,
            title:       c.title || '',
            subject:     c.subject || '',
            previewText: c.previewText || '',
            content:     c.content || '',
            template:    c.template || 'custom',
            segments:    Array.isArray(c.segments) && c.segments.length > 0
                           ? c.segments
                           : ['all'],
            fromName:    c.fromName  || '',
            fromEmail:   c.fromEmail || '',
            replyTo:     c.replyTo   || '',
            status:      c.status,
            isDeleted:   c.isDeleted,
          },
        });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Network error';
        setLoadState({ type: 'error', message: msg });
      }
    };

    fetchCampaign();

    return () => {
      cancelled = true;
    };
  }, [id, session, sessionStatus]);

  // ─────────────────────────────────────────────
  // LOADING STATE (Session or Campaign)
  // ─────────────────────────────────────────────
  if (sessionStatus === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#029bba] mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // CAMPAIGN LOADING STATE
  // ─────────────────────────────────────────────
  if (loadState.type === 'loading') {
    return (
      <>
        <Head>
          <title>Loading Campaign · Highrise.pk</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <AdminLayout>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#029bba] mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">
                Loading campaign...
              </p>
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  // ─────────────────────────────────────────────
  // NOT FOUND STATE
  // ─────────────────────────────────────────────
  if (loadState.type === 'not_found') {
    return (
      <>
        <Head>
          <title>Campaign Not Found · Highrise.pk</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <AdminLayout>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl 
                            border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl 
                              bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-black text-[#004063] mb-2">
                Campaign Not Found
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                The campaign you're trying to edit doesn't exist or has been 
                permanently deleted.
              </p>
              <Link
                href="/admin/campaigns"
                className="inline-flex items-center gap-2 px-5 py-2.5 
                           rounded-xl bg-[#029bba] hover:bg-[#027a94] 
                           text-white font-bold text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Campaigns
              </Link>
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  // ─────────────────────────────────────────────
  // DELETED STATE
  // ─────────────────────────────────────────────
  if (loadState.type === 'deleted') {
    return (
      <>
        <Head>
          <title>Deleted Campaign · Highrise.pk</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <AdminLayout>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl 
                            border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl 
                              bg-amber-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-black text-[#004063] mb-2">
                Campaign in Trash
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                This campaign has been moved to trash. Restore it from the 
                trash tab to edit it.
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/admin/campaigns"
                  className="inline-flex items-center gap-2 px-5 py-2.5 
                             rounded-xl border border-gray-300 
                             text-gray-700 font-bold text-sm 
                             hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All Campaigns
                </Link>
                <Link
                  href="/admin/campaigns?filter=trash"
                  className="inline-flex items-center gap-2 px-5 py-2.5 
                             rounded-xl bg-[#029bba] hover:bg-[#027a94] 
                             text-white font-bold text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Open Trash
                </Link>
              </div>
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  // ─────────────────────────────────────────────
  // IMMUTABLE STATE (sent/sending/failed)
  // ─────────────────────────────────────────────
  if (loadState.type === 'immutable') {
    return (
      <>
        <Head>
          <title>Campaign Locked · Highrise.pk</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <AdminLayout>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl 
                            border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl 
                              bg-[#029bba]/10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-[#029bba]" />
              </div>
              <h2 className="text-xl font-black text-[#004063] mb-2">
                Campaign Locked
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                This campaign has status{' '}
                <strong className="text-[#029bba] uppercase">
                  {loadState.status}
                </strong>{' '}
                and cannot be edited.
              </p>
              <p className="text-xs text-gray-500 mb-6">
                {loadState.status === 'sent'    && 'Sent campaigns are archived for record-keeping.'}
                {loadState.status === 'sending' && 'Campaign is currently being sent to recipients.'}
                {loadState.status === 'failed'  && 'Delete this campaign and create a new one to try again.'}
              </p>
              <Link
                href="/admin/campaigns"
                className="inline-flex items-center gap-2 px-5 py-2.5 
                           rounded-xl bg-[#029bba] hover:bg-[#027a94] 
                           text-white font-bold text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Campaigns
              </Link>
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  // ─────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────
  if (loadState.type === 'error') {
    return (
      <>
        <Head>
          <title>Error · Highrise.pk</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <AdminLayout>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl 
                            border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl 
                              bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-black text-[#004063] mb-2">
                Failed to Load Campaign
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {loadState.message}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 
                             rounded-xl border border-gray-300 
                             text-gray-700 font-bold text-sm 
                             hover:bg-gray-50 transition-colors"
                >
                  Try Again
                </button>
                <Link
                  href="/admin/campaigns"
                  className="inline-flex items-center gap-2 px-5 py-2.5 
                             rounded-xl bg-[#029bba] hover:bg-[#027a94] 
                             text-white font-bold text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Campaigns
                </Link>
              </div>
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  // ─────────────────────────────────────────────
  // READY — RENDER MISSION CONTROL
  // ─────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>
          {loadState.data.title
            ? `Edit: ${loadState.data.title} · Highrise.pk`
            : 'Edit Campaign · Highrise.pk'}
        </title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <AdminLayout>
        <MissionControl
          mode="edit"
          campaignId={loadState.data._id}
          initialData={loadState.data}
        />
      </AdminLayout>
    </>
  );
}
// ========== END OF FILE ==========