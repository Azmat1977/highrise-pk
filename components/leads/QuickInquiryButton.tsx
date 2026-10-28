// ========== FILE: components/leads/QuickInquiryButton.tsx ==========
// Highrise.pk — Smart Quick Inquiry Button
// V6.9.0 — Social Login Lead Capture
// ═══════════════════════════════════════════════════════════════
// Drop-in button that handles 4 states automatically:
//   1. Not logged in         → redirects to /login?redirect=<current>
//   2. Logged in, phone OK   → 1-click confirm modal → creates lead
//   3. Logged in, no phone   → PhoneCaptureModal → creates lead after verify
//   4. Logged in, unverified → PhoneCaptureModal → creates lead after verify
//
// Usage:
//   <QuickInquiryButton
//     projectId={project._id}          // OR propertyId
//     entityTitle={project.projectName}
//     leadType="project_interest"
//     source="project_page"
//   />
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Phone, CheckCircle2, AlertCircle, Loader2, X,
  MessageSquare, Send, Bot, Shield, User, Mail,
} from 'lucide-react';
import PhoneCaptureModal from './PhoneCaptureModal';

// ─── Types ────────────────────────────────────────────────────

interface QuickInquiryButtonProps {
  // Entity (one required)
  projectId?:  string;
  propertyId?: string;

  // Display
  entityTitle: string;                // "DHA Phase 5 Villa"

  // Lead classification
  leadType?:  'project_interest' | 'call_back' | 'site_visit'
            | 'brochure_download' | 'payment_plan' | 'general_inquiry'
            | 'property_inquiry'  | 'property_viewing' | 'make_offer'
            | 'rent_inquiry';
  source?:    'project_page' | 'property_page' | 'listing_page'
            | 'search_results' | 'developer_profile' | 'agent_profile'
            | 'direct' | 'referral' | 'whatsapp' | 'call';

  // Optional pre-filled message
  defaultMessage?: string;

  // Styling
  variant?:    'primary' | 'outline' | 'ghost';
  size?:       'sm' | 'md' | 'lg';
  fullWidth?:  boolean;
  className?:  string;
  buttonText?: string;
  icon?:       React.ReactNode;
}

interface BannerState {
  type:    'success' | 'error';
  message: string;
}

// ─── Component ────────────────────────────────────────────────

