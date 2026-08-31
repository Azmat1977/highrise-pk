// components/UniversalInquiryModal.tsx

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useSession } from 'next-auth/react';
import AuthGateModal from '@/components/auth/AuthGateModal';
import {
  X,
  Send,
  Loader2,
  Mail,
  Phone,
  User,
  MessageSquare,
  Building2,
  CheckCircle,
  MapPin,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface UniversalInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'property' | 'project';
  entityId: string;
  entityCode?: string;   // HR-PRJ-XXXXX — buyer reference
  entityTitle?: string;
  entityPrice?: number;
  entityLocation?: string;
  entityImage?: string;
  developerId?: string;
  developerName?: string;
  leadType?:
    | 'project_interest'
    | 'call_back'
    | 'site_visit'
    | 'brochure_download'
    | 'payment_plan'
    | 'general_inquiry';
  buttonText?: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  city: string;
  message: string;
  preferredVisitAt: string;
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

// ============================================
// HELPERS
// ============================================

function formatPrice(price: number): string {
  if (price >= 10_000_000) {
    return `PKR ${(price / 10_000_000).toFixed(1)} Crore`;
  }
  if (price >= 100_000) {
    return `PKR ${(price / 100_000).toFixed(1)} Lac`;
  }
  return `PKR ${price.toLocaleString()}`;
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getBrowserInfo(): string {
  if (typeof navigator === 'undefined') return 'Other';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}

function getDefaultMessage(
  leadType: UniversalInquiryModalProps['leadType'],
  entityTitle: string
): string {
  switch (leadType) {
    case 'site_visit':
      return `I would like to schedule a site visit for ${entityTitle}. Please contact me with available dates and times.`;
    case 'call_back':
      return `Please call me back regarding ${entityTitle}. I'm interested in learning more details.`;
    case 'brochure_download':
      return `I would like to receive the brochure for ${entityTitle}. Please send me detailed information.`;
    case 'payment_plan':
      return `I'm interested in the payment plan options for ${entityTitle}. Please provide details.`;
    case 'general_inquiry':
      return `I have some questions about ${entityTitle}. Please contact me.`;
    default:
      return `I'm interested in ${entityTitle}. Please provide me with more information.`;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pakistani cities — dropdown for buyer's home city
// Sorted by population/investment activity
const PAKISTAN_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Gujranwala',
  'Sialkot',
  'Hyderabad',
  'Bahawalpur',
  'Sargodha',
  'Sukkur',
  'Larkana',
  'Sheikhupura',
  'Mardan',
  'Gujrat',
  'Kasur',
  'Rahim Yar Khan',
  'Sahiwal',
  'Okara',
  'Wah Cantt',
  'Dera Ghazi Khan',
  'Mirpur Khas',
  'Chiniot',
  'Kamoke',
  'Nawabshah',
  'Burewala',
  'Jhelum',
  'Sadiqabad',
  'Khanewal',
  'Hafizabad',
  'Kohat',
  'Muzaffargarh',
  'Khanpur',
  'Gojra',
  'Bahawalnagar',
  'Muridke',
  'Pak Pattan',
  'Abbottabad',
  'Tando Adam',
  'Jaranwala',
  'Chishtian',
  'Daska',
  'Bhalwal',
  'Attock',
  'Vehari',
  'Dera Ismail Khan',
  'Chakwal',
  'Mianwali',
  'Overseas / Non-Resident Pakistani',
  'Other',
] as const;

// ============================================
// MAIN COMPONENT
// ============================================

export default function UniversalInquiryModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityCode,
  entityTitle = 'Property',
  entityPrice,
  entityLocation,
  entityImage,
  developerId,
  developerName,
  leadType = 'project_interest',
  buttonText = 'Submit Inquiry',
}: UniversalInquiryModalProps): React.ReactElement | null {
  // ═══════════════════════════════════════════════════════════
  // 🔒 SESSION CHECK — Enterprise Auth Gate
  // If not logged in, show AuthGateModal instead of form.
  // After successful login, session updates → modal auto-shows form.
  // Uses NextAuth session with auto-fill from user profile.
  // ═══════════════════════════════════════════════════════════
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;
  const isSessionLoading = status === 'loading';

  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [fieldError, setFieldError] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    city: '',
    message: '',
    preferredVisitAt: '',
  });

  // ─── Reset form when modal opens ───
  // Auto-fills name + email + phone from session if logged in
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name:    session?.user?.name || '',
        email:   session?.user?.email || '',
        phone:   session?.user?.phoneNumber || '',
        city:    '',
        message: getDefaultMessage(leadType, entityTitle),
        preferredVisitAt: '',
      });
      setSubmitState('idle');
      setErrorMsg('');
      setFieldError('');
    }
  }, [isOpen, leadType, entityTitle, session]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldError('');
    setErrorMsg('');

    // Property communication derives sender identity from the DB-current
    // authenticated account. Project leads keep their legacy contact form.
    if (entityType === 'project') {
      if (!formData.name.trim() || formData.name.trim().length < 3) {
        setFieldError('Please enter your full name (min 3 characters).');
        return;
      }
      if (!formData.email.trim() || !EMAIL_REGEX.test(formData.email)) {
        setFieldError('Please enter a valid email address.');
        return;
      }
      if (!formData.phone.trim() || formData.phone.trim().length < 10) {
        setFieldError('Please enter a valid phone number (min 10 digits).');
        return;
      }
      if (!formData.city.trim()) {
        setFieldError('Please select your city.');
        return;
      }
    }
    if (!formData.message.trim()) {
      setFieldError('Please enter a message.');
      return;
    }
    if (entityType === 'property' && leadType === 'site_visit' && !formData.preferredVisitAt) {
      setFieldError('Please choose a preferred visit date and time.');
      return;
    }

    setSubmitState('loading');

    try {
      // UTM params
      const urlParams =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams();

      const isPropertyCommunication = entityType === 'property';
      const requestUrl = isPropertyCommunication
        ? `/api/properties/${encodeURIComponent(entityId)}/communication`
        : '/api/leads';

      const requestBody = isPropertyCommunication
        ? {
            intent: leadType === 'site_visit'
              ? 'site_visit'
              : leadType === 'call_back'
                ? 'callback'
                : 'inquiry',
            message: formData.message.trim(),
            ...(leadType === 'site_visit' && formData.preferredVisitAt
              ? { preferredVisitAt: new Date(formData.preferredVisitAt).toISOString() }
              : {}),
          }
        : {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            message: `[Buyer City: ${formData.city}]\n\n${formData.message.trim()}`,
            leadType,
            source: 'project_page',
            projectId: entityId,
            developerId,
            utmSource: urlParams.get('utm_source') || undefined,
            utmMedium: urlParams.get('utm_medium') || undefined,
            utmCampaign: urlParams.get('utm_campaign') || undefined,
            utmContent: urlParams.get('utm_content') || undefined,
            utmTerm: urlParams.get('utm_term') || undefined,
            referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
            landingPage: typeof window !== 'undefined' ? window.location.pathname : undefined,
            deviceType: getDeviceType(),
            browser: getBrowserInfo(),
          };

      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data: { success: boolean; message?: string } = await res.json();

      if (res.ok && data.success) {
        setSubmitState('success');
        // Auto-close after 2.5s
        setTimeout(() => {
          onClose();
        }, 2500);
      } else {
        setSubmitState('error');
        setErrorMsg(data.message || 'Failed to submit. Please try again.');
      }
    } catch (err: unknown) {
      setSubmitState('error');
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    }
  };

  const getModalTitle = (): string => {
    switch (leadType) {
      case 'site_visit':        return 'Schedule Site Visit';
      case 'call_back':         return 'Request Callback';
      case 'brochure_download': return 'Get Brochure';
      case 'payment_plan':      return 'Payment Plan Details';
      case 'general_inquiry':   return 'Send Inquiry';
      case 'project_interest':  return 'Express Interest';
      default:                  return 'Send Inquiry';
    }
  };

  if (!isOpen) return null;

  // ═══════════════════════════════════════════════════════════
  // 🔒 AUTH GATE — Show login modal if guest
  // Portal-rendered, replaces inquiry form until authenticated
  // ═══════════════════════════════════════════════════════════
  if (!isAuthenticated && !isSessionLoading) {
    return (
      <AuthGateModal
        isOpen={isOpen}
        onClose={onClose}
        actionDescription={
          leadType === 'site_visit'
            ? 'book a site visit'
            : leadType === 'call_back'
            ? 'request a callback'
            : leadType === 'brochure_download'
            ? 'download the brochure'
            : leadType === 'payment_plan'
            ? 'view the payment plan'
            : 'send an inquiry'
        }
        entityTitle={entityTitle}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ⏳ LOADING STATE — Show spinner while session initializes
  // ═══════════════════════════════════════════════════════════
  if (isSessionLoading) {
    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="status"
        aria-label="Loading"
      >
        <div className="bg-white rounded-2xl p-6 flex items-center gap-3 shadow-2xl">
          <Loader2 className="w-5 h-5 animate-spin text-[#029bba]" />
          <span className="text-sm font-semibold text-gray-700">Loading...</span>
        </div>
      </div>,
      document.body,
    );
  }

  const isLoading = submitState === 'loading';

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-modal-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-hidden="true"
        />

        {/* Modal Panel */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
          {/* ── Header ── */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#029bba]" />
              </div>
              <div>
                <h2
                  id="inquiry-modal-title"
                  className="text-xl font-bold text-gray-900"
                >
                  {getModalTitle()}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                  {entityTitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Success State ── */}
          {submitState === 'success' ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Inquiry Submitted!
              </h3>
              <p className="text-gray-500 mb-2">
                Your request was sent to the accountable listing representative.
              </p>
              <p className="text-sm text-gray-400">Closing automatically...</p>
            </div>
          ) : (
            <>
              {/* ── Entity Info Card ── */}
              {(entityPrice || entityLocation || entityCode) && (
                <div className="px-6 pt-4">
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                    {entityImage && (
                      <img
                        src={entityImage}
                        alt={entityTitle}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {entityTitle}
                        </p>
                        {entityCode && (
                          <span
                            title="Reference number — mention this when contacting"
                            className="shrink-0 text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded"
                          >
                            {entityCode}
                          </span>
                        )}
                      </div>
                      {entityLocation && (
                        <p className="text-sm text-gray-500 truncate">
                          {entityLocation}
                        </p>
                      )}
                      {entityPrice && (
                        <p className="text-sm font-semibold text-[#029bba] mt-0.5">
                          {formatPrice(entityPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
                {/* Field error banner */}
                {fieldError && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {fieldError}
                  </div>
                )}

                {/* Submit error banner */}
                {submitState === 'error' && errorMsg && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {errorMsg}
                  </div>
                )}

                {entityType === 'project' ? (
                  <>
                    {/* Name */}
                <div>
                  <label
                    htmlFor="inq-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      id="inq-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Enter your name"
                      autoComplete="name"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl
                        focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                        outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="inq-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      id="inq-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="your.email@example.com"
                      autoComplete="email"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl
                        focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                        outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                </div>

                {/* Phone — REQUIRED for developer callback */}
                <div>
                  <label
                    htmlFor="inq-phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      id="inq-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="+92 300 1234567"
                      autoComplete="tel"
                      required
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl
                        focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                        outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                </div>

                {/* City — REQUIRED — buyer's home city (not project city) */}
                <div>
                  <label
                    htmlFor="inq-city"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Your City <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-400 font-normal ml-1">
                      (where you live)
                    </span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                    <select
                      id="inq-city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, city: e.target.value }))
                      }
                      required
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl
                        focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                        outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400
                        appearance-none bg-white cursor-pointer"
                    >
                      <option value="">Select your city...</option>
                      {PAKISTAN_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                  </>
                ) : (
                  <div className="rounded-xl border border-[#029bba]/20 bg-[#eff6ff] px-4 py-3">
                    <p className="text-sm font-semibold text-[#004063]">
                      Your verified Highrise account details will be used for this request.
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#386077]">
                      For your security, the browser cannot choose the seller or alter recipient details. Highrise routes this request to the accountable Owner, Agent, or Developer from the current Property record.
                    </p>
                  </div>
                )}

                {entityType === 'property' && leadType === 'site_visit' && (
                <div className="mb-4">
                  <label htmlFor="preferredVisitAt" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Preferred visit date & time
                  </label>
                  <input
                    id="preferredVisitAt"
                    type="datetime-local"
                    value={formData.preferredVisitAt}
                    min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, preferredVisitAt: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#029bba] focus:outline-none focus:ring-2 focus:ring-[#029bba]/10"
                    required
                  />
                </div>
              )}

              {/* Message */}
                <div>
                  <label
                    htmlFor="inq-message"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Message <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <textarea
                      id="inq-message"
                      value={formData.message}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, message: e.target.value }))
                      }
                      rows={4}
                      placeholder="Tell us about your requirements..."
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl
                        focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                        outline-none transition-all resize-none
                        disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {formData.message.length} characters
                  </p>
                </div>

                {/* Privacy notice */}
                <div className="bg-[#eff6ff] border border-[#029bba]/20 rounded-xl p-3">
                  <p className="text-xs text-[#004063]">
                    {entityType === 'property'
                      ? '🔒 Your request is protected. Highrise routes Property requests using server-verified account and listing relationships.'
                      : '🔒 Your information is protected and used only to process this project inquiry.'}
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-[#029bba] text-white rounded-xl
                    hover:bg-[#027a94] transition-colors font-semibold
                    flex items-center justify-center gap-2
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {buttonText}
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    modalContent,
    document.body,
  );
}