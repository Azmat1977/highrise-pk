// pages/onboarding/business.tsx
// Agent & Developer Business Onboarding — Step 2
// Auth: useSession() only | fetch() only | No as any | No axios
// Role comes from SESSION only — never from query string
// Fields match /api/onboarding/business exactly

import { useState, useEffect, useCallback } from 'react';
import { useSession }                       from 'next-auth/react';
import { useRouter }                        from 'next/router';
import Head                                 from 'next/head';
import Link                                 from 'next/link';
import {
  Building2,
  MapPin,
  Phone,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
  User,
  Briefcase,
  Globe,
  Mail,
  Hash,
  IdCard,
  ShieldCheck,
  Facebook,
  Instagram,
  Linkedin,
  Camera,
  Image as ImageIcon,
  Languages,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAKISTAN_CITIES = [
  'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
  'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
  'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Mardan', 'Gujrat',
  'Kasur', 'Mingora', 'Abbottabad', 'Murree', 'Jhelum', 'Mirpur',
] as const;

const AGENT_TYPES = [
  { value: 'individual', label: 'Individual Agent'   },
  { value: 'agency',     label: 'Real Estate Agency' },
  { value: 'freelance',  label: 'Freelance Agent'    },
] as const;

const DEVELOPER_TYPES = [
  { value: 'builder',   label: 'Builder / Constructor' },
  { value: 'developer', label: 'Real Estate Developer' },
  { value: 'corporate', label: 'Corporate Entity'      },
] as const;

const SPECIALIZATION_OPTIONS = [
  { value: 'residential', label: 'Residential'  },
  { value: 'commercial',  label: 'Commercial'   },
  { value: 'plots',       label: 'Plots & Land' },
  { value: 'rental',      label: 'Rental'       },
  { value: 'luxury',      label: 'Luxury'       },
  { value: 'industrial',  label: 'Industrial'   },
] as const;

const REP_ROLES = [
  'CEO', 'Owner', 'Director', 'Manager', 'Real Estate Agent', 'Partner',
] as const;

// V6.8.4: Agency size options (only shown when agentType === 'agency')
const AGENCY_SIZES = [
  { value: 'solo',   label: 'Solo (Just me)'      },
  { value: 'small',  label: 'Small (2–10 agents)' },
  { value: 'medium', label: 'Medium (11–50)'      },
  { value: 'large',  label: 'Large (50+)'         },
] as const;

// V6.8.4: Common languages spoken in Pakistan real estate
const LANGUAGE_OPTIONS = [
  { value: 'urdu',     label: 'Urdu'     },
  { value: 'english',  label: 'English'  },
  { value: 'punjabi',  label: 'Punjabi'  },
  { value: 'sindhi',   label: 'Sindhi'   },
  { value: 'pashto',   label: 'Pashto'   },
  { value: 'balochi',  label: 'Balochi'  },
  { value: 'saraiki',  label: 'Saraiki'  },
  { value: 'arabic',   label: 'Arabic'   },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingRole = 'agent' | 'developer';

interface FormState {
  // V6.8.2: CNIC Identity Verification (shown only if user has no CNIC)
  cnicNumber:      string;
  cnicFullName:    string;

  // Core — matches API exactly
  displayName:     string;
  agentType:       string;   // agent: individual|agency|freelance / developer: builder|developer|corporate
  agencyName:      string;
  agencySize:      string;   // V6.8.4: solo|small|medium|large (only if agency)
  tagline:         string;
  about:           string;
  phone:           string;
  whatsapp:        string;
  city:            string;
  officeAddress:   string;
  specializations: string[];
  languages:       string[]; // V6.8.4: Multi-select languages spoken

  // Extended fields
  orgEmail:        string;
  orgWebsite:      string;
  repName:         string;
  repRole:         string;
  serviceAreas:    string;   // comma-separated → split on submit
  experienceYears: string;

  // Compliance
  companyRegNo:    string;
  ntnNo:           string;
  licenseNumber:   string;

  // Social
  facebookUrl:     string;
  instagramUrl:    string;
  linkedinUrl:     string;

  // Consent
  agree:           boolean;
}

interface UploadState {
  file:      File | null;
  url:       string;
  uploading: boolean;
  error:     string;
}

interface BannerState {
  type:    'success' | 'error' | 'info' | '';
  message: string;
}

// ─── Sanitize Helpers ─────────────────────────────────────────────────────────

function sanitizeText(v: string, max = 120): string {
  return String(v ?? '').trim().slice(0, max);
}

function sanitizePhone(v: string): string {
  return String(v ?? '').trim().replace(/[^\d+\-\s]/g, '').slice(0, 20);
}

function sanitizeUrl(v: string, max = 200): string {
  const s = String(v ?? '').trim().slice(0, max);
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function sanitizeList(v: string, max = 20): string[] {
  return String(v ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function FieldInput({
  icon,
  label,
  hint,
  error,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?:     React.ReactNode;
  label?:    string;
  hint?:     string;
  error?:    string;
  required?: boolean;
}) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 
                           text-gray-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={cx(
            'w-full h-12 pr-4 border rounded-xl bg-white outline-none',
            'transition-all placeholder:text-gray-400 text-sm',
            'focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]',
            icon ? 'pl-11' : 'pl-4',
            error ? 'border-red-300' : 'border-gray-200',
            props.className
          )}
        />
      </div>
      {hint && !error && (
        <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function FieldSelect({
  label,
  hint,
  required,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?:    string;
  hint?:     string;
  required?: boolean;
}) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        {...props}
        className={cx(
          'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white',
          'text-sm text-gray-900 outline-none transition-all appearance-none',
          'focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]',
          props.className
        )}
      >
        {children}
      </select>
      {hint && (
        <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
      )}
    </div>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function Banner({ state }: { state: BannerState }) {
  if (!state.type) return null;

  const config = {
    success: {
      className: 'bg-green-50 border-green-400 text-green-800',
      Icon:      CheckCircle,
    },
    error: {
      className: 'bg-red-50 border-red-400 text-red-800',
      Icon:      AlertCircle,
    },
    info: {
      className: 'bg-blue-50 border-blue-400 text-blue-800',
      Icon:      Info,
    },
  }[state.type];

  const { Icon } = config;

  return (
    <div className={`flex items-start gap-3 p-4 border-l-4 rounded-r-xl 
                     ${config.className}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm font-medium">{state.message}</p>
    </div>
  );
}

// ─── File Upload Zone ─────────────────────────────────────────────────────────

function FileUploadZone({
  state,
  onChange,
}: {
  state:    UploadState;
  onChange: (file: File) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onChange(file);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        Verification Document <span className="text-red-500">*</span>
      </label>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
        <p className="text-xs text-blue-700 leading-relaxed">
          Upload your agency letterhead, visiting card, real estate license,
          or SECP certificate. Accepted: JPG, PNG, PDF • Max 5MB
        </p>
      </div>

      <label className={cx(
        'flex flex-col items-center justify-center w-full h-40',
        'border-2 border-dashed rounded-xl cursor-pointer transition-all',
        state.error
          ? 'border-red-300 bg-red-50'
          : state.url
          ? 'border-green-400 bg-green-50'
          : 'border-[#029bba]/40 bg-white hover:bg-gray-50 hover:border-[#029bba]'
      )}>
        {state.uploading ? (
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-[#029bba] animate-spin 
                                mx-auto mb-2" />
            <p className="text-sm text-gray-500">Uploading...</p>
          </div>
        ) : state.url ? (
          <div className="text-center px-4">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-600 line-clamp-1">
              {state.file?.name ?? 'Document uploaded'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Click to replace</p>
          </div>
        ) : (
          <div className="text-center px-4">
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">
              Click to upload document
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPG, PNG or PDF • Max 5MB
            </p>
          </div>
        )}
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleChange}
        />
      </label>

      {state.error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {state.error}
        </p>
      )}
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ role }: { role: OnboardingRole }) {
  const roleLabel = role === 'agent' ? 'agent' : 'developer';

  // V6.8.2: Auto-scroll to top when success screen mounts
  // Ensures user sees the celebration card, not footer
    useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.style.overflow = 'auto';
    
    // V6.8.2: Prevent back navigation to form after successful submission
    const preventBack = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', preventBack);
    
    return () => {
      window.removeEventListener('popstate', preventBack);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Application Under Review | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-[#f8f9fa] flex items-center 
                      justify-center p-4 animate-in fade-in duration-500">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 
                        p-10 max-w-md w-full text-center 
                        animate-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center 
                          justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#004063] mb-3">
            Application Under Review
          </h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Your application to become a verified{' '}
            <strong>{roleLabel}</strong> on Highrise.pk has been received.
            Our compliance team typically reviews submissions within{' '}
            <strong>1–3 business days</strong>. You will receive an email
            once a decision is made.
          </p>

          <div className="text-left space-y-3 mb-8">
            {[
              { label: 'Application received',          done: true  },
              { label: 'Document & KYC verification',   done: false },
              { label: 'Admin review & approval',       done: false },
              { label: 'Dashboard & listings unlocked', done: false },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={cx(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                  done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                )}>
                  {done
                    ? <CheckCircle className="w-4 h-4" />
                    : <div className="w-2 h-2 rounded-full bg-gray-300" />
                  }
                </div>
                <span className={cx(
                  'text-sm',
                  done ? 'text-green-700 font-medium' : 'text-gray-500'
                )}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 
                       bg-[#029bba] text-white rounded-xl font-semibold 
                       text-sm hover:bg-[#027a94] transition-colors"
          >
            Back to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function BusinessOnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // This page is AGENT onboarding only.
  // Developer onboarding lives at /onboarding/developer
  // Society onboarding lives at /onboarding/society
  const sessionRole = session?.user?.role;
  const onboardingStatus = session?.user?.onboardingStatus ?? 'none';
  const onboardingRole: OnboardingRole = 'agent';

  // ── Form State ──
  // V6.8.2: Declare `submitted` BEFORE useEffect that references it
  // (JavaScript doesn't hoist const declarations)
  const [form, setForm] = useState<FormState>({
    // V6.8.2: CNIC fields (pre-fill full name from session)
    cnicNumber:      '',
    cnicFullName:    session?.user?.name ?? '',

    displayName:     session?.user?.name ?? '',
    agentType:       'individual',
    agencyName:      '',
    agencySize:      '',
    tagline:         '',
    about:           '',
    phone:           '',
    whatsapp:        '',
    city:            '',
    officeAddress:   '',
    specializations: [],
    languages:       ['urdu', 'english'], // V6.8.4: Sensible defaults
    orgEmail:        session?.user?.email ?? '',
    orgWebsite:      '',
    repName:         session?.user?.name  ?? '',
    repRole:         '',
    serviceAreas:    '',
    experienceYears: '',
    companyRegNo:    '',
    ntnNo:           '',
    licenseNumber:   '',
    facebookUrl:     '',
    instagramUrl:    '',
    linkedinUrl:     '',
    agree:           false,
  });

  const [upload, setUpload] = useState<UploadState>({
    file:      null,
    url:       '',
    uploading: false,
    error:     '',
  });

  // V6.8.2: CNIC image upload states
  const [cnicFrontUpload, setCnicFrontUpload] = useState<UploadState>({
    file:      null,
    url:       '',
    uploading: false,
    error:     '',
  });

  const [cnicBackUpload, setCnicBackUpload] = useState<UploadState>({
    file:      null,
    url:       '',
    uploading: false,
    error:     '',
  });

  // V6.8.4: Profile photo (REQUIRED) + agency logo (optional, agency only)
  const [profilePhotoUpload, setProfilePhotoUpload] = useState<UploadState>({
    file:      null,
    url:       '',
    uploading: false,
    error:     '',
  });

  const [agencyLogoUpload, setAgencyLogoUpload] = useState<UploadState>({
    file:      null,
    url:       '',
    uploading: false,
    error:     '',
  });

  const [banner,     setBanner]     = useState<BannerState>({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  // ── Auth & Role Guard (V6.8.2 — moved AFTER `submitted` declaration) ──
  // Skip ALL redirects if user just submitted successfully
  // Prevents success screen from vanishing due to session refresh
  useEffect(() => {
    if (status === 'loading') return;

    // CRITICAL: If user just submitted, freeze on success screen
    // Ignore any session changes triggered by tokenVersion++ bump
    if (submitted) return;

    if (!session) {
      void router.replace(
        `/login?callbackUrl=${encodeURIComponent(router.asPath)}`
      );
      return;
    }

    // Already-approved agent → straight to dashboard
    if (sessionRole === 'agent') {
      void router.replace('/agent/dashboard');
      return;
    }
    // Developers belong on /onboarding/developer
    if (sessionRole === 'developer') {
      void router.replace('/developer/dashboard');
      return;
    }
    // Society users belong on /onboarding/society
    if (sessionRole === 'society') {
      void router.replace('/society/dashboard');
      return;
    }
    // Admins don't need onboarding
    if (sessionRole === 'admin') {
      void router.replace('/admin');
      return;
    }

    // Plain 'user' role — they STAY on this page to apply as agent.
    // No further redirect.
  }, [status, session, sessionRole, router, submitted]);

  // V6.8.2: Determine if user needs to submit CNIC in this form
  // Read from session — set to true if user has already submitted CNIC before
  const userHasCnic = Boolean(
    (session?.user as { cnicVerified?: boolean; cnicLockedAt?: string })?.cnicVerified ||
    (session?.user as { cnicLockedAt?: string })?.cnicLockedAt
  );

  // ── Prefill from session ──
  useEffect(() => {
    if (session?.user) {
      setForm((prev) => ({
        ...prev,
        displayName: prev.displayName || session.user.name  || '',
        orgEmail:    prev.orgEmail    || session.user.email || '',
        repName:     prev.repName     || session.user.name  || '',
      }));
    }
  }, [session]);

  // ── Field Handlers ──
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const target = e.target;
      const value =
        target instanceof HTMLInputElement && target.type === 'checkbox'
          ? target.checked
          : target.value;

      setForm((prev) => ({ ...prev, [target.name]: value }));
      setBanner({ type: '', message: '' });
    },
    []
  );

  const toggleSpecialization = useCallback((value: string) => {
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(value)
        ? prev.specializations.filter((s) => s !== value)
        : [...prev.specializations, value],
    }));
  }, []);

  // V6.8.4: Toggle language selection
  const toggleLanguage = useCallback((value: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(value)
        ? prev.languages.filter((s) => s !== value)
        : [...prev.languages, value],
    }));
  }, []);

  // V6.8.4: Upload profile/logo image (routes to Cloudinary /profiles folder)
  const uploadProfileImage = useCallback(async (
    file: File,
    setState: React.Dispatch<React.SetStateAction<UploadState>>
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      setState((prev) => ({ ...prev, error: 'Image must be less than 5MB.' }));
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setState((prev) => ({ ...prev, error: 'Only JPG, PNG, or WebP images allowed.' }));
      return;
    }

    setState({ file, url: '', uploading: true, error: '' });

    try {
      const fd = new FormData();
      fd.append('file', file);

      // Route to profile-images folder (Cloudinary /profiles)
      const res = await fetch('/api/upload?folder=profile', {
        method: 'POST',
        body:   fd,
      });

      const data = await res.json() as {
        success: boolean;
        data?:   { url: string };
        error?:  string;
      };

      if (res.ok && data.success && data.data?.url) {
        setState({ file, url: data.data.url, uploading: false, error: '' });
      } else {
        throw new Error(data.error ?? 'Upload failed');
      }
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.',
      }));
    }
  }, []);

  const handleProfilePhotoUpload = useCallback((file: File) => {
    void uploadProfileImage(file, setProfilePhotoUpload);
  }, [uploadProfileImage]);

  const handleAgencyLogoUpload = useCallback((file: File) => {
    void uploadProfileImage(file, setAgencyLogoUpload);
  }, [uploadProfileImage]);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setBanner({ type: '', message: '' });
    },
    []
  );

  // ── V6.8.2: CNIC Helpers ──
  // Auto-format CNIC: 3520212345678 → 35202-1234567-8
  const formatCnic = useCallback((raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  }, []);

  const handleCnicNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnic(e.target.value);
    setForm((prev) => ({ ...prev, cnicNumber: formatted }));
    setBanner({ type: '', message: '' });
  }, [formatCnic]);

  // Generic CNIC image upload handler (used for both front and back)
  const uploadCnicImage = useCallback(async (
    file: File,
    setState: React.Dispatch<React.SetStateAction<UploadState>>
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      setState((prev) => ({ ...prev, error: 'File must be less than 5MB.' }));
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setState((prev) => ({ ...prev, error: 'Only JPG, PNG, or WebP images allowed.' }));
      return;
    }

    setState({ file, url: '', uploading: true, error: '' });

    try {
      const fd = new FormData();
      fd.append('file', file);

      // Route to documents folder (which maps to Cloudinary /kyc)
      const res = await fetch('/api/upload?folder=documents', {
        method: 'POST',
        body:   fd,
      });

      const data = await res.json() as {
        success: boolean;
        data?:   { url: string };
        error?:  string;
      };

      if (res.ok && data.success && data.data?.url) {
        setState({ file, url: data.data.url, uploading: false, error: '' });
      } else {
        throw new Error(data.error ?? 'Upload failed');
      }
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.',
      }));
    }
  }, []);

  const handleCnicFrontUpload = useCallback((file: File) => {
    void uploadCnicImage(file, setCnicFrontUpload);
  }, [uploadCnicImage]);

  const handleCnicBackUpload = useCallback((file: File) => {
    void uploadCnicImage(file, setCnicBackUpload);
  }, [uploadCnicImage]);

  // ── File Upload ──
  const handleDocumentUpload = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setUpload((prev) => ({
        ...prev,
        error: 'File must be less than 5MB.',
      }));
      return;
    }

    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    ];
    if (!allowed.includes(file.type)) {
      setUpload((prev) => ({
        ...prev,
        error: 'Only JPG, PNG, WebP or PDF files are allowed.',
      }));
      return;
    }

    setUpload({ file, url: '', uploading: true, error: '' });

    try {
      const fd = new FormData();
      fd.append('file',   file);
      fd.append('folder', 'documents');

      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json() as {
        success: boolean;
        data?:   { url: string };
        error?:  string;
      };

      if (res.ok && data.success && data.data?.url) {
        setUpload({ file, url: data.data.url, uploading: false, error: '' });
      } else {
        throw new Error(data.error ?? 'Upload failed');
      }
    } catch (error: unknown) {
      setUpload((prev) => ({
        ...prev,
        uploading: false,
        error: error instanceof Error
          ? error.message
          : 'Upload failed. Please try again.',
      }));
    }
  }, []);

  // ── Validation ──
  const validate = useCallback((): string | null => {
    // V6.8.2: CNIC validation (only if user doesn't have CNIC yet)
    if (!userHasCnic) {
      if (!form.cnicFullName.trim())
        return 'Full name (as on CNIC) is required.';

      if (form.cnicFullName.trim().length < 3)
        return 'Full name must be at least 3 characters.';

      const cnicDigits = form.cnicNumber.replace(/\D/g, '');
      if (cnicDigits.length !== 13)
        return 'CNIC must be 13 digits (format: 00000-0000000-0).';

      if (!cnicFrontUpload.url)
        return 'Please upload the front image of your CNIC.';

      if (!cnicBackUpload.url)
        return 'Please upload the back image of your CNIC.';
    }

    if (!form.displayName.trim())
      return 'Display name is required.';

    if (!form.agentType)
      return onboardingRole === 'agent'
        ? 'Please select your agent type.'
        : 'Please select your developer type.';

    // V6.8.4: Profile photo is REQUIRED for public trust
    if (!profilePhotoUpload.url)
      return 'Please upload a profile photo. This appears on your public profile.';

    // V6.8.4: If agency type, agency name + size are required
    if (form.agentType === 'agency' && !form.agencyName.trim())
      return 'Agency name is required for agency accounts.';

    if (form.agentType === 'agency' && !form.agencySize)
      return 'Please select your agency size.';

    if (form.languages.length === 0)
      return 'Please select at least one language you speak.';

    if (!form.city)
      return 'Please select your city.';

    if (!form.phone.trim())
      return 'Business phone number is required.';

    const phoneClean = form.phone.trim().replace(/[-\s]/g, '');
    if (!/^(03\d{9}|\+923\d{9})$/.test(phoneClean))
      return 'Please enter a valid Pakistani mobile number (e.g. 03XX-XXXXXXX).';

    if (!form.officeAddress.trim())
      return 'Office address is required.';

    if (form.specializations.length === 0)
      return 'Please select at least one specialization.';

    if (!form.companyRegNo.trim() && !form.ntnNo.trim())
      return 'Please provide Company Registration No or NTN number.';

    if (onboardingRole === 'agent' && !form.licenseNumber.trim())
      return 'Property dealer / agency license number is required.';

    if (!upload.url)
      return 'Please upload your verification document.';

    if (!form.agree)
      return 'Please agree to the terms to continue.';

    return null;
  }, [
    form,
    upload.url,
    onboardingRole,
    userHasCnic,
    cnicFrontUpload.url,
    cnicBackUpload.url,
    profilePhotoUpload.url,
  ]);

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    setBanner({ type: '', message: '' });

    const validationError = validate();
    if (validationError) {
      setBanner({ type: 'error', message: validationError });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        // V6.8.2: CNIC data (only sent if user doesn't have CNIC yet)
        ...(userHasCnic ? {} : {
          cnicNumber:   form.cnicNumber.replace(/\D/g, ''),  // Send digits only
          cnicFullName: sanitizeText(form.cnicFullName, 100),
          cnicFrontUrl: cnicFrontUpload.url,
          cnicBackUrl:  cnicBackUpload.url,
        }),

        // Core — matches /api/onboarding/business exactly
        displayName:        sanitizeText(form.displayName,   80),
        agentType:          form.agentType,
        agencyName:         sanitizeText(form.agencyName,   100),
        agencySize:         form.agentType === 'agency' ? form.agencySize : undefined,
        tagline:            sanitizeText(form.tagline,       80),
        about:              sanitizeText(form.about,        500),
        phone:              sanitizePhone(form.phone),
        whatsapp:           sanitizePhone(form.whatsapp),
        city:               form.city,
        officeAddress:      sanitizeText(form.officeAddress, 200),
        specializations:    form.specializations,
        languages:          form.languages,
        licenseDocumentUrl: upload.url,

        // V6.8.4: Profile branding
        profilePhotoUrl:    profilePhotoUpload.url,
        agencyLogoUrl:      form.agentType === 'agency' ? agencyLogoUpload.url : undefined,

        // Extended
        serviceAreas: {
          localities: sanitizeList(form.serviceAreas, 20),
        },
        experience: {
          years: form.experienceYears
            ? Math.max(0, Math.min(50, parseInt(form.experienceYears, 10)))
            : 0,
        },

        // Compliance
        companyRegNo:  sanitizeText(form.companyRegNo,  40),
        ntnNo:         sanitizeText(form.ntnNo,          20),
        licenseNumber: sanitizeText(form.licenseNumber,  60),

        // Contact
        orgEmail:   sanitizeText(form.orgEmail,   120),
        orgWebsite: sanitizeUrl(form.orgWebsite,  200),
        repName:    sanitizeText(form.repName,     80),
        repRole:    sanitizeText(form.repRole,     60),

        // Social
        socialLinks: {
          facebook:  sanitizeUrl(form.facebookUrl),
          instagram: sanitizeUrl(form.instagramUrl),
          linkedin:  sanitizeUrl(form.linkedinUrl),
        },

        // Consent (CRITICAL — API requires agree === true)
        agree: form.agree,
      };

      const res  = await fetch('/api/onboarding/business', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await res.json() as {
        success:  boolean;
        message?: string;
        error?:   string;
      };

      if (res.ok && data.success) {
        // V6.8.2: Scroll to top BEFORE showing success screen
        // Prevents user from seeing footer when success screen renders
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSubmitted(true);
      } else {
        setBanner({
          type:    'error',
          message: data.message ?? data.error ?? 'Submission failed. Please try again.',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: unknown) {
      setBanner({
        type:    'error',
        message: error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }, [
    form,
    upload.url,
    validate,
    userHasCnic,
    cnicFrontUpload.url,
    cnicBackUpload.url,
    profilePhotoUpload.url,
    agencyLogoUpload.url,
  ]);

  // ── Loading ──
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#029bba] animate-spin" />
      </div>
    );
  }

  // ── Not authed (pre-redirect) ──
  if (!session) return null;

  // ── Success Screen (just submitted OR previously submitted) ──
  // V6.8.2: Check both flags — either shows success screen
  if (submitted || onboardingStatus === 'pending') {
    return <SuccessScreen role={onboardingRole} />;
  }

  const isAgent     = onboardingRole === 'agent';
  const typeOptions = isAgent ? AGENT_TYPES : DEVELOPER_TYPES;
  const roleLabel   = isAgent ? 'Agent' : 'Developer';

  return (
    <>
      <Head>
        <title>
          {isAgent ? 'Agent' : 'Developer'} Onboarding | Highrise.pk
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 
                      py-10 px-4 sm:px-6">
        <div className="w-full max-w-3xl mx-auto">

          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center justify-center gap-2 
                       text-sm text-gray-500 mb-6"
          >
            <Link
              href={isAgent ? '/agent/dashboard' : '/developer/dashboard'}
              className="hover:text-[#029bba] transition-colors"
            >
              Dashboard
            </Link>
            <span aria-hidden="true" className="text-gray-300">/</span>
            <span className="text-gray-700 font-medium" aria-current="page">
              {roleLabel} Onboarding
            </span>
          </nav>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 
                            rounded-2xl bg-[#029bba]/10 border border-[#029bba]/15 
                            mb-4">
              <ShieldCheck className="w-7 h-7 text-[#029bba]" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#004063] mb-2">
              {isAgent ? 'Agent Verification' : 'Developer Verification'}
            </h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Step 2 of 2 — Complete your professional profile to get verified
              and start connecting with clients on Highrise.pk.
            </p>
          </div>

          {/* Banner */}
          {banner.type && (
            <div className="mb-6">
              <Banner state={banner} />
            </div>
          )}

          {/* V6.8.2: Smart Identity Status Banner (SINGLE, INTELLIGENT) */}
          {userHasCnic ? (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 
                            border border-emerald-200 rounded-xl mb-6">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  ✅ Identity Verified
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your CNIC is on file. Just complete your professional 
                  and business details below.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-amber-50 
                            border-l-4 border-amber-400 rounded-r-xl mb-6">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Identity Verification Required
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Complete your CNIC verification below. Once submitted, 
                  your CNIC will be permanently locked for security.
                </p>
              </div>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-gray-200 
                          shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#029bba] to-[#004063]" />

            <div className="p-6 sm:p-8 space-y-8">

              {/* V6.8.2: ── Section 0: Identity Verification (CONDITIONAL) ── */}
              {!userHasCnic && (
                <>
                  <section>
                    <div className="flex items-center gap-2 mb-5">
                      <ShieldCheck className="w-5 h-5 text-[#029bba]" />
                      <h2 className="text-base font-bold text-[#004063]">
                        Identity Verification (CNIC)
                      </h2>
                      <span className="ml-auto text-[10px] font-bold uppercase 
                                       tracking-wider bg-red-50 text-red-600 
                                       px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Full Name */}
                      <FieldInput
                        name="cnicFullName"
                        label="Full Name (as on CNIC)"
                        placeholder="e.g. Muhammad Abdur Rafay"
                        value={form.cnicFullName}
                        onChange={handleChange}
                        icon={<User className="w-4 h-4" />}
                        required
                      />

                      {/* CNIC Number */}
                      <FieldInput
                        name="cnicNumber"
                        label="CNIC Number"
                        placeholder="00000-0000000-0"
                        value={form.cnicNumber}
                        onChange={handleCnicNumberChange}
                        icon={<IdCard className="w-4 h-4" />}
                        hint="13 digits from your Pakistani CNIC"
                        maxLength={15}
                        required
                      />

                      {/* CNIC Front + Back Upload */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* CNIC Front */}
                        <div>
                          <label className="block text-xs font-semibold 
                                            text-gray-700 mb-1.5">
                            CNIC Front Image <span className="text-red-500 ml-1">*</span>
                          </label>
                          <label className={cx(
                            'flex flex-col items-center justify-center w-full h-32',
                            'border-2 border-dashed rounded-xl cursor-pointer transition-all',
                            cnicFrontUpload.error
                              ? 'border-red-300 bg-red-50'
                              : cnicFrontUpload.url
                              ? 'border-green-400 bg-green-50'
                              : 'border-[#029bba]/40 bg-white hover:bg-gray-50 hover:border-[#029bba]'
                          )}>
                            {cnicFrontUpload.uploading ? (
                              <div className="text-center">
                                <Loader2 className="w-8 h-8 text-[#029bba] 
                                                    animate-spin mx-auto mb-1" />
                                <p className="text-xs text-gray-500">Uploading...</p>
                              </div>
                            ) : cnicFrontUpload.url ? (
                              <div className="text-center px-2">
                                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                                <p className="text-xs font-semibold text-green-600">
                                  Front uploaded ✓
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Click to replace
                                </p>
                              </div>
                            ) : (
                              <div className="text-center px-2">
                                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                                <p className="text-xs text-gray-600 font-medium">
                                  Upload Front
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  JPG, PNG • Max 5MB
                                </p>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCnicFrontUpload(file);
                              }}
                            />
                          </label>
                          {cnicFrontUpload.error && (
                            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {cnicFrontUpload.error}
                            </p>
                          )}
                        </div>

                        {/* CNIC Back */}
                        <div>
                          <label className="block text-xs font-semibold 
                                            text-gray-700 mb-1.5">
                            CNIC Back Image <span className="text-red-500 ml-1">*</span>
                          </label>
                          <label className={cx(
                            'flex flex-col items-center justify-center w-full h-32',
                            'border-2 border-dashed rounded-xl cursor-pointer transition-all',
                            cnicBackUpload.error
                              ? 'border-red-300 bg-red-50'
                              : cnicBackUpload.url
                              ? 'border-green-400 bg-green-50'
                              : 'border-[#029bba]/40 bg-white hover:bg-gray-50 hover:border-[#029bba]'
                          )}>
                            {cnicBackUpload.uploading ? (
                              <div className="text-center">
                                <Loader2 className="w-8 h-8 text-[#029bba] 
                                                    animate-spin mx-auto mb-1" />
                                <p className="text-xs text-gray-500">Uploading...</p>
                              </div>
                            ) : cnicBackUpload.url ? (
                              <div className="text-center px-2">
                                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                                <p className="text-xs font-semibold text-green-600">
                                  Back uploaded ✓
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Click to replace
                                </p>
                              </div>
                            ) : (
                              <div className="text-center px-2">
                                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                                <p className="text-xs text-gray-600 font-medium">
                                  Upload Back
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  JPG, PNG • Max 5MB
                                </p>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCnicBackUpload(file);
                              }}
                            />
                          </label>
                          {cnicBackUpload.error && (
                            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {cnicBackUpload.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <hr className="border-gray-100" />
                </>
              )}

              {/* V6.8.4: ── Section 0.5: Profile Photo & Branding ── */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <Camera className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Profile Photo &amp; Branding
                  </h2>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider
                                   bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                    Required
                  </span>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Your profile photo appears on your public profile and builds trust with buyers.
                    Use a clear, professional headshot — no logos or graphics.
                    {form.agentType === 'agency' && ' Your agency logo will appear alongside your name on listings.'}
                  </p>
                </div>

                <div className={`grid gap-4 ${form.agentType === 'agency' ? 'sm:grid-cols-2' : ''}`}>
                  {/* Profile Photo — REQUIRED */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Profile Photo <span className="text-red-500 ml-1">*</span>
                    </label>
                    <label className={cx(
                      'flex flex-col items-center justify-center w-full h-40',
                      'border-2 border-dashed rounded-xl cursor-pointer transition-all',
                      profilePhotoUpload.error
                        ? 'border-red-300 bg-red-50'
                        : profilePhotoUpload.url
                        ? 'border-green-400 bg-green-50'
                        : 'border-[#029bba]/40 bg-white hover:bg-gray-50 hover:border-[#029bba]'
                    )}>
                      {profilePhotoUpload.uploading ? (
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-2" />
                          <p className="text-xs text-gray-500">Uploading...</p>
                        </div>
                      ) : profilePhotoUpload.url ? (
                        <div className="text-center px-2">
                          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white
                                          shadow-md mx-auto mb-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={profilePhotoUpload.url}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs font-semibold text-green-600">
                            Uploaded ✓
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Click to replace
                          </p>
                        </div>
                      ) : (
                        <div className="text-center px-3">
                          <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-600 font-medium">
                            Upload Profile Photo
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            JPG, PNG, WebP • Max 5MB
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProfilePhotoUpload(file);
                        }}
                      />
                    </label>
                    {profilePhotoUpload.error && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {profilePhotoUpload.error}
                      </p>
                    )}
                  </div>

                  {/* Agency Logo — CONDITIONAL (agency only) */}
                  {form.agentType === 'agency' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Agency Logo
                        <span className="text-xs font-normal text-gray-400 ml-1">
                          (optional)
                        </span>
                      </label>
                      <label className={cx(
                        'flex flex-col items-center justify-center w-full h-40',
                        'border-2 border-dashed rounded-xl cursor-pointer transition-all',
                        agencyLogoUpload.error
                          ? 'border-red-300 bg-red-50'
                          : agencyLogoUpload.url
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                      )}>
                        {agencyLogoUpload.uploading ? (
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Uploading...</p>
                          </div>
                        ) : agencyLogoUpload.url ? (
                          <div className="text-center px-2">
                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-white
                                            border border-gray-200 shadow-sm mx-auto mb-2
                                            flex items-center justify-center p-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={agencyLogoUpload.url}
                                alt="Logo preview"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <p className="text-xs font-semibold text-green-600">
                              Uploaded ✓
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Click to replace
                            </p>
                          </div>
                        ) : (
                          <div className="text-center px-3">
                            <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-600 font-medium">
                              Upload Agency Logo
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              PNG or JPG • Square works best
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAgencyLogoUpload(file);
                          }}
                        />
                      </label>
                      {agencyLogoUpload.error && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          {agencyLogoUpload.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Info note about cover photo */}
                <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>
                      You can add a cover photo and more branding assets from your dashboard
                      after your account is approved.
                    </span>
                  </p>
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ── Section 1: Professional Identity ── */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <User className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Professional Identity
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Type Selector */}
                  <div>
                    <label className="block text-xs font-semibold 
                                      text-gray-700 mb-2">
                      {isAgent ? 'Agent Type' : 'Developer Type'}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {typeOptions.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setField('agentType', t.value)}
                          className={cx(
                            'py-2.5 px-3 rounded-xl border text-xs font-medium',
                            'transition-all',
                            form.agentType === t.value
                              ? 'border-[#029bba] bg-[#029bba]/10 text-[#029bba]'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Display Name */}
                  <FieldInput
                    name="displayName"
                    label="Display Name"
                    placeholder="Name shown on your public profile"
                    value={form.displayName}
                    onChange={handleChange}
                    icon={<User className="w-4 h-4" />}
                    required
                  />

                  {/* Agency / Company Name */}
                  <FieldInput
                    name="agencyName"
                    label={isAgent ? 'Agency Name' : 'Company / Developer Name'}
                    placeholder={
                      isAgent
                        ? 'e.g. Estate Legends Pakistan'
                        : 'e.g. Al-Kareem Developers'
                    }
                    value={form.agencyName}
                    onChange={handleChange}
                    icon={<Building2 className="w-4 h-4" />}
                    required={form.agentType === 'agency'}
                  />

                  {/* V6.8.4: Agency Size — only for agency type */}
                  {form.agentType === 'agency' && (
                    <FieldSelect
                      name="agencySize"
                      label="Agency Size"
                      value={form.agencySize}
                      onChange={handleChange}
                      required
                      hint="Helps clients understand your capacity"
                    >
                      <option value="">Select size...</option>
                      {AGENCY_SIZES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </FieldSelect>
                  )}

                  {/* Tagline */}
                  <FieldInput
                    name="tagline"
                    label="Tagline"
                    placeholder="e.g. 10+ years in Lahore real estate"
                    value={form.tagline}
                    onChange={handleChange}
                    hint="Optional — shown under your name on your profile"
                  />

                  {/* Representative */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="repName"
                      label="Representative Name"
                      placeholder="Full name of contact person"
                      value={form.repName}
                      onChange={handleChange}
                      icon={<User className="w-4 h-4" />}
                    />
                    <FieldSelect
                      name="repRole"
                      label="Representative Role"
                      value={form.repRole}
                      onChange={handleChange}
                    >
                      <option value="">Select role...</option>
                      {REP_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </FieldSelect>
                  </div>

                  {/* About */}
                  <div>
                    <label className="block text-xs font-semibold 
                                      text-gray-700 mb-1.5">
                      About
                      <span className="text-xs font-normal text-gray-400 ml-1">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      name="about"
                      value={form.about}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Tell clients about your experience and services..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl 
                                 text-sm focus:ring-2 focus:ring-[#029bba]/20 
                                 focus:border-[#029bba] outline-none transition-all 
                                 resize-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ── Section 2: Contact & Location ── */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <MapPin className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Contact & Location
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Phone + WhatsApp */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="phone"
                      type="tel"
                      label="Business Phone"
                      placeholder="03XX-XXXXXXX"
                      value={form.phone}
                      onChange={handleChange}
                      icon={<Phone className="w-4 h-4" />}
                      required
                    />
                    <FieldInput
                      name="whatsapp"
                      type="tel"
                      label="WhatsApp"
                      placeholder="03XX-XXXXXXX"
                      value={form.whatsapp}
                      onChange={handleChange}
                      icon={<Phone className="w-4 h-4" />}
                      hint="Optional"
                    />
                  </div>

                  {/* Email + Website */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="orgEmail"
                      type="email"
                      label="Business Email"
                      placeholder="office@agency.com"
                      value={form.orgEmail}
                      onChange={handleChange}
                      icon={<Mail className="w-4 h-4" />}
                      hint="Optional"
                    />
                    <FieldInput
                      name="orgWebsite"
                      type="text"
                      label="Website"
                      placeholder="https://yourwebsite.com"
                      value={form.orgWebsite}
                      onChange={handleChange}
                      icon={<Globe className="w-4 h-4" />}
                      hint="Optional"
                    />
                  </div>

                  {/* City */}
                  <FieldSelect
                    name="city"
                    label="City"
                    value={form.city}
                    onChange={handleChange}
                    required
                    hint="Use your official business location"
                  >
                    <option value="">Select city...</option>
                    {PAKISTAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </FieldSelect>

                  {/* Office Address */}
                  <FieldInput
                    name="officeAddress"
                    label="Office Address"
                    placeholder="Shop #, Plaza, Sector / Society, City"
                    value={form.officeAddress}
                    onChange={handleChange}
                    icon={<MapPin className="w-4 h-4" />}
                    required
                  />

                  {/* Service Areas */}
                  <FieldInput
                    name="serviceAreas"
                    label="Service Areas"
                    placeholder="e.g. DHA Phase 6, Bahria Town, Gulberg"
                    value={form.serviceAreas}
                    onChange={handleChange}
                    hint="Optional — separate multiple areas with commas"
                  />
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ── Section 3: Specialization & Experience ── */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <Briefcase className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Specialization & Experience
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Specializations */}
                  <div>
                    <label className="block text-xs font-semibold 
                                      text-gray-700 mb-2">
                      Specializations
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALIZATION_OPTIONS.map((spec) => (
                        <button
                          key={spec.value}
                          type="button"
                          onClick={() => toggleSpecialization(spec.value)}
                          className={cx(
                            'px-4 py-2 rounded-xl border text-xs font-medium',
                            'transition-all',
                            form.specializations.includes(spec.value)
                              ? 'border-[#029bba] bg-[#029bba] text-white'
                              : 'border-gray-200 text-gray-600 hover:border-[#029bba]/40'
                          )}
                        >
                          {spec.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* V6.8.4: Languages Spoken */}
                  <div>
                    <label className="block text-xs font-semibold 
                                      text-gray-700 mb-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5 text-gray-400" />
                        Languages Spoken
                      </span>
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => toggleLanguage(lang.value)}
                          className={cx(
                            'px-4 py-2 rounded-xl border text-xs font-medium',
                            'transition-all',
                            form.languages.includes(lang.value)
                              ? 'border-[#029bba] bg-[#029bba]/10 text-[#029bba]'
                              : 'border-gray-200 text-gray-600 hover:border-[#029bba]/40'
                          )}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Select all languages you can communicate with clients in
                    </p>
                  </div>

                  {/* Experience Years */}
                  <FieldInput
                    name="experienceYears"
                    type="number"
                    label="Years of Experience"
                    placeholder="e.g. 5"
                    value={form.experienceYears}
                    onChange={handleChange}
                    hint="Optional"
                    min="0"
                    max="50"
                  />
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ── Section 4: Compliance & Verification ── */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <IdCard className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Compliance & Verification
                  </h2>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Names can match but your SECP / NTN / License identifiers
                    must be unique. This prevents impersonation and protects
                    your business identity.
                  </p>

                  {/* Reg No + NTN */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="companyRegNo"
                      label={
                        isAgent
                          ? 'SECP / Company Reg No'
                          : 'SECP / Company Reg No'
                      }
                      placeholder={
                        isAgent ? 'Optional' : 'Recommended for developers'
                      }
                      value={form.companyRegNo}
                      onChange={handleChange}
                      icon={<IdCard className="w-4 h-4" />}
                    />
                    <FieldInput
                      name="ntnNo"
                      label="NTN Number"
                      placeholder="Recommended"
                      value={form.ntnNo}
                      onChange={handleChange}
                      icon={<Hash className="w-4 h-4" />}
                    />
                  </div>

                  {/* License Number */}
                  <FieldInput
                    name="licenseNumber"
                    label={
                      isAgent
                        ? 'Property Dealer / Agency License No'
                        : 'Builder / Project License No'
                    }
                    placeholder={
                      isAgent
                        ? 'Required for agents'
                        : 'Optional for developers'
                    }
                    value={form.licenseNumber}
                    onChange={handleChange}
                    icon={<FileText className="w-4 h-4" />}
                    required={isAgent}
                  />

                  {/* Document Upload */}
                  <FileUploadZone
                    state={upload}
                    onChange={handleDocumentUpload}
                  />
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ── Section 5: Social Links ── */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <Globe className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Social Links
                    <span className="text-xs font-normal text-gray-400 ml-2">
                      (optional)
                    </span>
                  </h2>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <FieldInput
                    name="facebookUrl"
                    label="Facebook"
                    placeholder="facebook.com/yourpage"
                    value={form.facebookUrl}
                    onChange={handleChange}
                    icon={<Facebook className="w-4 h-4" />}
                  />
                  <FieldInput
                    name="instagramUrl"
                    label="Instagram"
                    placeholder="instagram.com/yourpage"
                    value={form.instagramUrl}
                    onChange={handleChange}
                    icon={<Instagram className="w-4 h-4" />}
                  />
                  <FieldInput
                    name="linkedinUrl"
                    label="LinkedIn"
                    placeholder="linkedin.com/company/..."
                    value={form.linkedinUrl}
                    onChange={handleChange}
                    icon={<Linkedin className="w-4 h-4" />}
                  />
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ── Section 6: Consent & Submit ── */}
              <section className="space-y-4">

                {/* Anti-fraud note */}
                <div className="bg-amber-50 border border-amber-100 
                                rounded-xl p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Important:</strong> Fake or spam accounts are
                    permanently blocked. Provide accurate business details.
                    All submissions are reviewed by our compliance team.
                  </p>
                </div>

                {/* Consent Checkbox */}
                <label className="flex items-start gap-3 bg-gray-50 
                                  border border-gray-200 rounded-xl p-4 
                                  cursor-pointer">
                  <input
                    type="checkbox"
                    name="agree"
                    checked={form.agree}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 accent-[#029bba] flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I confirm these details are accurate and I agree to
                    Highrise.pk&apos;s verification procedures, anti-fraud
                    checks, and{' '}
                    <Link
                      href="/terms-of-service"
                      className="text-[#029bba] hover:underline"
                    >
                      Terms of Service
                    </Link>
                    .
                  </span>
                </label>

                {/* Banner above button */}
                {banner.type === 'error' && (
                  <Banner state={banner} />
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || upload.uploading}
                  className="w-full h-12 bg-[#029bba] hover:bg-[#027a94] 
                             text-white font-semibold rounded-xl transition-colors 
                             disabled:opacity-60 disabled:cursor-not-allowed 
                             flex items-center justify-center gap-2 text-sm 
                             shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      Submit for Verification
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400">
                  You can update these details later from your dashboard settings.
                </p>
              </section>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Highrise.pk verifies all businesses to protect users and prevent fraud.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Auth handled by middleware (Edge Runtime) ───────────────────────────────
// No getServerSideProps needed — middleware.ts redirects unauthenticated
// users to /login with callbackUrl param before page renders.