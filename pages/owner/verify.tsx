// ========== FILE: pages/owner/verify.tsx ==========
// Highrise.pk — Owner CNIC Verification Page
// V7.0.0 — 4 states: none / pending / approved / rejected
//           3 image uploads: CNIC front, back, selfie with CNIC
//           CNIC locked forever after first submission
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  ShieldCheck,
  Clock,
  XCircle,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Upload,
  User,
  Phone,
  MapPin,
  IdCard,
  ArrowRight,
  ArrowLeft,
  Info,
  Home,
  Trash2,
  ChevronRight,
} from 'lucide-react';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface CloudinaryImage {
  url:      string;
  publicId: string;
}

interface UploadState {
  file:      File | null;
  image:     CloudinaryImage | null;
  uploading: boolean;
  error:     string;
}

interface FormState {
  displayName: string;
  cnic:        string;
  phone:       string;
  city:        string;
  address:     string;
  agree:       boolean;
}

interface Banner {
  type:    'success' | 'error' | 'info' | '';
  message: string;
}

interface StatusData {
  hasProfile:          boolean;
  status:              string | null;
  verificationLevel:   string | null;
  submittedAt:         string | null;
  verifiedAt:          string | null;
  rejectionReason:     string | null;
  infoRequiredReason:  string | null;
  canListProperties:   boolean;
  maxListings:         number;
  activeListingsCount: number;
  remainingListings:   number;
}

