// pages/onboarding/developer.tsx
// Developer Business Onboarding — Highrise.pk
// V5.9.0 — Mirrors business.tsx patterns | fetch() only | lucide-react | inline banners
// Role guard via session | KYC awareness | Pending screen | Cloudinary multi-upload

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
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
  Globe,
  Mail,
  Hash,
  IdCard,
  ShieldCheck,
  Briefcase,
  Calendar,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAKISTAN_CITIES = [
  'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
  'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
  'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Mardan', 'Gujrat',
  'Kasur', 'Mingora', 'Abbottabad', 'Murree', 'Jhelum', 'Mirpur',
] as const;

const DEVELOPER_TYPES = [
  { value: 'developer', label: 'Real Estate Developer', secp: true },
  { value: 'builder', label: 'Builder / Constructor', secp: false },
  { value: 'corporate', label: 'Corporate Entity', secp: true },
  { value: 'society', label: 'Housing Society', secp: true },
  { value: 'individual', label: 'Individual Developer', secp: false },
] as const;

const COMPANY_TYPES = [
  'Private Limited Company',
  'Public Limited Company',
  'Partnership',
  'Sole Proprietorship',
  'Single Member Company (SMC)',
  'Limited Liability Partnership (LLP)',
  'Cooperative Society',
  'Other',
] as const;

const AUTH_PERSON_DESIGNATIONS = [
  'CEO', 'Managing Director', 'Director', 'Owner', 'Partner',
  'General Manager', 'Chief Operating Officer', 'Authorized Signatory',
] as const;

const SECP_REQUIRED_TYPES = new Set(['developer', 'corporate', 'society']);

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  // Company identity
  developerType: string;
  companyName: string;
  companyType: string;
  establishedYear: string;
  tagline: string;
  description: string;
  ceoName: string;

  // Compliance numbers
  ntnNumber: string;
  secpNumber: string;

  // Authorized person
  authorizedPersonName: string;
  authorizedPersonCnic: string;
  authorizedPersonPhone: string;
  authorizedPersonEmail: string;
  authorizedPersonDesignation: string;

  // Contact
  phone: string;
  whatsapp: string;
  email: string;
  website: string;

  // Location
  city: string;
  officeAddress: string;
  operatingCities: string;   // comma-separated
  serviceAreas: string;      // comma-separated

  // Consent
  agree: boolean;
}

interface CloudinaryAsset {
  url: string;
  public_id: string;
}

interface SingleUploadState {
  file: File | null;
  asset: CloudinaryAsset | null;
  uploading: boolean;
  error: string;
}

interface MultiUploadState {
  assets: CloudinaryAsset[];
  fileNames: string[];
  uploading: boolean;
  error: string;
}

interface BannerState {
  type: 'success' | 'error' | 'info' | '';
  message: string;
}

// ─── Sanitize helpers ─────────────────────────────────────────────────────────

function sanitizeText(v: string, max = 120): string {
  return String(v ?? '').trim().slice(0, max);
}

function sanitizePhone(v: string): string {
  return String(v ?? '').trim().replace(/[^\d+\-\s]/g, '').slice(0, 20);
}

function sanitizeCnic(v: string): string {
  return String(v ?? '').replace(/\D/g, '').slice(0, 13);
}

