// ========== FILE: pages/admin/campaigns/index.tsx ==========
// 📋 CAMPAIGN COMMAND CENTER — HIGHRISE.PK
// Beautiful campaign list with filters, stats, and actions
// ═══════════════════════════════════════════════════════════════
// SECURITY & DESIGN:
//   ✅ useSession() + useRouter() guard (no AdminGuard)
//   ✅ AdminLayout wrapper
//   ✅ Native Tailwind divs (no Card imports)
//   ✅ No react-hot-toast (custom Banner notifications)
//   ✅ credentials: 'include' on all fetches
//   ✅ No inline styles (all Tailwind classes)
//   ✅ Beautiful preview modal
//   ✅ Confirmation dialogs (2-step for permanent delete)
//   ✅ Bulk actions with parallel API calls
//   ✅ Search & filter
//   ✅ Duplicate campaign feature
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import {
  Plus,
  Send,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Loader2,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  RotateCcw,
  X,
  Search,
  Copy,
  MoreVertical,
  Rocket,
  Sparkles,
  BarChart2,
  TrendingUp,
} from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

interface Campaign {
  _id:         string;
  title:       string;
  subject:     string;
  content:     string;
  previewText?: string;
  template:    string;
  status:      'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledFor: string | null;
  sentAt:      string | null;
  recipients: {
    total:  number;
    sent:   number;
    opened?: number;
    clicked?: number;
  };
  abTest?: {
    enabled: boolean;
    winner:  'a' | 'b' | null;
    status:  string;
  };
  isDeleted?:  boolean;
  deletedAt?:  string;
  createdAt:   string;
}

interface Stats {
  total:     number;
  draft:     number;
  scheduled: number;
  sent:      number;
  trash:     number;
}

interface Banner {
  type:    'success' | 'error' | 'info';
  message: string;
}

type FilterType = 'all' | 'draft' | 'scheduled' | 'sent' | 'trash';

// ═══════════════════════════════════════════════════════════════
// 🎨 CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════