const PAKISTAN_CITIES = [
  'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
  'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
  'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Mardan', 'Gujrat',
  'Kasur', 'Mingora', 'Abbottabad', 'Murree', 'Jhelum', 'Mirpur',
];

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function formatCnic(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

// ═══════════════════════════════════════════
// BANNER
// ═══════════════════════════════════════════

function BannerBox({ banner }: { banner: Banner }): ReactElement | null {
  if (!banner.type) return null;

  const config = {
    success: {
      className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      Icon: CheckCircle,
    },
    error: {
      className: 'bg-red-50 border-red-200 text-red-800',
      Icon: XCircle,
    },
    info: {
      className: 'bg-[#eff6ff] border-[#029bba]/30 text-[#004063]',
      Icon: Info,
    },
  }[banner.type];

  const { Icon } = config;

  return (
    <div className={cx(
      'flex items-start gap-3 p-4 rounded-xl border',
      config.className
    )}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm font-medium">{banner.message}</p>
    </div>
  );
}

// ═══════════════════════════════════════════
// FILE UPLOAD ZONE
// ═══════════════════════════════════════════

function UploadZone({
  label,
  hint,
  state,
  onUpload,
  onRemove,
  icon,
}: {
  label:    string;
  hint:     string;
  state:    UploadState;
  onUpload: (file: File) => void;
  onRemove: () => void;
  icon:     ReactElement;
}): ReactElement {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        <span className="text-red-500 ml-1">*</span>
      </label>

      {state.image ? (
        <div className="relative border-2 border-emerald-300 bg-emerald-50
                        rounded-xl p-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.image.url}
            alt={label}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-emerald-800 truncate">
                Uploaded
              </p>
            </div>
            <p className="text-xs text-emerald-700 mt-0.5">
              Click to view · replace below
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 p-2 rounded-lg text-red-500
                       hover:bg-red-100 transition-colors"
            aria-label="Remove image"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className={cx(
          'flex flex-col items-center justify-center w-full min-h-[140px]',
          'border-2 border-dashed rounded-xl cursor-pointer transition-all',
          'p-4',
          state.error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 bg-white hover:border-[#029bba] hover:bg-[#029bba]/5'
        )}>
          {state.uploading ? (
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Uploading...</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100
                              flex items-center justify-center mx-auto mb-2">
                <span className="text-gray-400">{icon}</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">Click to upload</p>
              <p className="text-[11px] text-gray-500 mt-1">
                JPG, PNG or WebP · Max 5MB
              </p>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleChange}
          />
        </label>
      )}

      {state.error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {state.error}
        </p>
      )}
      {!state.error && (
        <p className="text-[11px] text-gray-500 mt-1.5">{hint}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

export default function OwnerVerifyPage(): ReactElement {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [loading, setLoading]   = useState(true);
  const [statusData, setStatusData] = useState<StatusData | null>(null);

  const [banner, setBanner]     = useState<Banner>({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>({
    displayName: '',
    cnic:        '',
    phone:       '',
    city:        '',
    address:     '',
    agree:       false,
  });

  const [cnicFront, setCnicFront] = useState<UploadState>({
    file: null, image: null, uploading: false, error: '',
  });
  const [cnicBack, setCnicBack] = useState<UploadState>({
    file: null, image: null, uploading: false, error: '',
  });
  // Track if data was prefilled from profile (for UI hint)
  const [wasPrefilled, setWasPrefilled] = useState(false);

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      void router.replace('/login?callbackUrl=/owner/verify');
    }
  }, [authStatus, router]);

  // ── Prefill from user profile API (not just session) ──────
  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    (async () => {
      try {
        const res = await fetch('/api/user/me');
        const data = (await res.json()) as {
          success: boolean;
          user?: {
            name:        string;
            phone:       string;
            city:        string;
            homeAddress: string;
          };
        };

        if (res.ok && data.success && data.user) {
          const u = data.user;
          const cityInList = PAKISTAN_CITIES.includes(u.city);

          setForm((prev) => ({
            ...prev,
            displayName: prev.displayName || u.name        || '',
            phone:       prev.phone       || u.phone       || '',
            city:        prev.city        || (cityInList ? u.city : ''),
            address:     prev.address     || u.homeAddress || '',
          }));

          // Show prefill hint if we filled at least one field
          if (u.name || u.phone || u.city || u.homeAddress) {
            setWasPrefilled(true);
          }
        }
      } catch {
        // Silent fail — user can still fill manually
      }
    })();
  }, [authStatus]);

  // ── Fetch verification status ─────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/owner/verification-status');
      const data = (await res.json()) as {
        success: boolean;
        data?: StatusData;
      };
      if (res.ok && data.success && data.data) {
        setStatusData(data.data);
      }
    } catch {
      // Fetch failure — form still usable
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      void fetchStatus();
    }
  }, [authStatus, fetchStatus]);

  // ── Handlers ──────────────────────────────────────────────
  const handleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const target = e.target;
      const name  = target.name;
      const value = target instanceof HTMLInputElement && target.type === 'checkbox'
        ? target.checked
        : name === 'cnic'
        ? formatCnic(target.value)
        : target.value;

      setForm((prev) => ({ ...prev, [name]: value }));
      setBanner({ type: '', message: '' });
    },
    []
  );

  // ── Upload to Cloudinary ──────────────────────────────────
  const uploadImage = useCallback(async (file: File): Promise<CloudinaryImage> => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File must be less than 5MB.');
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      throw new Error('Only JPG, PNG or WebP images allowed.');
    }

    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch('/api/upload?folder=documents', {
      method: 'POST',
      body: fd,
    });
    const data = (await res.json()) as {
      success: boolean;
      data?: { url: string; publicId: string };
      error?: string;
    };

    if (!res.ok || !data.success || !data.data?.url || !data.data?.publicId) {
      throw new Error(data.error ?? 'Upload failed');
    }

    return {
      url:      data.data.url,
      publicId: data.data.publicId,
    };
  }, []);

  // ── Individual upload handlers ────────────────────────────
  const makeUploadHandler = useCallback(
    (setter: React.Dispatch<React.SetStateAction<UploadState>>) =>
      async (file: File) => {
        setter({ file, image: null, uploading: true, error: '' });
        try {
          const image = await uploadImage(file);
          setter({ file, image, uploading: false, error: '' });
        } catch (err) {
          setter({
            file: null,
            image: null,
            uploading: false,
            error: err instanceof Error ? err.message : 'Upload failed',
          });
        }
      },
    [uploadImage]
  );

  const handleCnicFrontUpload = makeUploadHandler(setCnicFront);
  const handleCnicBackUpload  = makeUploadHandler(setCnicBack);

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setBanner({ type: '', message: '' });

    // Validation
    if (!form.displayName.trim() || form.displayName.trim().length < 3) {
      setBanner({ type: 'error', message: 'Please enter your full name.' });
      return;
    }
    const cnicDigits = form.cnic.replace(/\D/g, '');
    if (cnicDigits.length !== 13) {
      setBanner({ type: 'error', message: 'CNIC must be 13 digits.' });
      return;
    }
    if (!form.phone.trim()) {
      setBanner({ type: 'error', message: 'Please enter your phone number.' });
      return;
    }
    const phoneClean = form.phone.trim().replace(/[-\s]/g, '');
    if (!/^(03\d{9}|\+923\d{9})$/.test(phoneClean)) {
      setBanner({ type: 'error', message: 'Please enter a valid Pakistani number (03XX-XXXXXXX).' });
      return;
    }
    if (!form.city) {
      setBanner({ type: 'error', message: 'Please select your city.' });
      return;
    }
    if (!cnicFront.image) {
      setBanner({ type: 'error', message: 'Please upload CNIC front image.' });
      return;
    }
    if (!cnicBack.image) {
      setBanner({ type: 'error', message: 'Please upload CNIC back image.' });
      return;
    }
    if (!form.agree) {
      setBanner({ type: 'error', message: 'Please agree to the terms to continue.' });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        displayName: form.displayName.trim(),
        cnic:        form.cnic.trim(),
        phone:       form.phone.trim(),
        city:        form.city,
        address:     form.address.trim() || undefined,
        documents: {
          cnicFront: cnicFront.image,
          cnicBack:  cnicBack.image,
        },
      };

      const res = await fetch('/api/owner/submit-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        success: boolean;
        message: string;
      };

      if (res.ok && data.success) {
        setBanner({
          type: 'success',
          message: data.message ?? 'Verification submitted!',
        });
        // Refresh status to show pending state
        setTimeout(() => {
          void fetchStatus();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 800);
      } else {
        setBanner({
          type: 'error',
          message: data.message ?? 'Submission failed. Please try again.',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setBanner({
        type: 'error',
        message: 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
    }, [form, cnicFront.image, cnicBack.image, fetchStatus]);

  // ══════════════════════════════════════════════════════════
  // LOADING STATE
  // ══════════════════════════════════════════════════════════
  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading verification status...</p>
        </div>
      </div>
    );
  }

  if (!session) return <></>;

  const currentStatus = statusData?.status;

  // ══════════════════════════════════════════════════════════
  // STATE: APPROVED
  // ══════════════════════════════════════════════════════════
  if (currentStatus === 'approved') {
    return (
      <>
        <Head>
          <title>Verified Owner | Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">

            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-gray-500
                         hover:text-[#029bba] text-sm font-medium mb-6
                         transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </Link>

            <div className="bg-white rounded-2xl border border-gray-200
                            shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />

              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full
                                flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10 text-emerald-600" />
                </div>

                <h1 className="text-2xl font-bold text-[#004063] mb-3">
                  🎉 You are a Verified Owner!
                </h1>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Your identity has been confirmed by the Highrise.pk team.
                  You can now list your properties with the Verified Owner badge.
                </p>

                <div className="bg-emerald-50 border border-emerald-200
                                rounded-xl p-4 mb-6 max-w-md mx-auto">
                  <p className="text-sm font-semibold text-emerald-800">
                    Listing Allowance
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    {statusData?.remainingListings} of {statusData?.maxListings}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    listings remaining
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/owner/dashboard"
                    className="inline-flex items-center justify-center gap-2
                               px-6 py-3 rounded-xl bg-emerald-600 text-white
                               text-sm font-semibold hover:bg-emerald-700
                               transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Owner Dashboard
                  </Link>
                  <Link
                    href="/owner/listings/new"
                    className="inline-flex items-center justify-center gap-2
                               px-6 py-3 rounded-xl bg-[#029bba] text-white
                               text-sm font-semibold hover:bg-[#027a94]
                               transition-colors"
                  >
                    Start Listing
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STATE: PENDING
  // ══════════════════════════════════════════════════════════
  if (currentStatus === 'pending') {
    return (
      <>
        <Head>
          <title>Verification Under Review | Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">

            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-gray-500
                         hover:text-[#029bba] text-sm font-medium mb-6
                         transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </Link>

            <div className="bg-white rounded-2xl border border-gray-200
                            shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#029bba] to-[#004063]" />

              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-[#029bba]/10 rounded-full
                                flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-[#029bba]" />
                </div>

                <h1 className="text-2xl font-bold text-[#004063] mb-3">
                  Verification Under Review
                </h1>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Your CNIC documents have been submitted successfully.
                  Our team typically reviews submissions within{' '}
                  <strong>24–48 hours</strong>. You will receive an email
                  once approved.
                </p>

                {statusData?.submittedAt && (
                  <p className="text-xs text-gray-400 mb-6">
                    Submitted: {new Date(statusData.submittedAt).toLocaleString('en-PK')}
                  </p>
                )}

                <div className="text-left space-y-3 mb-8 max-w-md mx-auto">
                  {[
                    { label: 'Documents submitted',       done: true  },
                    { label: 'CNIC verification',         done: false },
                    { label: 'Admin review & approval',   done: false },
                    { label: 'Owner dashboard unlocked',  done: false },
                  ].map(({ label, done }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={cx(
                        'w-6 h-6 rounded-full flex items-center',
                        'justify-center flex-shrink-0',
                        done ? 'bg-emerald-100 text-emerald-600'
                             : 'bg-gray-100 text-gray-400'
                      )}>
                        {done
                          ? <CheckCircle className="w-4 h-4" />
                          : <div className="w-2 h-2 rounded-full bg-gray-300" />
                        }
                      </div>
                      <span className={cx(
                        'text-sm',
                        done ? 'text-emerald-700 font-medium' : 'text-gray-500'
                      )}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center gap-2
                             w-full sm:w-auto px-6 py-3 rounded-xl
                             bg-[#029bba] text-white text-sm font-semibold
                             hover:bg-[#027a94] transition-colors"
                >
                  Back to Profile
                  <ChevronRight className="w-4 h-4" />
                </Link>

                <p className="text-xs text-gray-400 mt-6">
                  Need help? Contact{' '}
                  <a
                    href="https://wa.me/923335877106"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#029bba] font-semibold hover:underline"
                  >
                    WhatsApp Support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STATE: SUSPENDED
  // ══════════════════════════════════════════════════════════
  if (currentStatus === 'suspended') {
    return (
      <>
        <Head>
          <title>Account Suspended | Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-red-200
                            shadow-sm overflow-hidden p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full
                              flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-red-900 mb-3">
                Account Suspended
              </h1>
              <p className="text-sm text-gray-600 mb-6">
                Your owner account has been suspended. Please contact our
                support team for assistance.
              </p>
              <a
                href="https://wa.me/923335877106"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3
                           rounded-xl bg-red-600 text-white text-sm
                           font-semibold hover:bg-red-700 transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STATE: NOT SUBMITTED / REJECTED / INFO_REQUIRED — SHOW FORM
  // ══════════════════════════════════════════════════════════
  const isRejected     = currentStatus === 'rejected';
  const isInfoRequired = currentStatus === 'info_required';
  const isDraft        = currentStatus === 'draft';

  return (
    <>
      <Head>
        <title>Verify Your Identity | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100
                      py-10 px-4 sm:px-6">
        <div className="w-full max-w-3xl mx-auto">

          {/* Breadcrumb */}
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-gray-500
                       hover:text-[#029bba] text-sm font-medium mb-6
                       transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14
                            rounded-2xl bg-[#029bba]/10
                            border border-[#029bba]/20 mb-4">
              <ShieldCheck className="w-7 h-7 text-[#029bba]" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#004063] mb-2">
              {isRejected     ? 'Resubmit Verification' :
               isInfoRequired ? 'Additional Info Required' :
               isDraft        ? 'Complete Your Verification' :
                                'Verify Your Identity'}
            </h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Get your CNIC verified to list your own properties with a
              trusted Verified Owner badge.
            </p>
          </div>

          {/* Status Info Boxes */}
          {isRejected && statusData?.rejectionReason && (
            <div className="mb-6 flex items-start gap-3 p-4 border-l-4
                            border-red-500 bg-red-50 rounded-r-xl">
              <XCircle className="w-5 h-5 text-red-600
                                  flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  Previous Application Rejected
                </p>
                <p className="text-xs text-red-800 mt-1">
                  <strong>Reason:</strong> {statusData.rejectionReason}
                </p>
                <p className="text-xs text-red-700 mt-1.5">
                  Please review the reason and resubmit with corrected documents.
                </p>
              </div>
            </div>
          )}

          {isInfoRequired && statusData?.infoRequiredReason && (
            <div className="mb-6 flex items-start gap-3 p-4 border-l-4
                            border-[#029bba] bg-[#eff6ff] rounded-r-xl">
              <AlertCircle className="w-5 h-5 text-[#029bba]
                                      flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#004063]">
                  Additional Information Required
                </p>
                <p className="text-xs text-[#004063]/80 mt-1">
                  {statusData.infoRequiredReason}
                </p>
              </div>
            </div>
          )}

          {/* Banner */}
          {banner.type && (
            <div className="mb-6">
              <BannerBox banner={banner} />
            </div>
          )}

          {/* Prefilled hint */}
          {wasPrefilled && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800">
                  <strong>✨ Auto-filled from your profile.</strong> You can edit any field before submitting.
                </p>
              </div>
            </div>
          )}

          {/* Benefits Info */}
          <div className="mb-6 p-4 bg-[#029bba]/5 border border-[#029bba]/20
                          rounded-xl">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#029bba]
                                      flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#004063]">
                  Benefits of Verification
                </p>
                <ul className="text-xs text-[#004063]/80 mt-1.5 space-y-1">
                  <li>✓ &quot;Verified Owner&quot; badge on all your listings</li>
                  <li>✓ List up to 10 properties (individual limit)</li>
                  <li>✓ Higher trust from buyers and renters</li>
                  <li>✓ Priority in search results</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Warning: CNIC lock */}
          <div className="mb-6 p-4 border-l-4 border-amber-500
                          bg-amber-50 rounded-r-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600
                                        flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Important: CNIC Lock Policy
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Once submitted, your CNIC number is <strong>locked permanently</strong>
                  {' '}and cannot be changed. This protects buyers from fraud.
                  Please double-check your CNIC before submitting.
                </p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-gray-200
                          shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#029bba] to-[#004063]" />

            <div className="p-6 sm:p-8 space-y-8">

              {/* ═════ Section 1: Personal Details ═════ */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <User className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Personal Details
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold
                                      text-gray-700 mb-1.5">
                      Full Name (as per CNIC)
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2
                                       w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        name="displayName"
                        value={form.displayName}
                        onChange={handleFormChange}
                        placeholder="Ahmad Ali Khan"
                        maxLength={100}
                        className="w-full h-12 pl-11 pr-4 border border-gray-200
                                   rounded-xl text-sm bg-white outline-none
                                   focus:ring-2 focus:ring-[#029bba]/20
                                   focus:border-[#029bba] transition-all"
                      />
                    </div>
                  </div>

                  {/* CNIC */}
                  <div>
                    <label className="block text-xs font-semibold
                                      text-gray-700 mb-1.5">
                      CNIC Number
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <IdCard className="absolute left-4 top-1/2 -translate-y-1/2
                                         w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        name="cnic"
                        value={form.cnic}
                        onChange={handleFormChange}
                        placeholder="35202-1234567-1"
                        maxLength={15}
                        className="w-full h-12 pl-11 pr-4 border border-gray-200
                                   rounded-xl text-sm bg-white outline-none
                                   focus:ring-2 focus:ring-[#029bba]/20
                                   focus:border-[#029bba] transition-all
                                   font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1
                                  flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      This will be locked permanently after submission
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold
                                      text-gray-700 mb-1.5">
                      Phone Number
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2
                                        w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleFormChange}
                        placeholder="03XX-XXXXXXX"
                        className="w-full h-12 pl-11 pr-4 border border-gray-200
                                   rounded-xl text-sm bg-white outline-none
                                   focus:ring-2 focus:ring-[#029bba]/20
                                   focus:border-[#029bba] transition-all"
                      />
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-xs font-semibold
                                      text-gray-700 mb-1.5">
                      City
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2
                                         w-4 h-4 text-gray-400 pointer-events-none z-10" />
                      <select
                        name="city"
                        value={form.city}
                        onChange={handleFormChange}
                        className="w-full h-12 pl-11 pr-4 border border-gray-200
                                   rounded-xl text-sm bg-white outline-none
                                   focus:ring-2 focus:ring-[#029bba]/20
                                   focus:border-[#029bba] transition-all"
                      >
                        <option value="">Select city...</option>
                        {PAKISTAN_CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Address (optional) */}
                  <div>
                    <label className="block text-xs font-semibold
                                      text-gray-700 mb-1.5">
                      Home Address
                      <span className="text-xs font-normal text-gray-400 ml-1">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleFormChange}
                      rows={2}
                      maxLength={500}
                      placeholder="House #, Street, Sector / Society, City"
                      className="w-full px-4 py-3 border border-gray-200
                                 rounded-xl text-sm bg-white outline-none
                                 focus:ring-2 focus:ring-[#029bba]/20
                                 focus:border-[#029bba] transition-all
                                 resize-none"
                    />
                  </div>
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ═════ Section 2: Document Uploads ═════ */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <Upload className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Upload Documents
                  </h2>
                </div>

                <div className="grid gap-4">
                  <UploadZone
                    label="CNIC Front"
                    hint="Clear photo of the front side of your CNIC"
                    icon={<IdCard className="w-6 h-6" />}
                    state={cnicFront}
                    onUpload={handleCnicFrontUpload}
                    onRemove={() => setCnicFront({
                      file: null, image: null, uploading: false, error: '',
                    })}
                  />

                  <UploadZone
                    label="CNIC Back"
                    hint="Clear photo of the back side of your CNIC"
                    icon={<IdCard className="w-6 h-6" />}
                    state={cnicBack}
                    onUpload={handleCnicBackUpload}
                    onRemove={() => setCnicBack({
                      file: null, image: null, uploading: false, error: '',
                    })}
                  />
                </div>

                {/* Photo tips */}
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200
                                rounded-xl">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    📸 Photo Tips
                  </p>
                  <ul className="text-[11px] text-gray-600 space-y-0.5">
                    <li>• Ensure all text on your CNIC is clearly readable</li>
                    <li>• Take photos in good lighting</li>
                    <li>• No glare or reflections on the CNIC</li>
                    <li>• Full CNIC must be visible in the frame</li>
                    <li>• Upload both front and back clearly</li>
                  </ul>
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ═════ Section 3: Consent & Submit ═════ */}
              <section className="space-y-4">
                <label className="flex items-start gap-3 bg-gray-50
                                  border border-gray-200 rounded-xl p-4
                                  cursor-pointer">
                  <input
                    type="checkbox"
                    name="agree"
                    checked={form.agree}
                    onChange={handleFormChange}
                    className="mt-0.5 h-4 w-4 accent-[#029bba] flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I confirm that all information and documents provided are
                    accurate and belong to me. I understand that my CNIC
                    number will be <strong>locked permanently</strong> after
                    submission, and I agree to Highrise.pk&apos;s{' '}
                    <Link href="/terms-of-service"
                          className="text-[#029bba] hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy-policy"
                          className="text-[#029bba] hover:underline">
                      Privacy Policy
                    </Link>.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={
                    submitting ||
                    cnicFront.uploading ||
                    cnicBack.uploading
                  }
                  className="w-full h-12 bg-[#029bba] hover:bg-[#027a94]
                             text-white font-semibold rounded-xl
                             transition-colors disabled:opacity-60
                             disabled:cursor-not-allowed
                             flex items-center justify-center gap-2 text-sm
                             shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      Submit for Verification
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400">
                  Review typically takes 24–48 hours. You will be notified by email.
                </p>
              </section>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Highrise.pk verifies all owners to build a trusted marketplace
            for buyers and renters across Pakistan.
          </p>
        </div>
      </div>
    </>
  );
}

// ========== END OF FILE ==========