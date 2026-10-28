// pages/admin/automation/new.tsx
// ═══════════════════════════════════════════════════════════════
// CREATE NEW AUTOMATION SEQUENCE — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Loader2, X } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import SequenceBuilder, {
  SequenceFormData,
} from '@/components/admin/automation/SequenceBuilder';

interface Banner {
  type:    'success' | 'error' | 'info';
  message: string;
}

export default function NewAutomationPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [isSaving, setIsSaving] = useState(false);
  const [banner,   setBanner]   = useState<Banner | null>(null);

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.replace(
        `/login?redirect=${encodeURIComponent('/admin/automation/new')}`
      );
      return;
    }
    if ((session.user as any)?.role !== 'admin') {
      router.replace('/');
    }
  }, [session, sessionStatus, router]);

  // ── Banner auto-dismiss ───────────────────────────────────
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  // ── Save handler ──────────────────────────────────────────
  const handleSave = async (data: SequenceFormData): Promise<void> => {
    setIsSaving(true);
    try {
      // Build triggerFilters from SequenceFormData.filters
      const triggerFilters = {
        subscriberSources: data.filters.subscriberSource,
        leadCities:        data.filters.leadCities,
        leadTypes:         data.filters.leadTypes,
        leadStatuses:      data.filters.leadStatuses,
        leadSources:       [],
      };

      const res = await fetch('/api/automation/sequences', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                data.name,
          description:         data.description,
          trigger:             data.trigger,
          status:              data.status,
          recipientType:       'both',
          steps:               data.steps,
          triggerFilters,
          defaultFromName:     data.defaultFromName,
          defaultFromEmail:    data.defaultFromEmail,
          skipIfAlreadyActive: true,
          stopOnUnsubscribe:   true,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setBanner({
          type:    'success',
          message: 'Sequence created successfully!',
        });
        // Redirect to edit page so admin can continue editing
        setTimeout(() => {
          router.push(`/admin/automation/${result.sequence._id}/edit`);
        }, 1000);
      } else {
        setBanner({
          type:    'error',
          message: result.message || 'Failed to create sequence',
        });
        throw new Error(result.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setBanner({ type: 'error', message: msg });
      throw err; // Re-throw so SequenceBuilder can handle UI reset
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────
  if (sessionStatus === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#029bba]" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>New Automation Sequence · Highrise.pk Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <AdminLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-3xl">

            {/* Page header */}
            <div className="mb-6">
              <h1 className="text-2xl font-black text-[#004063]">
                New Automation Sequence
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Build a drip campaign that sends automatically when triggered
              </p>
            </div>

            <SequenceBuilder
              mode="create"
              onSave={handleSave}
              isSaving={isSaving}
            />

          </div>
        </div>
      </AdminLayout>

      {/* ── Banner ───────────────────────────────────────────── */}
      {banner && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50
                        max-w-md w-full mx-4">
          <div className={`p-4 rounded-2xl shadow-2xl flex items-start gap-3
            ${banner.type === 'success' ? 'bg-emerald-500 text-white'
            : banner.type === 'error'   ? 'bg-red-500 text-white'
            :                             'bg-[#029bba] text-white'}`}>
            <p className="flex-1 text-sm font-bold">{banner.message}</p>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-white/80 hover:text-white flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}