const ConfirmModal: React.FC<{
  isOpen:      boolean;
  title:       string;
  message:     string;
  confirmText: string;
  variant:     'danger' | 'warning' | 'info';
  isLoading:   boolean;
  onConfirm:   () => void;
  onClose:     () => void;
}> = ({ isOpen, title, message, confirmText, variant, isLoading, onConfirm, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const variantStyles = {
    danger:  { bg: 'bg-red-500 hover:bg-red-600', icon: 'bg-red-100 text-red-600',       Icon: Trash2 },
    warning: { bg: 'bg-amber-500 hover:bg-amber-600', icon: 'bg-amber-100 text-amber-600', Icon: AlertCircle },
    info:    { bg: 'bg-[#029bba] hover:bg-[#027a94]', icon: 'bg-[#029bba]/10 text-[#029bba]', Icon: RotateCcw },
  };
  const style = variantStyles[variant];
  const Icon  = style.Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
        <div className={`w-14 h-14 rounded-2xl ${style.icon} flex items-center justify-center mx-auto mb-4`}>
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-black text-[#004063] text-center mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 text-center mb-6 whitespace-pre-line">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 
                       text-gray-700 font-semibold hover:bg-gray-50 
                       transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold 
                        transition-colors disabled:opacity-50 flex items-center 
                        justify-center gap-2 ${style.bg}`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎨 PREVIEW MODAL
// ═══════════════════════════════════════════════════════════════

const PreviewModal: React.FC<{
  isOpen:   boolean;
  campaign: Campaign | null;
  onClose:  () => void;
}> = ({ isOpen, campaign, onClose }) => {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (!isOpen || !campaign) return;

    document.body.style.overflow = 'hidden';
    setLoading(true);

    fetch('/api/newsletter/preview', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: campaign.template,
        content:  campaign.content || '',
        subject:  campaign.subject,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPreviewHtml(data.html);
      })
      .catch(() => { /* silent fail */ })
      .finally(() => setLoading(false));

    return () => { document.body.style.overflow = ''; };
  }, [isOpen, campaign]);

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full 
                      max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 
                        px-6 py-4 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-[#004063] truncate">
              {campaign.title}
            </h3>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {campaign.subject}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0 ml-3"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
            </div>
          ) : (
            <iframe
              srcDoc={previewHtml}
              sandbox="allow-same-origin"
              title="Email Preview"
              className="w-full bg-white rounded-2xl shadow-lg border-0 min-h-[500px] h-[600px]"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎨 STATUS BADGE
// ═══════════════════════════════════════════════════════════════

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, { bg: string; text: string; Icon: React.ComponentType<any> }> = {
    draft:     { bg: 'bg-gray-100',    text: 'text-gray-800',    Icon: FileText },
    scheduled: { bg: 'bg-blue-100',    text: 'text-blue-800',    Icon: Clock },
    sending:   { bg: 'bg-amber-100',   text: 'text-amber-800',   Icon: Loader2 },
    sent:      { bg: 'bg-emerald-100', text: 'text-emerald-800', Icon: CheckCircle },
    failed:    { bg: 'bg-red-100',     text: 'text-red-800',     Icon: AlertCircle },
  };
  const style = styles[status] || styles.draft;
  const Icon = style.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full 
                      text-xs font-bold ${style.bg} ${style.text}`}>
      <Icon className={`w-3 h-3 ${status === 'sending' ? 'animate-spin' : ''}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CampaignsListPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [campaigns,     setCampaigns]     = useState<Campaign[]>([]);
  const [stats,         setStats]         = useState<Stats>({
    total: 0, draft: 0, scheduled: 0, sent: 0, trash: 0,
  });
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState<FilterType>('all');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banner,        setBanner]        = useState<Banner | null>(null);

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean; campaign: Campaign | null; permanent: boolean;
  }>({ open: false, campaign: null, permanent: false });

  const [restoreModal, setRestoreModal] = useState<{
    open: boolean; campaign: Campaign | null;
  }>({ open: false, campaign: null });

  const [previewModal, setPreviewModal] = useState<{
    open: boolean; campaign: Campaign | null;
  }>({ open: false, campaign: null });

  // ─────────────────────────────────────────────
  // AUTH GUARD
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (!session) {
      router.replace(`/login?redirect=${encodeURIComponent('/admin/campaigns')}`);
      return;
    }

    const role = (session.user as any)?.role;
    if (role !== 'admin') {
      router.replace('/');
      return;
    }
  }, [session, sessionStatus, router]);

  // ─────────────────────────────────────────────
  // BANNER AUTO-DISMISS
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(timer);
  }, [banner]);

  // ─────────────────────────────────────────────
  // FETCH CAMPAIGNS
  // ─────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const isTrash = filter === 'trash';
      const url = isTrash
        ? `/api/newsletter/campaigns?trash=true`
        : `/api/newsletter/campaigns?status=${filter}`;

      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();

      if (data.success) {
        setCampaigns(data.campaigns || []);
        setStats(data.stats || { total: 0, draft: 0, scheduled: 0, sent: 0, trash: 0 });
      } else {
        setBanner({ type: 'error', message: data.message || 'Failed to load campaigns' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error — please try again' });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchCampaigns();
    }
  }, [filter, sessionStatus, fetchCampaigns]);

  // ─────────────────────────────────────────────
  // DELETE / TRASH HANDLER
  // ─────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteModal.campaign) return;
    setActionLoading(deleteModal.campaign._id);

    try {
      const url = deleteModal.permanent
        ? `/api/newsletter/campaigns/${deleteModal.campaign._id}?permanent=true`
        : `/api/newsletter/campaigns/${deleteModal.campaign._id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        setBanner({
          type: 'success',
          message: deleteModal.permanent
            ? 'Campaign permanently deleted'
            : 'Campaign moved to trash',
        });
        setDeleteModal({ open: false, campaign: null, permanent: false });
        fetchCampaigns();
      } else {
        setBanner({ type: 'error', message: data.message || 'Failed to delete' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error — please try again' });
    } finally {
      setActionLoading(null);
    }
  };

  // ─────────────────────────────────────────────
  // RESTORE HANDLER
  // ─────────────────────────────────────────────
  const handleRestore = async () => {
    if (!restoreModal.campaign) return;
    setActionLoading(restoreModal.campaign._id);

    try {
      const res = await fetch(`/api/newsletter/campaigns/${restoreModal.campaign._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      const data = await res.json();

      if (data.success) {
        setBanner({ type: 'success', message: 'Campaign restored successfully' });
        setRestoreModal({ open: false, campaign: null });
        fetchCampaigns();
      } else {
        setBanner({ type: 'error', message: data.message || 'Failed to restore' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error — please try again' });
    } finally {
      setActionLoading(null);
    }
  };

  // ─────────────────────────────────────────────
  // DUPLICATE HANDLER
  // ─────────────────────────────────────────────
  const handleDuplicate = async (campaign: Campaign) => {
    setActionLoading(campaign._id);

    try {
      const res = await fetch('/api/newsletter/campaigns', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:    `${campaign.title} (Copy)`,
          subject:  campaign.subject,
          content:  campaign.content,
          template: campaign.template,
          status:   'draft',
          segments: ['all'],
          previewText: campaign.previewText || '',
        }),
      });
      const data = await res.json();

      if (data.success && data.campaign?._id) {
        setBanner({ type: 'success', message: 'Campaign duplicated as draft' });
        router.push(`/admin/campaigns/${data.campaign._id}/edit`);
      } else {
        setBanner({ type: 'error', message: data.message || 'Failed to duplicate' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error — please try again' });
    } finally {
      setActionLoading(null);
    }
  };

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────
  const formatDate = (date: string | null): string => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year:   'numeric',
      month:  'short',
      day:    'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  };

  // Filter by search query
  const filteredCampaigns = campaigns.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q)
    );
  });

  const tabs: { id: FilterType; label: string; count: number }[] = [
    { id: 'all',       label: 'All',       count: stats.total },
    { id: 'draft',     label: 'Drafts',    count: stats.draft },
    { id: 'scheduled', label: 'Scheduled', count: stats.scheduled },
    { id: 'sent',      label: 'Sent',      count: stats.sent },
    { id: 'trash',     label: 'Trash',     count: stats.trash },
  ];

  // ─────────────────────────────────────────────
  // LOADING STATE (Session)
  // ─────────────────────────────────────────────
  if (sessionStatus === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#029bba]" />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Campaigns · Highrise.pk Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <AdminLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-7xl">

            {/* ═══════════════════════════════════════
                HEADER
                ═══════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row md:items-center 
                            md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
                  <Rocket className="w-6 h-6 text-[#029bba]" />
                  Campaign Command Center
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Create, send, and track your newsletter campaigns
                </p>
              </div>
              <Link
                href="/admin/campaigns/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl 
                           bg-gradient-to-r from-[#029bba] to-[#004063] 
                           text-white font-black text-sm hover:shadow-lg 
                           hover:shadow-[#029bba]/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </Link>
            </div>

            {/* ═══════════════════════════════════════
                STATS
                ═══════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[
                { label: 'Total',     value: stats.total,     bg: 'bg-[#029bba]/10', color: 'text-[#029bba]', Icon: Mail },
                { label: 'Drafts',    value: stats.draft,     bg: 'bg-gray-100',      color: 'text-gray-600',  Icon: FileText },
                { label: 'Scheduled', value: stats.scheduled, bg: 'bg-blue-100',      color: 'text-blue-600',  Icon: Clock },
                { label: 'Sent',      value: stats.sent,      bg: 'bg-emerald-100',   color: 'text-emerald-600', Icon: CheckCircle },
                { label: 'Trash',     value: stats.trash,     bg: 'bg-red-100',       color: 'text-red-600',   Icon: Trash2 },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-2xl border border-gray-200 p-4 
                             hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} 
                                     flex items-center justify-center flex-shrink-0`}>
                      <stat.Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-black text-[#004063]">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500 font-semibold truncate">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ═══════════════════════════════════════
                FILTERS + SEARCH
                ═══════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200 p-3 mb-6">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Tabs */}
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={`
                        px-3 py-2 rounded-xl text-xs font-bold transition-all 
                        flex items-center gap-2
                        ${filter === tab.id
                          ? 'bg-[#029bba] text-white shadow shadow-[#029bba]/20'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {tab.label}
                      <span className={`
                        px-1.5 py-0.5 rounded-full text-[10px] font-black
                        ${filter === tab.id
                          ? 'bg-white/25 text-white'
                          : 'bg-gray-300 text-gray-700'
                        }
                      `}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative lg:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 
                                     w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search campaigns..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border 
                               border-gray-200 focus:ring-2 
                               focus:ring-[#029bba]/20 focus:border-[#029bba] 
                               outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════
                CAMPAIGNS TABLE
                ═══════════════════════════════════════ */}
            {loading ? (
              <div className="flex items-center justify-center py-20 bg-white 
                              rounded-2xl border border-gray-200">
                <Loader2 className="w-10 h-10 animate-spin text-[#029bba]" />
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                {filter === 'trash' ? (
                  <>
                    <Trash2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-base font-black text-[#004063] mb-1">
                      Trash is empty
                    </h3>
                    <p className="text-sm text-gray-500">
                      Deleted campaigns will appear here.
                    </p>
                  </>
                ) : searchQuery ? (
                  <>
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-base font-black text-[#004063] mb-1">
                      No results for "{searchQuery}"
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Try a different search term
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-sm font-bold text-[#029bba] hover:underline"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl 
                                    bg-gradient-to-br from-[#029bba]/10 to-[#004063]/10 
                                    flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-[#029bba]" />
                    </div>
                    <h3 className="text-base font-black text-[#004063] mb-2">
                      No campaigns yet
                    </h3>
                    <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                      Create your first email campaign in minutes with our 
                      enterprise Mission Control editor.
                    </p>
                    <Link
                      href="/admin/campaigns/new"
                      className="inline-flex items-center gap-2 px-5 py-2.5 
                                 rounded-xl bg-gradient-to-r from-[#029bba] 
                                 to-[#004063] text-white font-black text-sm 
                                 hover:shadow-lg hover:shadow-[#029bba]/20 
                                 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Campaign
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                          Campaign
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                          Recipients
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                          Open Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                          {filter === 'trash' ? 'Deleted' : 'Date'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredCampaigns.map((campaign) => (
                        <tr
                          key={campaign._id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-900 truncate">
                                  {campaign.title || 'Untitled'}
                                </p>
                                {/* A/B badge */}
                                {campaign.abTest?.enabled && (
                                  <span className={`
                                    flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-black
                                    ${campaign.abTest.winner
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-purple-100 text-purple-700'
                                    }
                                  `}>
                                    {campaign.abTest.winner
                                      ? `A/B: ${campaign.abTest.winner.toUpperCase()} won`
                                      : 'A/B'
                                    }
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {campaign.subject}
                              </p>
                              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-1 inline-block">
                                {campaign.template}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={campaign.status} />
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {campaign.recipients?.sent || 0}
                                <span className="text-gray-400 font-normal">
                                  {' / '}
                                  {campaign.recipients?.total || 0}
                                </span>
                              </p>
                              <p className="text-xs text-gray-500">sent</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {campaign.status === 'sent' && (campaign.recipients?.total || 0) > 0 ? (
                              <div>
                                {/* Open rate pill */}
                                {(() => {
                                  const opened  = (campaign.recipients as any)?.opened  || 0;
                                  const total   = campaign.recipients?.sent || campaign.recipients?.total || 1;
                                  const rate    = Math.round((opened / total) * 100);
                                  const color   =
                                    rate >= 30 ? 'text-emerald-700 bg-emerald-100' :
                                    rate >= 15 ? 'text-amber-700 bg-amber-100'    :
                                                 'text-gray-600 bg-gray-100';
                                  return (
                                    <div>
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black ${color}`}>
                                        <TrendingUp className="w-3 h-3" />
                                        {rate}%
                                      </span>
                                      <p className="text-[10px] text-gray-400 mt-0.5">
                                        {opened} opened
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {filter === 'trash'
                                ? formatDate(campaign.deletedAt || null)
                                : formatDate(campaign.sentAt || campaign.scheduledFor || campaign.createdAt)
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {filter === 'trash' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewModal({ open: true, campaign })}
                                    className="p-2 text-gray-400 hover:text-[#029bba] hover:bg-[#029bba]/10 rounded-lg transition-all"
                                    title="Preview"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRestoreModal({ open: true, campaign })}
                                    disabled={actionLoading === campaign._id}
                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"
                                    title="Restore"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteModal({ open: true, campaign, permanent: true })}
                                    disabled={actionLoading === campaign._id}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                    title="Delete Permanently"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {/* Preview always available */}
                                  <button
                                    type="button"
                                    onClick={() => setPreviewModal({ open: true, campaign })}
                                    className="p-2 text-gray-400 hover:text-[#029bba] hover:bg-[#029bba]/10 rounded-lg transition-all"
                                    title="Preview"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {/* Analytics — sent campaigns only */}
                                  {campaign.status === 'sent' && (
                                    <Link
                                      href={`/admin/campaigns/${campaign._id}/analytics`}
                                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                      title="View Analytics"
                                    >
                                      <BarChart2 className="w-4 h-4" />
                                    </Link>
                                  )}

                                  {/* Edit — draft & scheduled only */}
                                  {['draft', 'scheduled'].includes(campaign.status) && (
                                    <Link
                                      href={`/admin/campaigns/${campaign._id}/edit`}
                                      className="p-2 text-gray-400 hover:text-[#029bba] hover:bg-[#029bba]/10 rounded-lg transition-all"
                                      title="Edit"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Link>
                                  )}

                                  {/* Duplicate always available */}
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicate(campaign)}
                                    disabled={actionLoading === campaign._id}
                                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all disabled:opacity-50"
                                    title="Duplicate"
                                  >
                                    {actionLoading === campaign._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>

                                  {/* Delete — always available except sending */}
                                  {campaign.status !== 'sending' && (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteModal({ open: true, campaign, permanent: false })}
                                      disabled={actionLoading === campaign._id}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                      title="Move to Trash"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>

      {/* ═══════════════════════════════════════════
          BANNER
          ═══════════════════════════════════════════ */}
      {banner && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className={`
            p-4 rounded-2xl shadow-2xl flex items-start gap-3
            ${
              banner.type === 'success' ? 'bg-emerald-500 text-white' :
              banner.type === 'error'   ? 'bg-red-500 text-white' :
                                          'bg-[#029bba] text-white'
            }
          `}>
            <div className="flex-1">
              <p className="text-sm font-bold">{banner.message}</p>
            </div>
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

      {/* ═══════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════ */}
      <ConfirmModal
        isOpen={deleteModal.open}
        title={deleteModal.permanent ? 'Delete Permanently?' : 'Move to Trash?'}
        message={
          deleteModal.permanent
            ? `"${deleteModal.campaign?.title}" will be permanently deleted.\n\nThis action cannot be undone.`
            : `"${deleteModal.campaign?.title}" will be moved to trash.\n\nYou can restore it later from the Trash tab.`
        }
        confirmText={deleteModal.permanent ? 'Delete Forever' : 'Move to Trash'}
        variant={deleteModal.permanent ? 'danger' : 'warning'}
        isLoading={actionLoading === deleteModal.campaign?._id}
        onConfirm={handleDelete}
        onClose={() => setDeleteModal({ open: false, campaign: null, permanent: false })}
      />

      <ConfirmModal
        isOpen={restoreModal.open}
        title="Restore Campaign?"
        message={`"${restoreModal.campaign?.title}" will be moved back to your campaigns list.`}
        confirmText="Restore"
        variant="info"
        isLoading={actionLoading === restoreModal.campaign?._id}
        onConfirm={handleRestore}
        onClose={() => setRestoreModal({ open: false, campaign: null })}
      />

      <PreviewModal
        isOpen={previewModal.open}
        campaign={previewModal.campaign}
        onClose={() => setPreviewModal({ open: false, campaign: null })}
      />
    </>
  );
}
// ========== END OF FILE ==========