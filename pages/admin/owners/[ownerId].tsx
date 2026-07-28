// ========== FILE: pages/admin/owners/[ownerId].tsx ==========
// Highrise.pk — Admin: Owner Detail + Review Page
// V1.1.0 — Matches API response shape exactly (flat, not nested)
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Mail,
  Phone,
  MapPin,
  IdCard,
  Calendar,
  Home,
  FileText,
  Image as ImageIcon,
  Eye,
  X,
  Ban,
  MessageCircle,
  Info,
  Shield,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ═══════════════════════════════════════════
// TYPES — matching API exactly (flat structure at data.data)
// ═══════════════════════════════════════════

interface PopulatedUser {
  _id?:               string;
  name?:              string;
  email?:             string;
  profilePictureUrl?: string;
  createdAt?:         string;
  lastLoginAt?:       string;
  status?:            string;
}

interface AuditEntry {
  action:      string;
  performedBy: string | { _id?: string; name?: string; email?: string };
  performedAt: string;
  note?:       string;
  changes?:    Record<string, unknown>;
}

// API returns FLAT at data.data (not nested in "owner")
interface OwnerDetail {
  id:                    string;
  slug?:                 string;
  displayName:           string;
  about?:                string;

  // Decrypted (admin only)
  cnic:                  string;
  maskedCnic?:           string;
  phone:                 string;
  maskedPhone?:          string;
  email:                 string;

  city:                  string;
  address?:              string;

  // Documents
  documents?: {
    cnicFront?:      { url: string; publicId?: string; uploadedAt?: string };
    cnicBack?:       { url: string; publicId?: string; uploadedAt?: string };
    selfieWithCnic?: { url: string; publicId?: string; uploadedAt?: string };
  };

  // Status
  status:                string;
  verificationLevel?:    string;
  cnicVerified?:         boolean;
  cnicVerifiedAt?:       string | null;
  cnicLockedAt?:         string | null;
  verifiedAt?:           string | null;
  verifiedBy?:           PopulatedUser | string | null;
  submittedForReviewAt?: string | null;

  // Rejection
  rejectionReason?:      string | null;
  rejectedAt?:           string | null;
  rejectedBy?:           PopulatedUser | string | null;

  // Info required
  infoRequiredReason?:   string | null;
  infoRequiredAt?:       string | null;

  // Suspension
  suspensionReason?:     string | null;
  suspendedAt?:          string | null;
  suspendedBy?:          PopulatedUser | string | null;

  // Listing limits
  maxListings?:          number;
  activeListingsCount?:  number;
  totalListingsCount?:   number;

  // Metadata
  memberSince?:          string;
  lastActivityAt?:       string;
  createdAt:             string;
  updatedAt?:            string;

  // Populated user
  user?: PopulatedUser | null;

  // Audit trail
  auditTrail?: AuditEntry[];
}

interface ApiResponse {
  success:  boolean;
  message?: string;
  data?:    OwnerDetail;   // ← FLAT, not wrapped in "owner"
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-PK', {
      day:    'numeric',
      month:  'short',
      year:   'numeric',
      hour:   'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function getPopulatedName(v: PopulatedUser | string | null | undefined): string {
  if (!v) return 'System';
  if (typeof v === 'string') return v;
  return v.name || v.email || 'Unknown';
}

function getStatusColor(status: string): { text: string; bg: string; border: string; textDeep: string } {
  const map: Record<string, { text: string; bg: string; border: string; textDeep: string }> = {
    pending:       { text: 'text-[#029bba]',   bg: 'bg-[#029bba]/10', border: 'border-[#029bba]/20', textDeep: 'text-[#004063]' },
    approved:      { text: 'text-emerald-700', bg: 'bg-emerald-50',   border: 'border-emerald-200',  textDeep: 'text-emerald-900' },
    rejected:      { text: 'text-red-700',     bg: 'bg-red-50',       border: 'border-red-200',      textDeep: 'text-red-900' },
    suspended:     { text: 'text-orange-700',  bg: 'bg-orange-50',    border: 'border-orange-200',   textDeep: 'text-orange-900' },
    info_required: { text: 'text-amber-700',   bg: 'bg-amber-50',     border: 'border-amber-200',    textDeep: 'text-amber-900' },
    draft:         { text: 'text-gray-600',    bg: 'bg-gray-50',      border: 'border-gray-200',     textDeep: 'text-gray-800' },
  };
  return map[status] ?? map['draft'];
}

