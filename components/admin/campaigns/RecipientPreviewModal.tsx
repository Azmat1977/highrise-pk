// ========== FILE: components/admin/campaigns/RecipientPreviewModal.tsx ==========
// 👥 ENTERPRISE RECIPIENT PREVIEW MODAL — HIGHRISE.PK
// Shows who will receive campaign before sending
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ Total recipient count (prominent)
//   ✅ Breakdown: subscribers vs leads vs duplicates removed
//   ✅ Sample list of first 5 recipients
//   ✅ Temperature badges on lead recipients
//   ✅ Lead score display
//   ✅ City/entity name display
//   ✅ Warnings panel (too few, too many, etc.)
//   ✅ Loading skeleton
//   ✅ Error state with retry
//   ✅ Empty state handling
//   ✅ Body scroll lock
//   ✅ ESC key closes
//   ✅ Refresh button
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  Users,
  Mail,
  Flame,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  MapPin,
  Home,
  Star,
  TrendingUp,
  Info,
  Shield,
} from 'lucide-react';
import type { LeadFilters } from './LeadFilterPanel';
import type { RecipientSource } from './RecipientSourceSelector';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

interface SampleRecipient {
  id:          string;
  source:      'subscriber' | 'lead';
  email:       string;
  name:        string;
  city?:       string;
  entityName?: string;
  temperature?: string;
  leadScore?:  number;
  inquiryDate?: string;
}

interface PreviewData {
  total:     number;
  breakdown: {
    subscribers: number;
    leads:       number;
    duplicates:  number;
  };
  sample:    SampleRecipient[];
  warnings:  string[];
}

interface RecipientPreviewModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  source:      RecipientSource;
  leadFilters: LeadFilters;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 HELPERS
// ═══════════════════════════════════════════════════════════════