export default function QuickInquiryButton({
  projectId,
  propertyId,
  entityTitle,
  leadType       = 'project_interest',
  source         = 'project_page',
  defaultMessage = '',
  variant        = 'primary',
  size           = 'md',
  fullWidth      = false,
  className      = '',
  buttonText     = 'Send Inquiry',
  icon,
}: QuickInquiryButtonProps): React.ReactElement {

  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  // ── State ────────────────────────────────────────────────
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal]     = useState(false);
  const [submitting, setSubmitting]             = useState(false);
  const [message, setMessage]                   = useState(defaultMessage);
  const [banner, setBanner]                     = useState<BannerState | null>(null);
  const [inquirySent, setInquirySent]           = useState(false);

  // ── Show banner (5 sec auto-dismiss) ─────────────────────
  const showBanner = (type: BannerState['type'], msg: string) => {
    setBanner({ type, message: msg });
    setTimeout(() => setBanner(null), 5000);
  };

  // ── Button Click Handler ─────────────────────────────────
  const handleClick = () => {
    // Case 1: Not logged in → redirect to login
    if (authStatus === 'unauthenticated' || !session) {
      const currentUrl = router.asPath;
      void router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // Case 2: Logged in but no phone OR unverified → phone modal
    if (!session.user?.phoneNumber || !session.user?.isPhoneVerified) {
      setShowPhoneModal(true);
      return;
    }

    // Case 3: Fully verified → show confirmation modal
    setShowConfirmModal(true);
  };

  // ── Phone Verification Success ───────────────────────────
  // After PhoneCaptureModal succeeds, auto-submit the lead
  const handlePhoneVerified = () => {
    setShowPhoneModal(false);
    // Small delay for smooth UX transition
    setTimeout(() => {
      void submitLead();
    }, 300);
  };

  // ── Submit Lead (calls /api/leads/quick) ────────────────
  const submitLead = async () => {
    setSubmitting(true);

    try {
      const res = await fetch('/api/leads/quick', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          propertyId,
          leadType,
          source,
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setInquirySent(true);
        showBanner('success', 'Inquiry sent! You will be contacted soon.');
        setShowConfirmModal(false);
      } else {
        showBanner('error', data.message || 'Failed to send inquiry.');
      }
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Button Style Config ──────────────────────────────────
  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  const variantClasses = {
    primary: 'bg-[#029bba] text-white hover:bg-[#027a94] shadow-sm shadow-[#029bba]/20',
    outline: 'bg-white text-[#029bba] border-2 border-[#029bba] hover:bg-[#029bba]/5',
    ghost:   'bg-transparent text-[#029bba] hover:bg-[#029bba]/10',
  };

  const buttonClasses = `
    inline-flex items-center justify-center gap-2 font-bold rounded-xl
    transition-all disabled:opacity-60 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      {/* ── Main Button ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleClick}
        disabled={authStatus === 'loading' || inquirySent}
        className={buttonClasses}
      >
        {authStatus === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : inquirySent ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Inquiry Sent
          </>
        ) : (
          <>
            {icon || <Send className="w-4 h-4" />}
            {buttonText}
          </>
        )}
      </button>

      {/* ── Banner Notification ────────────────────────────── */}
      {banner && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[600]
          flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border
          backdrop-blur-sm max-w-sm w-full mx-4
          ${banner.type === 'success'
            ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
            : 'bg-red-50/95 border-red-200 text-red-800'}`}>
          {banner.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 shrink-0" />
            : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-semibold flex-1">{banner.message}</span>
          <button onClick={() => setBanner(null)} className="p-1 hover:bg-black/5 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Phone Capture Modal ─────────────────────────────── */}
      <PhoneCaptureModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={handlePhoneVerified}
        title="Verify Phone to Send Inquiry"
        subtitle={`Just one step to inquire about "${entityTitle}"`}
      />

      {/* ── Confirmation Modal (Phone already verified) ────── */}
      {showConfirmModal && session?.user && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={submitting ? undefined : () => setShowConfirmModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10
            border border-gray-100 overflow-hidden">

            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#029bba] to-[#004063] text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Confirm Inquiry</h3>
                    <p className="text-xs text-white/80">Review before sending</p>
                  </div>
                </div>
                {!submitting && (
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">

              {/* Entity Info */}
              <div className="bg-[#029bba]/5 border border-[#029bba]/20 rounded-xl p-3">
                <p className="text-[10px] font-bold text-[#029bba] uppercase tracking-wider mb-1">
                  Inquiring About
                </p>
                <p className="text-sm font-bold text-gray-900">{entityTitle}</p>
              </div>

              {/* Your Details (readonly) */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Your Details
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate">
                      {session.user.name}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate">
                      {session.user.email}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">
                      {session.user.phoneNumber}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Message */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Message <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add any specific questions or requirements..."
                  rows={3}
                  maxLength={500}
                  disabled={submitting}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]
                    resize-none transition-colors disabled:opacity-50"
                />
                <p className="text-[11px] text-gray-400 mt-1 text-right">
                  {message.length}/500
                </p>
              </div>

              {/* Privacy note */}
              <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Your details will only be shared with the verified developer/agent
                  for this specific inquiry.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="px-4 py-2.5 text-sm font-semibold text-gray-600
                  border border-gray-200 rounded-xl hover:bg-gray-100
                  transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitLead}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#029bba]
                  text-white rounded-xl text-sm font-bold hover:bg-[#027a94]
                  transition-colors disabled:opacity-60 shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Inquiry
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// ========== END OF FILE ==========