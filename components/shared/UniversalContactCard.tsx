// components/shared/UniversalContactCard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ShieldCheck, Phone, MessageCircle, Send, Loader2, X } from 'lucide-react';
import LoginOrSignupForm from '@/components/auth/LoginOrSignupForm';

interface UniversalContactCardProps {
  entityType: 'project' | 'property';
  entityId: string;
  entityTitle: string;
  actorName: string;
  actorRole: string;
  actorImage?: string | null;
  /** Optional brand mark shown above actor identity (e.g. Highrise logo on project pages) */
  brandLogo?: string | null;
  isVerified: boolean;
  initialPhone?: string;
  initialWhatsapp?: string;
  developerId?: string; // For projects
}

function normalizeWhatsApp(phone: string): string {
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) clean = clean.slice(1);
  if (clean.startsWith('00')) clean = clean.slice(2);
  if (clean.startsWith('03')) clean = '92' + clean.slice(1);
  if (clean.startsWith('3')) clean = '92' + clean;
  return clean;
}

export default function UniversalContactCard({
  entityType,
  entityId,
  entityTitle,
  actorName,
  actorRole,
  actorImage,
  brandLogo,
  isVerified,
  initialPhone,
  initialWhatsapp,
  developerId,
}: UniversalContactCardProps) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: `I am interested in ${entityTitle} and would like to schedule a viewing. Please let me know when this would be possible.`,
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Contact Reveal State
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [revealedWa, setRevealedWa] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);

  // Lock body scroll when auth modal is open
  useEffect(() => {
    document.body.style.overflow = showAuthModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAuthModal]);

  const handleReveal = async () => {
    if (!isLoggedIn) return setShowAuthModal(true);
    
    if (entityType === 'project') {
      setRevealedPhone(initialPhone || '+92 333 5877106');
      setRevealedWa(initialWhatsapp || initialPhone || '+92 333 5877106');
      return;
    }

    // Property: fetch secure contact
    setRevealLoading(true);
    try {
      const res = await fetch(`/api/properties/${encodeURIComponent(entityId)}/contact`, { 
        headers: { Accept: 'application/json' } 
      });
      const data = await res.json();
      if (res.ok && data.success && data.contact) {
        setRevealedPhone(data.contact.phone || null);
        setRevealedWa(data.contact.whatsapp || data.contact.phone || null);
      } else {
        setError(data.message || 'Contact details unavailable.');
      }
    } catch {
      setError('Network error. Could not load contact.');
    } finally {
      setRevealLoading(false);
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!revealedWa) return handleReveal();

    const cleanPhone = normalizeWhatsApp(revealedWa);
    const msg = `Assalam-o-Alaikum, I found "${entityTitle}" on Highrise.pk. I would like to inquire about options, pricing, and details. Please share more info.`;
    
    // Non-blocking telemetry
    fetch('/api/analytics/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: entityId, eventType: 'click', campaignSource: 'whatsapp_card' }),
    }).catch(() => {});

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) return setShowAuthModal(true);

    setLoading(true);
    setError('');

    const isProp = entityType === 'property';
    const requestUrl = isProp ? `/api/properties/${encodeURIComponent(entityId)}/communication` : '/api/leads';
    const requestBody = isProp 
      ? { intent: 'inquiry', message: formData.message.trim() }
      : {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          message: formData.message.trim(),
          leadType: 'general_inquiry',
          source: 'project_page',
          projectId: entityId,
          developerId,
        };

    try {
      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.message || data.error || 'Failed to send inquiry.');
      }
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Top: Brand Logo (optional) + Actor Identity (Centered) */}
        <div className="px-6 pt-6 pb-6 border-b border-gray-100 flex flex-col items-center text-center">
          {brandLogo && (
            <div className="mb-4">
              <Image
                src={brandLogo}
                alt="Highrise.pk"
                width={200}
                height={56}
                className="h-[56px] w-auto object-contain"
                priority
              />
            </div>
          )}

          {!brandLogo && (
            <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden mb-3 shadow-sm flex items-center justify-center shrink-0">
              {actorImage ? (
                <img src={actorImage} alt={actorName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-2xl font-black">{actorName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          )}

          <h3 className="text-base font-black text-[#004063] leading-tight mb-1">{actorName}</h3>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">{actorRole}</p>

          {isVerified && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
              <ShieldCheck className="w-4 h-4" />
              Verified Listing
            </div>
          )}
        </div>

        {/* Bottom: Inline Form & Actions */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-7 h-7 text-emerald-600" />
              </div>
              <h4 className="text-[17px] font-bold text-[#004063] mb-2">Inquiry Sent</h4>
              <p className="text-sm text-gray-500">The seller has been notified and will contact you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" required placeholder="Name"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/30 outline-none"
                />
                <input
                  type="tel" required placeholder="Phone"
                  value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/30 outline-none"
                />
              </div>
              <input
                type="email" required placeholder="Email"
                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/30 outline-none"
              />
              <textarea
                required rows={3}
                value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/30 outline-none resize-none"
              />

              {error && <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

              {/* 1. Send Inquiry */}
              <button
                type="submit" disabled={loading}
                className="w-full bg-[#029bba] hover:bg-[#027a94] text-white text-[15px] font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Send Inquiry</>}
              </button>
              
              {/* 2. Reveal Contact OR Show Phone */}
              {revealedPhone ? (
                <a href={`tel:${revealedPhone}`} className="w-full bg-gray-50 border border-gray-200 text-[#004063] text-[15px] font-black py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <Phone className="w-4 h-4" /> {revealedPhone}
                </a>
              ) : (
                <button
                  type="button" onClick={handleReveal} disabled={revealLoading}
                  className="w-full bg-white border-2 border-[#029bba] text-[#029bba] hover:bg-[#029bba]/5 text-[15px] font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {revealLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Phone className="w-4 h-4" /> Reveal Contact Number</>}
                </button>
              )}

              {/* 3. WhatsApp (Always Green, Always Bottom) */}
              <button
                type="button" onClick={handleWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-[15px] font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-[#25D366]/20"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .092 5.403.089 11.961c-.002 2.095.545 4.14 1.583 5.945L.035 24l6.247-1.637a11.85 11.85 0 0 0 5.766 1.498h.004c6.556 0 11.96-5.403 11.963-11.961a11.83 11.83 0 0 0-3.551-8.402"/></svg>
                WhatsApp
              </button>
            </form>
          )}
        </div>
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[440px] max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 z-20 p-2 text-gray-400 bg-white border border-gray-100 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-all">
              <X className="w-4 h-4" />
            </button>
            <div className="p-6 pt-12">
              <LoginOrSignupForm isModal={true} context="contact" onSuccess={() => setShowAuthModal(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}