function getTemperatureStyle(temp?: string): {
  label: string;
  color: string;
  icon:  React.ReactNode;
} {
  switch (temp) {
    case 'burning':
      return { label: 'Burning', color: 'bg-red-100 text-red-700',    icon: <Flame className="w-3 h-3" /> };
    case 'hot':
      return { label: 'Hot',     color: 'bg-orange-100 text-orange-700', icon: <Flame className="w-3 h-3" /> };
    case 'warm':
      return { label: 'Warm',    color: 'bg-yellow-100 text-yellow-700', icon: <TrendingUp className="w-3 h-3" /> };
    case 'cold':
      return { label: 'Cold',    color: 'bg-blue-100 text-blue-700',   icon: <Info className="w-3 h-3" /> };
    default:
      return { label: '',        color: '',                             icon: null };
  }
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  const masked = user.length > 2
    ? user[0] + '*'.repeat(Math.min(user.length - 2, 6)) + user[user.length - 1]
    : user[0] + '*';
  return `${masked}@${domain}`;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 SKELETON LOADER
// ═══════════════════════════════════════════════════════════════

const SkeletonRow = () => (
  <div className="flex items-center gap-3 p-3 animate-pulse">
    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-gray-200 rounded w-3/4" />
      <div className="h-2.5 bg-gray-100 rounded w-1/2" />
    </div>
    <div className="w-12 h-5 bg-gray-100 rounded-full" />
  </div>
);

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const RecipientPreviewModal: React.FC<RecipientPreviewModalProps> = ({
  isOpen,
  onClose,
  source,
  leadFilters,
}) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // Body scroll lock + ESC key
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // ─────────────────────────────────────────────
  // Fetch preview data
  // ─────────────────────────────────────────────
  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        '/api/newsletter/campaigns/recipients-preview',
        {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source,
            leadFilters,
            countOnly: false,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setPreviewData({
          total:     data.total,
          breakdown: data.breakdown,
          sample:    data.sample || [],
          warnings:  data.warnings || [],
        });
      } else {
        setError(data.message || 'Failed to load preview');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, [source, leadFilters]);

  // Fetch when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPreview();
    }
  }, [isOpen, fetchPreview]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start 
                      justify-center p-4 py-8">
        <div className="relative bg-white rounded-3xl shadow-2xl 
                        w-full max-w-2xl">

          {/* ═══════════════════════════════════════════
              HEADER
              ═══════════════════════════════════════════ */}
          <div className="sticky top-0 bg-white border-b border-gray-200
                          px-6 py-4 rounded-t-3xl flex items-center
                          justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br 
                              from-[#029bba] to-[#004063] flex items-center 
                              justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#004063]">
                  Recipient Preview
                </h2>
                <p className="text-xs text-gray-500">
                  Who will receive this campaign
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchPreview}
                disabled={loading}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 
                           transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              BODY
              ═══════════════════════════════════════════ */}
          <div className="p-6 space-y-5">

            {/* ─────────────────────────────────────────
                LOADING STATE
                ───────────────────────────────────────── */}
            {loading && !previewData && (
              <div className="space-y-4">
                {/* Total count skeleton */}
                <div className="p-6 bg-gray-50 rounded-2xl animate-pulse text-center">
                  <div className="h-14 w-32 bg-gray-200 rounded-2xl mx-auto mb-2" />
                  <div className="h-3 w-40 bg-gray-100 rounded mx-auto" />
                </div>

                {/* Breakdown skeleton */}
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-2xl animate-pulse">
                      <div className="h-8 bg-gray-200 rounded mb-2" />
                      <div className="h-3 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>

                {/* Sample rows skeleton */}
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  {[1, 2, 3].map((i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────
                ERROR STATE
                ───────────────────────────────────────── */}
            {error && !loading && (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-900 mb-1">
                  Failed to Load Preview
                </p>
                <p className="text-xs text-gray-500 mb-4">{error}</p>
                <button
                  type="button"
                  onClick={fetchPreview}
                  className="px-4 py-2 rounded-xl bg-[#029bba] text-white 
                             font-semibold text-sm hover:bg-[#027a94] 
                             transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* ─────────────────────────────────────────
                DATA STATE
                ───────────────────────────────────────── */}
            {previewData && !loading && (
              <>
                {/* TOTAL COUNT — Prominent */}
                <div className={`
                  p-6 rounded-2xl text-center
                  ${previewData.total === 0
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gradient-to-br from-[#029bba]/10 to-[#004063]/5 border border-[#029bba]/20'
                  }
                `}>
                  <div className="text-5xl font-black text-[#029bba] mb-1">
                    {previewData.total.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-600 font-semibold">
                    {previewData.total === 1
                      ? 'recipient will receive this campaign'
                      : 'recipients will receive this campaign'}
                  </p>
                </div>

                {/* BREAKDOWN — 3 Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-[#029bba]/5 rounded-2xl text-center 
                                  border border-[#029bba]/15">
                    <Mail className="w-5 h-5 text-[#029bba] mx-auto mb-1" />
                    <p className="text-2xl font-black text-[#029bba]">
                      {previewData.breakdown.subscribers.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">
                      Subscribers
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-2xl text-center 
                                  border border-purple-100">
                    <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-2xl font-black text-purple-600">
                      {previewData.breakdown.leads.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">
                      Leads
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl text-center 
                                  border border-emerald-100">
                    <Shield className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <p className="text-2xl font-black text-emerald-600">
                      {previewData.breakdown.duplicates.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">
                      Deduped
                    </p>
                  </div>
                </div>

                {/* WARNINGS */}
                {previewData.warnings.length > 0 && (
                  <div className="space-y-2">
                    {previewData.warnings.map((warning, i) => (
                      <div
                        key={i}
                        className="p-3 bg-amber-50 border border-amber-200 
                                   rounded-xl flex items-start gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-amber-600 
                                                flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 font-semibold">
                          {warning}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* SAMPLE RECIPIENTS */}
                {previewData.sample.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black text-[#004063]">
                        Sample Recipients
                      </h3>
                      <span className="text-xs text-gray-400">
                        First {previewData.sample.length} shown
                      </span>
                    </div>

                    <div className="rounded-2xl border border-gray-200 
                                    overflow-hidden divide-y divide-gray-100">
                      {previewData.sample.map((recipient) => {
                        const tempStyle = getTemperatureStyle(recipient.temperature);

                        return (
                          <div
                            key={recipient.id}
                            className="flex items-center gap-3 p-3 
                                       hover:bg-gray-50 transition-colors"
                          >
                            {/* Avatar */}
                            <div className={`
                              w-10 h-10 rounded-full flex items-center 
                              justify-center flex-shrink-0 text-sm font-black
                              ${recipient.source === 'subscriber'
                                ? 'bg-[#029bba]/10 text-[#029bba]'
                                : 'bg-purple-100 text-purple-700'
                              }
                            `}>
                              {recipient.name
                                ? recipient.name.charAt(0).toUpperCase()
                                : recipient.email.charAt(0).toUpperCase()
                              }
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">
                                {recipient.name || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {maskEmail(recipient.email)}
                              </p>

                              {/* Meta row */}
                              <div className="flex items-center gap-2 mt-1">
                                {/* City */}
                                {recipient.city && (
                                  <span className="flex items-center gap-0.5 
                                                   text-[10px] text-gray-500">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {recipient.city}
                                  </span>
                                )}

                                {/* Entity name */}
                                {recipient.entityName && (
                                  <span className="flex items-center gap-0.5 
                                                   text-[10px] text-gray-500 
                                                   truncate max-w-[120px]">
                                    <Home className="w-2.5 h-2.5 flex-shrink-0" />
                                    {recipient.entityName}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right badges */}
                            <div className="flex flex-col items-end gap-1.5 
                                            flex-shrink-0">
                              {/* Source badge */}
                              <span className={`
                                px-2 py-0.5 rounded-full text-[10px] font-black
                                ${recipient.source === 'subscriber'
                                  ? 'bg-[#029bba]/10 text-[#029bba]'
                                  : 'bg-purple-100 text-purple-700'
                                }
                              `}>
                                {recipient.source === 'subscriber' ? 'Sub' : 'Lead'}
                              </span>

                              {/* Temperature */}
                              {tempStyle.label && (
                                <span className={`
                                  flex items-center gap-1 px-2 py-0.5 
                                  rounded-full text-[10px] font-bold
                                  ${tempStyle.color}
                                `}>
                                  {tempStyle.icon}
                                  {tempStyle.label}
                                </span>
                              )}

                              {/* Lead Score */}
                              {recipient.leadScore !== undefined && (
                                <span className="flex items-center gap-1 
                                                 text-[10px] text-gray-500">
                                  <Star className="w-2.5 h-2.5 text-amber-400" />
                                  {recipient.leadScore}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Note about sample */}
                    <p className="text-xs text-gray-400 text-center mt-2">
                      This is a sample preview. All {previewData.total.toLocaleString()} recipients 
                      will receive personalized emails.
                    </p>
                  </div>
                )}

                {/* EMPTY STATE */}
                {previewData.total === 0 && (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-900 mb-1">
                      No Recipients Found
                    </p>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto">
                      Adjust your filters or change recipient source to 
                      include more people.
                    </p>
                  </div>
                )}

                {/* SUCCESS STATE */}
                {previewData.total > 0 && previewData.warnings.length === 0 && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 
                                  rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs text-emerald-800 font-semibold">
                      ✅ Audience looks great — ready to send to{' '}
                      {previewData.total.toLocaleString()} recipients!
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ═══════════════════════════════════════════
              FOOTER
              ═══════════════════════════════════════════ */}
          <div className="border-t border-gray-200 px-6 py-4 
                          rounded-b-3xl bg-gray-50 flex items-center 
                          justify-between">
            <p className="text-xs text-gray-500">
              💡 Tip: Use filters to refine your audience
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 
                         text-gray-700 font-semibold hover:bg-white 
                         transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipientPreviewModal;
// ========== END OF FILE ==========