function sanitizeList(v: string, max = 20): string[] {
  return String(v ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldInput({
  icon,
  label,
  hint,
  error,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
  label?: string;
  hint?: string;
  error?: string;
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
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
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
      {hint && !error && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
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
  label?: string;
  hint?: string;
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
          'text-sm text-gray-900 outline-none transition-all',
          'focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]',
          props.className
        )}
      >
        {children}
      </select>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Banner({ state }: { state: BannerState }) {
  if (!state.type) return null;
  const config = {
    success: { className: 'bg-green-50 border-green-400 text-green-800', Icon: CheckCircle },
    error: { className: 'bg-red-50 border-red-400 text-red-800', Icon: AlertCircle },
    info: { className: 'bg-blue-50 border-blue-400 text-blue-800', Icon: Info },
  }[state.type];
  const { Icon } = config;
  return (
    <div className={`flex items-start gap-3 p-4 border-l-4 rounded-r-xl ${config.className}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm font-medium">{state.message}</p>
    </div>
  );
}

// ─── Single Document Upload ──────────────────────────────────────────────────

function SingleDocUpload({
  label,
  required,
  state,
  onChange,
  hint,
}: {
  label: string;
  required?: boolean;
  state: SingleUploadState;
  onChange: (file: File) => void;
  hint?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onChange(file);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <label
        className={cx(
          'flex flex-col items-center justify-center w-full h-32',
          'border-2 border-dashed rounded-xl cursor-pointer transition-all',
          state.error
            ? 'border-red-300 bg-red-50'
            : state.asset
            ? 'border-green-400 bg-green-50'
            : 'border-[#029bba]/40 bg-white hover:bg-gray-50 hover:border-[#029bba]'
        )}
      >
        {state.uploading ? (
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500">Uploading...</p>
          </div>
        ) : state.asset ? (
          <div className="text-center px-4">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-green-700 line-clamp-1">
              {state.file?.name ?? 'Document uploaded'}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Click to replace</p>
          </div>
        ) : (
          <div className="text-center px-4">
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-600 font-medium">Click to upload</p>
            <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, PDF · Max 5MB</p>
          </div>
        )}
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleChange} />
      </label>

      {hint && !state.error && (
        <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
      )}
      {state.error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {state.error}
        </p>
      )}
    </div>
  );
}

// ─── Multi-Document Upload (Past Projects) ───────────────────────────────────

function MultiDocUpload({
  label,
  required,
  state,
  onAdd,
  onRemove,
  maxItems = 5,
  hint,
}: {
  label: string;
  required?: boolean;
  state: MultiUploadState;
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
  maxItems?: number;
  hint?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && state.assets.length < maxItems) onAdd(file);
    e.target.value = '';
  };

  const canUploadMore = state.assets.length < maxItems;

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        <span className="text-[11px] font-normal text-gray-400 ml-2">
          ({state.assets.length}/{maxItems})
        </span>
      </label>

      {/* Uploaded items list */}
      {state.assets.length > 0 && (
        <div className="space-y-2 mb-3">
          {state.assets.map((asset, idx) => (
            <div
              key={asset.public_id}
              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ImageIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-xs text-green-800 truncate">
                  {state.fileNames[idx] ?? `Document ${idx + 1}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="text-red-500 hover:text-red-700 p-1"
                aria-label="Remove document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {canUploadMore && (
        <label
          className={cx(
            'flex flex-col items-center justify-center w-full h-28',
            'border-2 border-dashed rounded-xl cursor-pointer transition-all',
            state.error
              ? 'border-red-300 bg-red-50'
              : 'border-[#029bba]/40 bg-white hover:bg-gray-50 hover:border-[#029bba]'
          )}
        >
          {state.uploading ? (
            <div className="text-center">
              <Loader2 className="w-7 h-7 text-[#029bba] animate-spin mx-auto mb-1" />
              <p className="text-xs text-gray-500">Uploading...</p>
            </div>
          ) : (
            <div className="text-center px-4">
              <Upload className="w-7 h-7 text-gray-300 mx-auto mb-1" />
              <p className="text-xs text-gray-600 font-medium">Add document</p>
              <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, PDF · Max 5MB</p>
            </div>
          )}
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleChange} />
        </label>
      )}

      {hint && !state.error && (
        <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
      )}
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

function SuccessScreen() {
  return (
    <>
      <Head>
        <title>Application Under Review | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#004063] mb-3">
            Application Under Review
          </h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Your developer application has been received. Our compliance team
            typically reviews submissions within{' '}
            <strong>1–3 business days</strong>. You will receive an email once
            a decision is made.
          </p>

          <div className="text-left space-y-3 mb-8">
            {[
              { label: 'Application received', done: true },
              { label: 'SECP & NTN verification', done: false },
              { label: 'Authorized person CNIC check', done: false },
              { label: 'Past projects review', done: false },
              { label: 'Developer dashboard unlocked', done: false },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={cx(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {done ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <span
                  className={cx(
                    'text-sm',
                    done ? 'text-green-700 font-medium' : 'text-gray-500'
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#029bba] text-white rounded-xl font-semibold text-sm hover:bg-[#027a94] transition-colors"
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

export default function DeveloperOnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const sessionRole = session?.user?.role;
  const onboardingStatus = session?.user?.onboardingStatus ?? 'none';

  // ── Auth & Role Guard ──
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      void router.replace(
        `/login?callbackUrl=${encodeURIComponent(router.asPath)}`
      );
      return;
    }

    if (sessionRole === 'developer') {
      void router.replace('/developer/dashboard');
      return;
    }
    if (sessionRole === 'agent') {
      void router.replace('/agent/dashboard');
      return;
    }
    if (sessionRole === 'society') {
      void router.replace('/society/dashboard');
      return;
    }
    if (sessionRole === 'admin') {
      void router.replace('/admin');
      return;
    }
  }, [status, session, sessionRole, router]);

  // ── Form State ──
  const [form, setForm] = useState<FormState>({
    developerType: 'developer',
    companyName: '',
    companyType: '',
    establishedYear: String(new Date().getFullYear()),
    tagline: '',
    description: '',
    ceoName: '',

    ntnNumber: '',
    secpNumber: '',

    authorizedPersonName: session?.user?.name ?? '',
    authorizedPersonCnic: '',
    authorizedPersonPhone: '',
    authorizedPersonEmail: session?.user?.email ?? '',
    authorizedPersonDesignation: '',

    phone: '',
    whatsapp: '',
    email: session?.user?.email ?? '',
    website: '',

    city: '',
    officeAddress: '',
    operatingCities: '',
    serviceAreas: '',

    agree: false,
  });

  const [ntnDoc, setNtnDoc] = useState<SingleUploadState>({
    file: null, asset: null, uploading: false, error: '',
  });

  const [secpDoc, setSecpDoc] = useState<SingleUploadState>({
    file: null, asset: null, uploading: false, error: '',
  });

  const [pastProjects, setPastProjects] = useState<MultiUploadState>({
    assets: [], fileNames: [], uploading: false, error: '',
  });

  const [banner, setBanner] = useState<BannerState>({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Prefill from session ──
  useEffect(() => {
    if (session?.user) {
      setForm((prev) => ({
        ...prev,
        authorizedPersonName: prev.authorizedPersonName || session.user.name || '',
        authorizedPersonEmail: prev.authorizedPersonEmail || session.user.email || '',
        email: prev.email || session.user.email || '',
      }));
    }
  }, [session]);

  // ── Field Handlers ──
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setBanner({ type: '', message: '' });
    },
    []
  );

  // ── Cloudinary upload helper ──
  const uploadToCloudinary = useCallback(
    async (file: File): Promise<CloudinaryAsset | null> => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowed.includes(file.type)) {
        throw new Error('Only JPG, PNG, WebP or PDF files are allowed.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File must be less than 5MB.');
      }

      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'documents');

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as {
        success: boolean;
        data?: { url: string; public_id?: string };
        error?: string;
      };

      if (!res.ok || !data.success || !data.data?.url || !data.data?.public_id) {
        throw new Error(data.error ?? 'Upload failed');
      }

      return {
        url: data.data.url,
        public_id: data.data.public_id,
      };
    },
    []
  );

  // ── NTN doc upload ──
  const handleNtnUpload = useCallback(
    async (file: File) => {
      setNtnDoc({ file, asset: null, uploading: true, error: '' });
      try {
        const asset = await uploadToCloudinary(file);
        setNtnDoc({ file, asset, uploading: false, error: '' });
      } catch (err: unknown) {
        setNtnDoc({
          file: null,
          asset: null,
          uploading: false,
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    },
    [uploadToCloudinary]
  );

  // ── SECP doc upload ──
  const handleSecpUpload = useCallback(
    async (file: File) => {
      setSecpDoc({ file, asset: null, uploading: true, error: '' });
      try {
        const asset = await uploadToCloudinary(file);
        setSecpDoc({ file, asset, uploading: false, error: '' });
      } catch (err: unknown) {
        setSecpDoc({
          file: null,
          asset: null,
          uploading: false,
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    },
    [uploadToCloudinary]
  );

  // ── Past project add ──
  const handlePastProjectAdd = useCallback(
    async (file: File) => {
      setPastProjects((prev) => ({ ...prev, uploading: true, error: '' }));
      try {
        const asset = await uploadToCloudinary(file);
        if (asset) {
          setPastProjects((prev) => ({
            assets: [...prev.assets, asset],
            fileNames: [...prev.fileNames, file.name],
            uploading: false,
            error: '',
          }));
        }
      } catch (err: unknown) {
        setPastProjects((prev) => ({
          ...prev,
          uploading: false,
          error: err instanceof Error ? err.message : 'Upload failed',
        }));
      }
    },
    [uploadToCloudinary]
  );

  // ── Past project remove ──
  const handlePastProjectRemove = useCallback((idx: number) => {
    setPastProjects((prev) => ({
      assets: prev.assets.filter((_, i) => i !== idx),
      fileNames: prev.fileNames.filter((_, i) => i !== idx),
      uploading: false,
      error: '',
    }));
  }, []);

  // ── Validation ──
  const validate = useCallback((): string | null => {
    if (!form.developerType) return 'Please select a developer type.';
    if (!form.companyName.trim() || form.companyName.trim().length < 3)
      return 'Company name is required (minimum 3 characters).';
    if (!form.companyType) return 'Please select your company type.';

    const year = parseInt(form.establishedYear, 10);
    if (!Number.isFinite(year) || year < 1900 || year > new Date().getFullYear())
      return 'Please enter a valid established year.';

    if (!form.city) return 'Primary city is required.';
    if (!form.officeAddress.trim()) return 'Office address is required.';

    if (!form.phone.trim()) return 'Company phone number is required.';
    const phoneClean = form.phone.trim().replace(/[-\s]/g, '');
    if (!/^(03\d{9}|\+923\d{9})$/.test(phoneClean))
      return 'Please enter a valid Pakistani mobile number (e.g. 03XX-XXXXXXX).';

    if (!form.authorizedPersonName.trim())
      return 'Authorized person name is required.';
    if (!form.authorizedPersonCnic || form.authorizedPersonCnic.length !== 13)
      return 'Authorized person CNIC must be 13 digits.';
    if (!form.authorizedPersonDesignation)
      return 'Authorized person designation is required.';

    if (!form.ntnNumber.trim()) return 'NTN number is required.';
    if (!ntnDoc.asset) return 'Please upload your NTN certificate.';

    const secpRequired = SECP_REQUIRED_TYPES.has(form.developerType);
    if (secpRequired) {
      if (!form.secpNumber.trim())
        return 'SECP registration number is required for this developer type.';
      if (!secpDoc.asset)
        return 'Please upload your SECP certificate.';
    }

    if (pastProjects.assets.length === 0)
      return 'Please upload at least one past project document or portfolio.';

    if (!form.agree) return 'Please agree to the terms to continue.';

    return null;
  }, [form, ntnDoc.asset, secpDoc.asset, pastProjects.assets.length]);

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
        developerType: form.developerType,
        companyName: sanitizeText(form.companyName, 150),
        companyType: form.companyType,
        establishedYear: parseInt(form.establishedYear, 10),
        tagline: sanitizeText(form.tagline, 200),
        description: sanitizeText(form.description, 2000),
        ceoName: sanitizeText(form.ceoName, 100),

        ntnNumber: sanitizeText(form.ntnNumber, 20),
        secpNumber: sanitizeText(form.secpNumber, 30),

        authorizedPersonName: sanitizeText(form.authorizedPersonName, 100),
        authorizedPersonCnic: form.authorizedPersonCnic,
        authorizedPersonPhone: sanitizePhone(form.authorizedPersonPhone),
        authorizedPersonEmail: sanitizeText(form.authorizedPersonEmail, 120),
        authorizedPersonDesignation: form.authorizedPersonDesignation,

        phone: sanitizePhone(form.phone),
        whatsapp: sanitizePhone(form.whatsapp),
        email: sanitizeText(form.email, 120),
        website: sanitizeText(form.website, 200),

        city: form.city,
        officeAddress: sanitizeText(form.officeAddress, 200),
        operatingCities: sanitizeList(form.operatingCities, 20),
        serviceAreas: sanitizeList(form.serviceAreas, 30),

        ntnCertificateUrl: ntnDoc.asset?.url ?? '',
        ntnCertificatePublicId: ntnDoc.asset?.public_id ?? '',
        secpCertificateUrl: secpDoc.asset?.url ?? '',
        secpCertificatePublicId: secpDoc.asset?.public_id ?? '',
        pastProjects: pastProjects.assets,

        agree: form.agree,
      };

      const res = await fetch('/api/onboarding/developer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        error?: string;
      };

      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setBanner({
          type: 'error',
          message: data.message ?? data.error ?? 'Submission failed. Please try again.',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }, [form, ntnDoc.asset, secpDoc.asset, pastProjects.assets, validate]);

  // ── Loading state ──
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#029bba] animate-spin" />
      </div>
    );
  }

  if (!session) return null;
  if (submitted) return <SuccessScreen />;
  if (onboardingStatus === 'pending') return <SuccessScreen />;

  const secpRequired = SECP_REQUIRED_TYPES.has(form.developerType);

  return (
    <>
      <Head>
        <title>Developer Onboarding | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10 px-4 sm:px-6">
        <div className="w-full max-w-3xl mx-auto">

          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6"
          >
            <Link href="/dashboard" className="hover:text-[#029bba] transition-colors">
              Dashboard
            </Link>
            <span aria-hidden="true" className="text-gray-300">/</span>
            <span className="text-gray-700 font-medium" aria-current="page">
              Developer Onboarding
            </span>
          </nav>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#029bba]/10 border border-[#029bba]/15 mb-4">
              <ShieldCheck className="w-7 h-7 text-[#029bba]" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#004063] mb-2">
              Developer Verification
            </h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Complete your company profile to get verified and start listing
              projects on Highrise.pk.
            </p>
          </div>

          {/* Banner */}
          {banner.type && (
            <div className="mb-6">
              <Banner state={banner} />
            </div>
          )}

          {/* Identity note */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
            <Info className="w-5 h-5 text-[#029bba] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#004063]">
                Identity Already Verified
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Your CNIC was verified during account creation. Authorized
                person CNIC must match the person legally authorized to sign
                for your company.
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#029bba] to-[#004063]" />

            <div className="p-6 sm:p-8 space-y-8">

              {/* ── Section 1: Company Identity ── */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <Building2 className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Company Identity
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Developer Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Developer Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DEVELOPER_TYPES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setField('developerType', t.value)}
                          className={cx(
                            'py-2.5 px-3 rounded-xl border text-xs font-medium transition-all text-left',
                            form.developerType === t.value
                              ? 'border-[#029bba] bg-[#029bba]/10 text-[#029bba]'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          )}
                        >
                          {t.label}
                          {t.secp && (
                            <span className="block text-[10px] text-gray-400 mt-0.5">
                              SECP required
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Company Name + Type */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="companyName"
                      label="Company Name"
                      placeholder="e.g. Al-Kareem Developers"
                      value={form.companyName}
                      onChange={handleChange}
                      icon={<Building2 className="w-4 h-4" />}
                      required
                    />
                    <FieldSelect
                      name="companyType"
                      label="Company Type"
                      value={form.companyType}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select type...</option>
                      {COMPANY_TYPES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </FieldSelect>
                  </div>

                  {/* Established Year + CEO */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="establishedYear"
                      type="number"
                      label="Established Year"
                      placeholder="e.g. 2015"
                      value={form.establishedYear}
                      onChange={handleChange}
                      icon={<Calendar className="w-4 h-4" />}
                      min="1900"
                      max={new Date().getFullYear()}
                      required
                    />
                    <FieldInput
                      name="ceoName"
                      label="CEO Name"
                      placeholder="Full name of CEO"
                      value={form.ceoName}
                      onChange={handleChange}
                      icon={<User className="w-4 h-4" />}
                      hint="Optional"
                    />
                  </div>

                  {/* Tagline */}
                  <FieldInput
                    name="tagline"
                    label="Tagline"
                    placeholder="e.g. Building Pakistan's premium communities since 2010"
                    value={form.tagline}
                    onChange={handleChange}
                    hint="Optional — shown on your public profile"
                  />

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Company Description
                      <span className="text-xs font-normal text-gray-400 ml-1">(optional)</span>
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={4}
                      maxLength={2000}
                      placeholder="Brief description of your company, projects, and expertise..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none transition-all resize-none placeholder:text-gray-400"
                    />
                    <p className="text-[11px] text-gray-400 mt-1 text-right">
                      {form.description.length} / 2000
                    </p>
                  </div>
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ── Section 2: Authorized Person ── */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <User className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Authorized Person
                  </h2>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    The authorized person is the individual legally authorized
                    to sign for your company. This person&apos;s CNIC is verified
                    separately and must be unique across Highrise.pk.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="authorizedPersonName"
                      label="Full Name (as per CNIC)"
                      placeholder="Ahmad Khan"
                      value={form.authorizedPersonName}
                      onChange={handleChange}
                      icon={<User className="w-4 h-4" />}
                      required
                    />
                    <FieldSelect
                      name="authorizedPersonDesignation"
                      label="Designation"
                      value={form.authorizedPersonDesignation}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select designation...</option>
                      {AUTH_PERSON_DESIGNATIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </FieldSelect>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="authorizedPersonCnic"
                      label="CNIC (13 digits, no dashes)"
                      placeholder="3520112345671"
                      value={form.authorizedPersonCnic}
                      onChange={(e) =>
                        setField('authorizedPersonCnic', sanitizeCnic(e.target.value))
                      }
                      icon={<IdCard className="w-4 h-4" />}
                      maxLength={13}
                      hint={`${form.authorizedPersonCnic.length}/13`}
                      required
                    />
                    <FieldInput
                      name="authorizedPersonPhone"
                      type="tel"
                      label="Personal Phone"
                      placeholder="03XX-XXXXXXX"
                      value={form.authorizedPersonPhone}
                      onChange={handleChange}
                      icon={<Phone className="w-4 h-4" />}
                      hint="Optional"
                    />
                  </div>

                  <FieldInput
                    name="authorizedPersonEmail"
                    type="email"
                    label="Personal Email"
                    placeholder="ahmad@example.com"
                    value={form.authorizedPersonEmail}
                    onChange={handleChange}
                    icon={<Mail className="w-4 h-4" />}
                    hint="Optional"
                  />
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ── Section 3: Contact & Location ── */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <MapPin className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Contact & Location
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="phone"
                      type="tel"
                      label="Company Phone"
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
                      hint="Optional — defaults to company phone"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="email"
                      type="email"
                      label="Company Email"
                      placeholder="info@yourcompany.com"
                      value={form.email}
                      onChange={handleChange}
                      icon={<Mail className="w-4 h-4" />}
                      required
                    />
                    <FieldInput
                      name="website"
                      type="text"
                      label="Company Website"
                      placeholder="https://yourcompany.com"
                      value={form.website}
                      onChange={handleChange}
                      icon={<Globe className="w-4 h-4" />}
                      hint="Optional"
                    />
                  </div>

                  <FieldSelect
                    name="city"
                    label="Primary City"
                    value={form.city}
                    onChange={handleChange}
                    required
                    hint="Your headquarters location"
                  >
                    <option value="">Select city...</option>
                    {PAKISTAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </FieldSelect>

                  <FieldInput
                    name="officeAddress"
                    label="Office Address"
                    placeholder="Office #, Floor, Plaza, Sector / Area, City"
                    value={form.officeAddress}
                    onChange={handleChange}
                    icon={<MapPin className="w-4 h-4" />}
                    required
                  />

                  <FieldInput
                    name="operatingCities"
                    label="Other Operating Cities"
                    placeholder="e.g. Islamabad, Karachi, Multan"
                    value={form.operatingCities}
                    onChange={handleChange}
                    hint="Optional — separate with commas (primary city auto-included)"
                  />

                  <FieldInput
                    name="serviceAreas"
                    label="Service Areas / Localities"
                    placeholder="e.g. DHA Phase 6, Bahria Town, Gulberg"
                    value={form.serviceAreas}
                    onChange={handleChange}
                    hint="Optional — specific areas you operate in"
                  />
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ── Section 4: Compliance & Legal Documents ── */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <IdCard className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-[#004063]">
                    Compliance & Legal Documents
                  </h2>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    NTN is mandatory for all developers (FBR requirement). SECP
                    registration is required for{' '}
                    <strong>Real Estate Developers, Corporate Entities, and Housing Societies</strong>.
                  </p>

                  {/* NTN */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldInput
                      name="ntnNumber"
                      label="NTN Number"
                      placeholder="e.g. 1234567-8"
                      value={form.ntnNumber}
                      onChange={handleChange}
                      icon={<Hash className="w-4 h-4" />}
                      required
                    />
                    <SingleDocUpload
                      label="NTN Certificate"
                      required
                      state={ntnDoc}
                      onChange={handleNtnUpload}
                      hint="Upload your FBR NTN certificate"
                    />
                  </div>

                  {/* SECP (conditional) */}
                  {secpRequired && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FieldInput
                        name="secpNumber"
                        label="SECP Registration No"
                        placeholder="e.g. 0123456"
                        value={form.secpNumber}
                        onChange={handleChange}
                        icon={<IdCard className="w-4 h-4" />}
                        required
                      />
                      <SingleDocUpload
                        label="SECP Certificate"
                        required
                        state={secpDoc}
                        onChange={handleSecpUpload}
                        hint="Upload your SECP incorporation certificate"
                      />
                    </div>
                  )}

                  {/* Past Projects */}
                  <MultiDocUpload
                    label="Past Projects Portfolio"
                    required
                    state={pastProjects}
                    onAdd={handlePastProjectAdd}
                    onRemove={handlePastProjectRemove}
                    maxItems={5}
                    hint="Upload project brochures, completion certificates, or portfolio (at least 1 required, up to 5)"
                  />
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* ── Section 5: Consent & Submit ── */}
              <section className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-sm text-amber-800 leading-relaxed">
                    <strong>Important:</strong> Fake or fraudulent applications
                    result in permanent platform bans. All documents will be
                    verified against FBR and SECP records. Provide accurate
                    information only.
                  </p>
                </div>

                <label className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agree"
                    checked={form.agree}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 accent-[#029bba] flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I confirm all submitted details and documents are accurate
                    and authentic. I authorize Highrise.pk to verify these
                    details with FBR, SECP, and other authorities. I agree to
                    Highrise.pk&apos;s{' '}
                    <Link href="/terms-of-service" className="text-[#029bba] hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy-policy" className="text-[#029bba] hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                {banner.type === 'error' && <Banner state={banner} />}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || ntnDoc.uploading || secpDoc.uploading || pastProjects.uploading}
                  className="w-full h-12 bg-[#029bba] hover:bg-[#027a94] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm"
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
                  Review takes 1–3 business days. You will be notified by email.
                </p>
              </section>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Highrise.pk verifies all developers to protect buyers and prevent fraud.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Auth handled by middleware (Edge Runtime) ───────────────────────────────
// No getServerSideProps needed — middleware.ts redirects unauthenticated
// users to /login with callbackUrl param before page renders.