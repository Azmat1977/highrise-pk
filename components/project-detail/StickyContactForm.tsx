// components/project-detail/StickyContactForm.tsx
// ============================================================================
// HIGHRISE.PK — Sticky lead card (compact)
// Logo header · auth-gated phone · verified tooltip · cyan CTA · sticky
// ============================================================================

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Turnstile } from '@marsidev/react-turnstile';
import { ShieldCheck, Loader2, Send, Phone, Lock, X, MessageCircle } from 'lucide-react';
import LoginOrSignupForm from '@/components/auth/LoginOrSignupForm';

function normalizeWhatsAppPhone(phone: string): string {
  let clean = phone.replace(/[^\d+]/g, ''); // Keep only digits and +
  if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }
  if (clean.startsWith('00')) {
    clean = clean.slice(2);
  }
  if (clean.startsWith('03')) {
    clean = '92' + clean.slice(1);
  }
  if (clean.startsWith('3')) {
    clean = '92' + clean;
  }
  return clean;
}

interface StickyContactFormProps {
  projectId: string;
  projectName: string;
  developerName?: string;
  developerPhone?: string;
  isVerified?: boolean;
  /** 'project' | 'property' | 'listing' — used in verified tooltip copy */
  entityLabel?: 'project' | 'property' | 'listing';
}

export default function StickyContactForm({
  projectId,
  projectName,
  developerName,
  developerPhone,
  isVerified = false,
  entityLabel = 'project',
}: StickyContactFormProps) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: `I am interested in ${projectName} and would like to schedule a viewing. Please let me know when this would be possible.`,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Real-time WhatsApp Click Telemetry Tracking
  const handleWhatsAppClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const basePhone = developerPhone || '+92 333 5877106';
    const cleanPhone = normalizeWhatsAppPhone(basePhone);
    const text = `Assalam-o-Alaikum, I found the project "${projectName}" on Highrise.pk. I would like to inquire about unit options, pricing, and the latest payment schedule. Please share more details.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    // Fire background non-blocking telemetry event
    fetch('/api/analytics/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        eventType: 'click',
        campaignSource: 'whatsapp_sticky',
      }),
    }).catch((err) => console.error('[Telemetry Error]:', err));

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ─── Body Scroll Lock (Rule Set A) ───
  useEffect(() => {
    if (showAuthModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAuthModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please complete the security check.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'project',
          entityId: projectId,
          ...formData,
          turnstileToken: token,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || 'Failed to send inquiry.');
      }
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openLogin = () => {
    setShowAuthModal(true);
  };

  const entityWord =
    entityLabel === 'property' ? 'Property' : entityLabel === 'listing' ? 'Listing' : 'Project';

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* ─── Compact header (Highrise density) ─── */}
      <div className="px-5 pt-6 pb-5 border-b border-gray-100">
        {/* Column stack: Logo → Contact → Verified */}
        <div className="flex flex-col items-center gap-2">
          {/* Logo */}
          <Image
            src="/images/logo.png"
            alt="Highrise.pk"
            width={220}
            height={56}
            className="h-[64px] w-auto object-contain mb-1"
            priority
          />

          {/* Phone — auth gated */}
          {isLoggedIn ? (
            <div className="flex flex-col items-center gap-2 w-full">
              {developerPhone ? (
                <a
                  href={`tel:${developerPhone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-1.5 text-lg font-bold text-[#004063] hover:text-[#029bba] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#029bba]" />
                  {developerPhone}
                </a>
              ) : (
                <p className="text-xs text-gray-400">Phone not available</p>
              )}

                            <button
                  type="button"
                  onClick={handleWhatsAppClick}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#25D366] text-white rounded-xl font-bold text-[15px] shadow-md shadow-[#25D366]/20 hover:bg-[#128C7E] hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .092 5.403.089 11.961c-.002 2.095.545 4.14 1.583 5.945L.035 24l6.247-1.637a11.85 11.85 0 0 0 5.766 1.498h.004c6.556 0 11.96-5.403 11.963-11.961a11.83 11.83 0 0 0-3.551-8.402" />
                  </svg>
                  WhatsApp
                </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openLogin}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-[14px] font-bold text-[#029bba] border border-[#029bba]/40 rounded-full hover:bg-[#029bba]/5 hover:border-[#029bba] transition-colors"
            >
              <Lock className="w-3.5 h-3.5 opacity-70" />
              Contact Details
            </button>
          )}

          {/* Developer name only if not Highrise.pk */}
          {developerName && developerName.toLowerCase() !== 'highrise.pk' && (
            <p className="text-[12px] font-medium text-gray-500 -mt-1">{developerName}</p>
          )}

          {/* Verified badge + hover tooltip */}
          {isVerified && (
            <div className="relative inline-flex group">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md cursor-default">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified
            </span>
            {/* Tooltip */}
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 w-56 rounded-lg bg-[#001f2b] text-white text-[11px] font-medium leading-snug px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              This {entityWord} has been verified by the Highrise Team.
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#001f2b] rotate-45" />
            </span>
          </div>
          )}
        </div>
      </div>

      {/* ── Form ── */}
      {success ? (
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <h4 className="text-[15px] font-bold text-[#001f2b] mb-1">Inquiry Sent</h4>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            Our team will contact you shortly about this {entityWord.toLowerCase()}.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 space-y-2.5">
          {/* Name + Phone side by side */}
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-800 placeholder:text-gray-400 focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/30 outline-none"
            />
            <input
              type="tel"
              required
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-800 placeholder:text-gray-400 focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/30 outline-none"
            />
          </div>

          <input
            type="email"
            required
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-800 placeholder:text-gray-400 focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/30 outline-none"
          />

          <textarea
            required
            rows={3}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-800 placeholder:text-gray-400 focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/30 outline-none resize-none"
          />

          {error && (
            <p className="text-[11px] text-red-600 font-semibold bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

            {/* Turnstile — full width like message field (no extra wrapper border) */}
            <div className="w-full [&>div]:w-full [&_iframe]:w-full">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                onSuccess={setToken}
                options={{
                  theme: 'light',
                  size: 'flexible',
                }}
              />
            </div>

          {/* Brand cyan CTA — never red */}
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-[#029bba] hover:bg-[#027a94] text-white text-[13px] font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Check Availability
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-400 text-center leading-relaxed pt-1">
            By clicking Check Availability, you agree to Highrise.pk&apos;s Terms of Use &amp; Privacy
            Policy.
          </p>
        </form>
      )}
    </div>

    {/* ─── Inline Auth Modal ─── */}
    {showAuthModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop (Rule Set A) */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAuthModal(false)}
          aria-hidden="true"
        />
        {/* Modal Body */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[440px] max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setShowAuthModal(false)}
            className="absolute top-4 right-4 z-20 p-2 text-gray-400 bg-white border border-gray-100 hover:text-gray-800 hover:bg-gray-50 hover:shadow-sm rounded-full transition-all"
            aria-label="Close login modal"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="p-6 pt-12">
            <LoginOrSignupForm
              isModal={true}
              context="contact"
              onSuccess={() => setShowAuthModal(false)}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}