// ═══════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════

function ImageLightbox({
  url,
  label,
  onClose,
}: {
  url:     string;
  label:   string;
  onClose: () => void;
}): React.ReactElement {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="max-w-5xl max-h-[90vh] flex flex-col items-center">
        <p className="text-white text-sm font-semibold mb-3">{label}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-white/70 hover:text-white text-xs font-semibold"
        >
          Open in new tab →
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DOCUMENT CARD
// ═══════════════════════════════════════════

function DocumentCard({
  label,
  document,
  onView,
}: {
  label:    string;
  document?: { url: string; uploadedAt?: string };
  onView:   () => void;
}): React.ReactElement {
  if (!document?.url) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50">
        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-[10px] text-gray-400 mt-1">Not uploaded</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden group cursor-pointer hover:border-[#029bba] transition-colors">
      <div
        className="relative aspect-[4/3] bg-gray-100 overflow-hidden"
        onClick={onView}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={document.url}
          alt={label}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="text-white text-sm font-semibold inline-flex items-center gap-2">
            <Eye className="w-4 h-4" />
            View Full Size
          </div>
        </div>
      </div>
      <div className="p-3 bg-white">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        {document.uploadedAt && (
          <p className="text-[10px] text-gray-500 mt-0.5">
            Uploaded {formatDateTime(document.uploadedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export default function AdminOwnerDetailPage(): React.ReactElement {
  const router = useRouter();
  const { ownerId } = router.query;

  const [owner, setOwner] = useState<OwnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState<null | 'approve' | 'reject' | 'suspend'>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  // ── Fetch owner ─────────────────────────────
  const fetchOwner = useCallback(async () => {
    if (typeof ownerId !== 'string') return;
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/owners/${ownerId}`, {
        credentials: 'include',
      });
      const data = (await res.json()) as ApiResponse;

      if (!res.ok || !data.success || !data.data) {
        setErrorMsg(data.message ?? 'Failed to load owner details');
        return;
      }

      // API returns FLAT data.data (not data.data.owner)
      setOwner(data.data);
    } catch {
      setErrorMsg('Network error');
    }
  }, [ownerId]);

  useEffect(() => {
    if (ownerId) {
      setLoading(true);
      void fetchOwner().finally(() => setLoading(false));
    }
  }, [ownerId, fetchOwner]);

  // ── Action handlers ─────────────────────────
  const handleApprove = async () => {
    if (typeof ownerId !== 'string') return;
    if (!confirm('Approve this owner verification?\n\nThey will receive an email and be able to list up to 10 properties.')) return;

    setActionLoading('approve');
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/owners/${ownerId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('✅ Owner approved successfully!');
        await fetchOwner();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.message ?? 'Approval failed');
      }
    } catch {
      setErrorMsg('Network error during approval');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (typeof ownerId !== 'string') return;
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      setErrorMsg('Rejection reason must be at least 10 characters');
      return;
    }

    setActionLoading('reject');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/owners/${ownerId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('❌ Owner rejected. Notification sent.');
        setShowRejectModal(false);
        setRejectReason('');
        await fetchOwner();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.message ?? 'Rejection failed');
      }
    } catch {
      setErrorMsg('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async () => {
    if (typeof ownerId !== 'string') return;
    if (!suspendReason.trim() || suspendReason.trim().length < 10) {
      setErrorMsg('Suspension reason must be at least 10 characters');
      return;
    }

    setActionLoading('suspend');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/owners/${ownerId}/suspend`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('⚠️ Owner suspended. All listings hidden.');
        setShowSuspendModal(false);
        setSuspendReason('');
        await fetchOwner();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.message ?? 'Suspension failed');
      }
    } catch {
      setErrorMsg('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading state ─────────────────────────
  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading owner details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!owner) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <XCircle className="w-12 h-12 text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Owner not found</h2>
          <p className="text-sm text-gray-500 mb-6">{errorMsg || 'Invalid owner ID'}</p>
          <Link href="/admin/owners">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const statusColor = getStatusColor(owner.status);
  const canApprove   = ['pending', 'info_required'].includes(owner.status);
  const canReject    = ['pending', 'info_required', 'approved'].includes(owner.status);
  const canSuspend   = owner.status === 'approved';

  const cleanPhone = String(owner.phone || '').replace(/\D/g, '');

  return (
    <>
      <Head>
        <title>{owner.displayName} | Owner Review | Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminLayout>
        <div className="space-y-6">

          {/* ── Breadcrumb ── */}
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/admin/owners"
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#029bba] transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Verified Owners
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-semibold">{owner.displayName}</span>
          </div>

          {/* ── Success/Error ── */}
          {successMsg && (
            <div className="flex items-center gap-3 p-4 border-l-4 border-emerald-500 bg-emerald-50 rounded-r-xl">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-800">{successMsg}</p>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-3 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-xl">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* ── Header Card ── */}
          <div className={cx('rounded-2xl border-2 p-6', statusColor.bg, statusColor.border)}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0" style={{ color: '#029bba' }}>
                  {(owner.displayName || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className={cx('text-2xl font-bold', statusColor.textDeep)}>
                      {owner.displayName}
                    </h1>
                    <span className={cx(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold uppercase',
                      statusColor.text, statusColor.bg
                    )}>
                      {owner.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {owner.email}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {owner.phone}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {owner.city}
                    </span>
                  </div>
                  {owner.submittedForReviewAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Submitted {formatDateTime(owner.submittedForReviewAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact user */}
              <div className="flex gap-2 flex-shrink-0">
                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                )}
                <a
                  href={`mailto:${owner.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:border-[#029bba] hover:text-[#029bba] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </a>
              </div>
            </div>
          </div>

          {/* ── Two Column Layout ── */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── LEFT: Details + Documents ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Verification Details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-[#029bba]" />
                    Verification Details
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name</p>
                      <p className="text-sm font-medium text-gray-900">{owner.displayName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">CNIC Number</p>
                      <p className="text-sm font-mono font-medium text-gray-900">{owner.cnic || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{owner.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">City</p>
                      <p className="text-sm font-medium text-gray-900">{owner.city || '—'}</p>
                    </div>
                    {owner.address && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</p>
                        <p className="text-sm font-medium text-gray-900">{owner.address}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">CNIC Locked</p>
                      <p className="text-sm font-medium text-gray-900">
                        {owner.cnicLockedAt ? formatDateTime(owner.cnicLockedAt) : 'Not locked'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Account Created</p>
                      <p className="text-sm font-medium text-gray-900">{formatDateTime(owner.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CNIC Documents */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#029bba]" />
                    CNIC Documents
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click any image to view full-size
                  </p>
                </div>
                <div className="p-6 grid sm:grid-cols-2 gap-4">
                  <DocumentCard
                    label="CNIC Front"
                    document={owner.documents?.cnicFront}
                    onView={() => owner.documents?.cnicFront?.url && setLightbox({
                      url:   owner.documents.cnicFront.url,
                      label: 'CNIC Front',
                    })}
                  />
                  <DocumentCard
                    label="CNIC Back"
                    document={owner.documents?.cnicBack}
                    onView={() => owner.documents?.cnicBack?.url && setLightbox({
                      url:   owner.documents.cnicBack.url,
                      label: 'CNIC Back',
                    })}
                  />
                  {owner.documents?.selfieWithCnic?.url && (
                    <div className="sm:col-span-2">
                      <DocumentCard
                        label="Selfie with CNIC (Optional)"
                        document={owner.documents.selfieWithCnic}
                        onView={() => owner.documents?.selfieWithCnic?.url && setLightbox({
                          url:   owner.documents.selfieWithCnic.url,
                          label: 'Selfie with CNIC',
                        })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Checklist */}
              {['pending', 'info_required'].includes(owner.status) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#029bba]" />
                      Verification Checklist
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Review each item before approval
                    </p>
                  </div>
                  <div className="p-6 space-y-3">
                    {[
                      'CNIC front image is clear and fully readable',
                      'CNIC back image is clear and fully readable',
                      'Name on form matches name on CNIC',
                      'CNIC number is valid (13 digits, no tampering)',
                      'CNIC is not expired (check expiry date)',
                      'Phone number appears valid (Pakistani format)',
                      'No signs of forgery or photo manipulation',
                    ].map((item, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 accent-[#029bba]"
                        />
                        <span className="text-sm text-gray-700">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Trail */}
              {owner.auditTrail && owner.auditTrail.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#029bba]" />
                      Audit Trail
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {owner.auditTrail.slice().reverse().map((entry, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-2 h-2 rounded-full bg-[#029bba] flex-shrink-0 mt-1.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {(entry.action || '').replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              by {getPopulatedName(entry.performedBy)}
                              {' · '}
                              {formatDateTime(entry.performedAt)}
                            </p>
                            {entry.note && (
                              <p className="text-xs text-gray-600 mt-1 italic">
                                &ldquo;{entry.note}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Actions Sidebar ── */}
            <div className="space-y-6">

              {/* Action Panel */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900">Actions</h2>
                </div>
                <div className="p-5 space-y-3">
                  {canApprove && (
                    <button
                      type="button"
                      onClick={() => void handleApprove()}
                      disabled={!!actionLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
                    >
                      {actionLoading === 'approve' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Approve Verification
                        </>
                      )}
                    </button>
                  )}

                  {canReject && (
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={!!actionLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Verification
                    </button>
                  )}

                  {canSuspend && (
                    <button
                      type="button"
                      onClick={() => setShowSuspendModal(true)}
                      disabled={!!actionLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
                    >
                      <Ban className="w-4 h-4" />
                      Suspend Account
                    </button>
                  )}

                  {!canApprove && !canReject && !canSuspend && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No actions available for this status
                    </p>
                  )}
                </div>
              </div>

              {/* Status Info */}
              {owner.status === 'approved' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-emerald-900">
                        Approved
                      </p>
                      {owner.verifiedAt && (
                        <p className="text-xs text-emerald-800 mt-1">
                          {formatDateTime(owner.verifiedAt)}
                        </p>
                      )}
                      {owner.verifiedBy && (
                        <p className="text-xs text-emerald-700 mt-1">
                          by {getPopulatedName(owner.verifiedBy)}
                        </p>
                      )}
                      <div className="mt-3 pt-3 border-t border-emerald-200">
                        <p className="text-xs font-semibold text-emerald-800">
                          Listings: {owner.activeListingsCount ?? 0} / {owner.maxListings ?? 10}
                        </p>
                        {typeof owner.totalListingsCount === 'number' && (
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Total created: {owner.totalListingsCount}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {owner.status === 'rejected' && owner.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-900">
                        Rejected
                      </p>
                      {owner.rejectedAt && (
                        <p className="text-xs text-red-800 mt-1">
                          {formatDateTime(owner.rejectedAt)}
                        </p>
                      )}
                      <p className="text-xs text-red-800 mt-2 font-medium">
                        Reason:
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        {owner.rejectionReason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {owner.status === 'suspended' && owner.suspensionReason && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-orange-900">
                        Suspended
                      </p>
                      {owner.suspendedAt && (
                        <p className="text-xs text-orange-800 mt-1">
                          {formatDateTime(owner.suspendedAt)}
                        </p>
                      )}
                      <p className="text-xs text-orange-800 mt-2 font-medium">
                        Reason:
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
                        {owner.suspensionReason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Guidelines */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-semibold mb-1.5">Approval Guidelines</p>
                    <ul className="space-y-0.5 text-blue-700">
                      <li>• Verify all details before approval</li>
                      <li>• Approved users get 10 listings</li>
                      <li>• They earn Verified Owner badge</li>
                      <li>• Rejection needs 10+ char reason</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── LIGHTBOX ── */}
        {lightbox && (
          <ImageLightbox
            url={lightbox.url}
            label={lightbox.label}
            onClose={() => setLightbox(null)}
          />
        )}

        {/* ── REJECT MODAL ── */}
        {showRejectModal && (
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !actionLoading && setShowRejectModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Reject Verification
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    User will be notified with the reason below
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Rejection Reason (min 10 characters)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. CNIC image is unclear. Please resubmit with a clearer photo showing all corners."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-1 text-right">
                {rejectReason.length} / 500
              </p>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={!!actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleReject()}
                  disabled={!!actionLoading || rejectReason.trim().length < 10}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {actionLoading === 'reject' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Confirm Reject
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SUSPEND MODAL ── */}
        {showSuspendModal && (
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !actionLoading && setShowSuspendModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Ban className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Suspend Account
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    All active listings will be hidden immediately
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Suspension Reason (min 10 characters)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Multiple fraudulent listings detected. Investigation in progress."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none"
              />

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  disabled={!!actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSuspend()}
                  disabled={!!actionLoading || suspendReason.trim().length < 10}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {actionLoading === 'suspend' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Suspending...
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      Confirm Suspend
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

// ========== END OF FILE ==========