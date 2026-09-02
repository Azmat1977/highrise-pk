// pages/developer/profile.tsx
// ═══════════════════════════════════════════════════════════════
// DEVELOPER PROFILE EDIT — Highrise.pk V6.4.5+
// ═══════════════════════════════════════════════════════════════
// ✅ J.3.1: NTN Certificate mandatory
// ✅ J.3.2: Portfolio = CompletedProjectRepeater (replaces numbers)
// ✅ J.3.3: CNIC front + back images mandatory
// ✅ J.4.5: EmailVerifyField for company + auth person emails
// ✅ Profile Completion Card at top (% + missing items)
// ✅ Sticky sub-navigation (8 sections, smooth scroll)
// ✅ KYC locked fields — read-only when locked
// ✅ Social media links (5 platforms)
// ✅ Sticky save bar (disabled when no changes)
// ✅ Inline banners (auto-dismiss success)
// ✅ fetch() only — no apiClient
// ✅ No banned patterns, strict TypeScript
// ═══════════════════════════════════════════════════════════════

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import Head from "next/head";
import Image from "next/image";
import {
  Building2,
  User,
  Phone,
  MapPin,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Save,
  Lock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Upload,
  Award,
  Sparkles,
  Globe,
  Plus,
  X,
} from "lucide-react";
import DeveloperLayout from "@/components/developer/DeveloperLayout";
import {
  useDeveloperContext,
  type DeveloperProfileSnap,
} from "@/components/developer/DeveloperContext";
import CompletedProjectRepeater, {
  type CompletedProject,
} from "@/components/developer/CompletedProjectRepeater";
import EmailVerifyField from "@/components/shared/EmailVerifyField";

// ============================================
// TYPES
// ============================================

interface CloudinaryRef {
  url: string;
  public_id: string;
  // Facebook-style cover focal position (0-100%) — optional, cover only
  focalY?: number;
}

interface UploadState {
  uploading: boolean;
  error: string | null;
  ref: CloudinaryRef | null;
}

interface FormState {
  companyName: string;
  companyType: string;
  developerType: string;
  establishedYear: string;
  description: string;
  tagline: string;
  ceoName: string;
  ntnNumber: string;
  secpNumber: string;
  strn: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  officeAddress: string;
  city: string;
  authorizedPersonName: string;
  authorizedPersonCNIC: string;
  authorizedPersonPhone: string;
  authorizedPersonEmail: string;
  authorizedPersonDesignation: string;
  facebook: string;
  linkedin: string;
  instagram: string;
  youtube: string;
  twitter: string;
  metaTitle: string;
  metaDescription: string;
}

interface ApiResponse {
  success: boolean;
  data?: DeveloperProfileSnap;
  error?: string;
  message?: string;
}

interface UploadApiResponse {
  success: boolean;
  data?: { url: string; publicId: string };
  error?: string;
}

// ============================================
// CONSTANTS
// ============================================

const DEVELOPER_TYPES = [
  { value: "builder", label: "Builder" },
  { value: "developer", label: "Developer" },
  { value: "society", label: "Society / Housing Scheme" },
  { value: "corporate", label: "Corporate Real Estate" },
  { value: "individual", label: "Individual Developer" },
] as const;

const COMPANY_TYPES = [
  { value: "private_limited", label: "Private Limited" },
  { value: "public_limited", label: "Public Limited" },
  { value: "partnership", label: "Partnership" },
  { value: "sole_proprietor", label: "Sole Proprietor" },
  { value: "society", label: "Cooperative Society" },
  { value: "trust", label: "Trust" },
] as const;

const PAKISTAN_CITIES = [
  "Islamabad", "Rawalpindi", "Lahore", "Karachi", "Peshawar",
  "Quetta", "Faisalabad", "Multan", "Sialkot", "Gujranwala",
  "Hyderabad", "Abbottabad", "Murree", "Bahria Town", "DHA",
] as const;

const CURRENT_YEAR = new Date().getFullYear();

const COMPLETION_CRITERIA: Array<{
  key: string;
  label: string;
  check: (p: DeveloperProfileSnap) => boolean;
}> = [
  { key: "companyName", label: "Company name",
    check: (p) => Boolean(p.companyName?.trim()) },
  { key: "description", label: "Company description (50+ chars)",
    check: (p) => Boolean(p.description && p.description.length > 50) },
  { key: "logo", label: "Company logo",
    check: (p) => Boolean(p.logo?.url) },
  { key: "coverImage", label: "Cover image",
    check: (p) => Boolean(p.coverImage?.url) },
  { key: "ntnNumberMasked", label: "NTN number",
    check: (p) => Boolean(p.ntnNumberMasked && p.ntnNumberMasked !== "Not provided") },
  { key: "secpNumberMasked", label: "SECP number",
    check: (p) => Boolean(p.secpNumberMasked && p.secpNumberMasked !== "Not provided") },
  { key: "officeAddress", label: "Office address",
    check: (p) => Boolean(p.officeAddress?.trim()) },
  { key: "city", label: "City",
    check: (p) => Boolean(p.city?.trim()) },
  { key: "authorizedPersonName", label: "Authorized person name",
    check: (p) => Boolean(p.authorizedPersonName?.trim()) },
  { key: "secpCertificate", label: "SECP certificate document",
    check: (p) => Boolean(p.legalDocs?.secpCertificate?.url) },
];

// ============================================
// STYLE HELPERS
// ============================================

const inputCls = [
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3",
  "text-sm text-[#333333] shadow-sm outline-none transition",
  "focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20",
  "placeholder:text-gray-400",
  "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
].join(" ");

const labelCls = "block text-sm font-semibold text-[#333333] mb-1.5";
const helpCls = "text-xs text-[#666666] mt-1.5";

// ============================================
// SECTION IDS
// ============================================

const SECTIONS = [
  { id: "section-media", label: "Media" },
  { id: "section-company", label: "Company" },
  { id: "section-kyc", label: "Registration" },
  { id: "section-contact", label: "Contact" },
  { id: "section-authorized", label: "Authorized Person" },
  { id: "section-portfolio", label: "Portfolio" },
  { id: "section-social", label: "Social" },
  { id: "section-seo", label: "SEO" },
] as const;

// ============================================
// SUB-COMPONENTS
// ============================================

function Section({
  id, title, subtitle, icon, children,
}: {
  id: string; title: string; subtitle?: string;
  icon?: React.ReactElement; children: React.ReactNode;
}): React.ReactElement {
  return (
    <div id={id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden scroll-mt-32">
      <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center text-[#029bba] shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-[#004063]">{title}</h2>
            {subtitle && <p className="text-xs text-[#666666] mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

function KycLockedField({ label, maskedValue }: {
  label: string; maskedValue: string;
}): React.ReactElement {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
        <Lock className="w-4 h-4 text-[#666666] shrink-0" />
        <span className="text-sm text-[#666666] font-mono">{maskedValue}</span>
      </div>
      <p className={helpCls}>Locked after KYC submission. Contact support to update.</p>
    </div>
  );
}

function FileUploadField({
  label, required, accept, folder, currentUrl,
  uploadState, onUpload, helpText, isImage = true,
}: {
  label: string; required?: boolean; accept: string;
  folder: string; currentUrl?: string;
  uploadState: UploadState;
  onUpload: (ref: CloudinaryRef) => void;
  helpText?: string; isImage?: boolean;
}): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("File too large. Maximum size is 10MB.");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      if (file.size === 0) {
        setUploadError("File appears to be empty.");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      setUploading(true);
      setUploadError(null);
      try {
        const formData = new FormData();
        formData.append("file", file, file.name);
        const res = await fetch(`/api/upload?folder=${folder}`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const data = (await res.json()) as UploadApiResponse;
        if (data.success && data.data) {
          onUpload({ url: data.data.url, public_id: data.data.publicId });
        } else {
          setUploadError(data.error ?? `Upload failed (HTTP ${res.status}).`);
        }
      } catch (err: unknown) {
        setUploadError(
          err instanceof Error ? `Upload failed: ${err.message}` : "Upload failed."
        );
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    }, [folder, onUpload]
  );

  const displayUrl = uploadState.ref?.url ?? currentUrl;

  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="text-[#ef4444] ml-0.5">*</span>}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#029bba] hover:bg-[#029bba]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 text-[#029bba] animate-spin shrink-0" />
        ) : (
          <Upload className="w-5 h-5 text-gray-400 shrink-0" />
        )}
        <span className="text-sm text-[#666666]">
          {uploading ? "Uploading..." : displayUrl ? "Replace file" : "Choose file to upload"}
        </span>
      </button>
      <input
        ref={inputRef} type="file" accept={accept}
        className="hidden"
        onChange={(e) => { void handleFileChange(e); }}
      />
      {helpText && <p className={helpCls}>{helpText}</p>}
      {(uploadError ?? uploadState.error) && (
        <p className="text-xs text-[#ef4444] mt-1.5">{uploadError ?? uploadState.error}</p>
      )}
      {displayUrl && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
          {isImage ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0">
              <Image src={displayUrl} alt={label} fill className="object-cover" sizes="48px" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#029bba]/10 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-[#029bba]" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-[#666666] truncate">
              {uploadState.ref ? "New file ready" : "Existing file"}
            </p>
            {uploadState.ref && (
              <p className="text-xs text-[#10b981] flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Uploaded
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-48 bg-gray-200 rounded-2xl" />
      ))}
    </div>
  );
}

function ChipInput({
  label, values, onAdd, onRemove, placeholder, suggestions,
}: {
  label: string; values: string[];
  onAdd: (val: string) => void;
  onRemove: (val: string) => void;
  placeholder?: string;
  suggestions?: readonly string[];
}): React.ReactElement {
  const [input, setInput] = useState("");
  const handleAdd = (): void => {
    const val = input.trim();
    if (val && !values.includes(val)) { onAdd(val); setInput(""); }
  };
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
  };
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 px-3 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-semibold rounded-full border border-[#029bba]/20">
              {v}
              <button type="button" onClick={() => onRemove(v)} aria-label={`Remove ${v}`} className="hover:text-[#ef4444] transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Type and press Enter"} className={`${inputCls} flex-1`}
          list={suggestions ? `${label}-suggestions` : undefined}
        />
        {suggestions && (
          <datalist id={`${label}-suggestions`}>
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        )}
        <button type="button" onClick={handleAdd}
          className="px-3 py-2 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white transition-colors shrink-0" aria-label="Add">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// FORM INITIALIZER
// ============================================

function initFormState(profile: DeveloperProfileSnap | null): FormState {
  return {
    companyName: profile?.companyName ?? "",
    companyType: profile?.companyType ?? "",
    developerType: profile?.developerType ?? "",
    establishedYear: profile?.establishedYear?.toString() ?? "",
    description: profile?.description ?? "",
    tagline: profile?.tagline ?? "",
    ceoName: profile?.ceoName ?? "",
    ntnNumber: "",
    secpNumber: "",
    strn: "",
    phone: "",
    whatsapp: "",
    email: profile?.email ?? "",
    website: profile?.website ?? "",
    officeAddress: profile?.officeAddress ?? "",
    city: profile?.city ?? "",
    authorizedPersonName: profile?.authorizedPersonName ?? "",
    authorizedPersonCNIC: "",
    authorizedPersonPhone: "",
    authorizedPersonEmail: profile?.authorizedPersonEmail ?? "",
    authorizedPersonDesignation: profile?.authorizedPersonDesignation ?? "",
    facebook: profile?.socialLinks?.facebook ?? "",
    linkedin: profile?.socialLinks?.linkedin ?? "",
    instagram: profile?.socialLinks?.instagram ?? "",
    youtube: profile?.socialLinks?.youtube ?? "",
    twitter: profile?.socialLinks?.twitter ?? "",
    metaTitle: profile?.metaTitle ?? "",
    metaDescription: profile?.metaDescription ?? "",
  };
}

// ============================================
// HELPERS — portfolio data conversion
// ============================================

function profileProjectsToForm(
  profile: DeveloperProfileSnap | null
): CompletedProject[] {
  if (!profile) return [];
  const projects = profile.portfolio?.completedProjects;
  if (!projects?.length) return [];
  return projects.map((p): CompletedProject => ({
    _id:                    p._id ?? "",
    projectName:            p.projectName ?? "",
    projectType:            (p.projectType ?? "") as CompletedProject["projectType"],
    city:                   p.city ?? "",
    area:                   p.area ?? "",
    location:               p.location ?? "",
    startYear:              p.startYear?.toString() ?? "",
    completionYear:         p.completionYear?.toString() ?? String(CURRENT_YEAR),
    status:                 (p.status ?? "") as CompletedProject["status"],
    delayReason:            p.delayReason ?? "",
    expectedResolutionDate: p.expectedResolutionDate ?? "",
    totalUnits:             p.totalUnits?.toString() ?? "",
    totalPlots:             p.totalPlots?.toString() ?? "",
    totalArea:              p.totalArea ?? "",
    societyName:            p.societyName ?? "",
    description:            p.description ?? "",
    images:                 p.images ?? [],
    videoUrl:               p.videoUrl ?? "",
    virtualTourUrl:         p.virtualTourUrl ?? "",
    brochureUrl:            p.brochureUrl ?? "",
    isVerified:             p.isVerified ?? false,
    verifiedAt:             p.verifiedAt ?? "",
    verificationNotes:      p.verificationNotes ?? "",
    addedAt:                p.addedAt ?? "",
    updatedAt:              p.updatedAt ?? "",
  }));
}

function formProjectsToApi(
  projects: CompletedProject[]
): Record<string, unknown>[] {
  return projects.map((p) => ({
    ...(p._id ? { _id: p._id } : {}),
    projectName:            p.projectName,
    projectType:            p.projectType,
    city:                   p.city,
    area:                   p.area,
    location:               p.location || undefined,
    startYear:              p.startYear ? Number(p.startYear) : undefined,
    completionYear:         Number(p.completionYear),
    status:                 p.status,
    delayReason:            p.delayReason || undefined,
    expectedResolutionDate: p.expectedResolutionDate || undefined,
    totalUnits:             p.totalUnits ? Number(p.totalUnits) : undefined,
    totalPlots:             p.totalPlots ? Number(p.totalPlots) : undefined,
    totalArea:              p.totalArea || undefined,
    societyName:            p.societyName || undefined,
    description:            p.description || undefined,
    images:                 p.images,
    videoUrl:               p.videoUrl || undefined,
    virtualTourUrl:         p.virtualTourUrl || undefined,
    brochureUrl:            p.brochureUrl || undefined,
  }));
}

// ============================================
// MAIN PROFILE FORM
// ============================================

function ProfileForm(): React.ReactElement {
  const {
    profile, isLoading, error: contextError,
    refreshProfile, profileCompletion,
  } = useDeveloperContext();

  const isEditMode = Boolean(profile);
  const kycLocked = Boolean(profile?.kycLockedAt);
  const isNewProfile = !isEditMode;

  // ── Form state ────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(() => initFormState(profile));
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error" | "info"; message: string;
  } | null>(null);

  // ── Arrays ────────────────────────────────────────────────
  const [operatingCities, setOperatingCities] = useState<string[]>(
    profile?.operatingCities ?? []
  );
  const [serviceAreas, setServiceAreas] = useState<string[]>(
    profile?.serviceAreas ?? []
  );

  // ── V6.4.5+: Portfolio projects ───────────────────────────
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>(
    () => profileProjectsToForm(profile)
  );

  // ── Upload states ─────────────────────────────────────────
  const makeEmptyUpload = (): UploadState => ({
    uploading: false, error: null, ref: null,
  });

  const [logoUpload, setLogoUpload] = useState<UploadState>(makeEmptyUpload());
  const [coverUpload, setCoverUpload] = useState<UploadState>(makeEmptyUpload());
  // Facebook-style cover position: 0% = top crop, 50% = center, 100% = bottom
  const [coverFocalY, setCoverFocalY] = useState<number>(
    (profile?.coverImage as { focalY?: number } | undefined)?.focalY ?? 50
  );
  const [secpDocUpload, setSecpDocUpload] = useState<UploadState>(makeEmptyUpload());
  const [ntnDocUpload, setNtnDocUpload] = useState<UploadState>(makeEmptyUpload());
  const [memorandumUpload, setMemorandumUpload] = useState<UploadState>(makeEmptyUpload());
  // V6.4.5+: CNIC image uploads
  const [cnicFrontUpload, setCnicFrontUpload] = useState<UploadState>(makeEmptyUpload());
  const [cnicBackUpload, setCnicBackUpload] = useState<UploadState>(makeEmptyUpload());

  // ── V6.4.5+: Email verification state ─────────────────────
  const [companyEmailVerified, setCompanyEmailVerified] = useState(false);
  const [authPersonEmailVerified, setAuthPersonEmailVerified] = useState(false);

  // ── Active section for sticky nav ─────────────────────────
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);

  // ── Sync profile into form (guarded) ──────────────────────
  // BUG FIX: any profile refetch (context refresh, upload round-trip,
  // navigation) re-initialized the form mid-edit — wiping NTN/SECP/CNIC/
  // phone inputs (never echoed from server by design). Guard: sync only
  // when the user has NO unsaved changes. After a successful save,
  // setHasChanges(false) re-triggers this effect and syncs server values.
  useEffect(() => {
    if (profile && !hasChanges) {
      setForm(initFormState(profile));
      setOperatingCities(profile.operatingCities ?? []);
      setServiceAreas(profile.serviceAreas ?? []);
      setCompletedProjects(profileProjectsToForm(profile));
    }
  }, [profile, hasChanges]);

  // ── Auto-dismiss success banner ───────────────────────────
  useEffect(() => {
    if (banner?.type === "success") {
      const t = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(t);
    }
  }, [banner]);

  // ── Track scroll ──────────────────────────────────────────
  useEffect(() => {
    const handleScroll = (): void => {
      for (const section of [...SECTIONS].reverse()) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= 140) { setActiveSection(section.id); break; }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Missing items ─────────────────────────────────────────
  const missingItems = useMemo(() => {
    if (!profile) return [];
    return COMPLETION_CRITERIA.filter((c) => !c.check(profile)).map((c) => c.label);
  }, [profile]);

  // ── Field change ──────────────────────────────────────────
  const handleChange = useCallback(
    (field: keyof FormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setHasChanges(true);
        setBanner(null);
      }, []
  );

  // ── Upload handler factory ────────────────────────────────
  const makeUploadHandler = useCallback(
    (setState: React.Dispatch<React.SetStateAction<UploadState>>) =>
      (ref: CloudinaryRef): void => {
        setState({ uploading: false, error: null, ref });
        setHasChanges(true);
      }, []
  );

  // ── Scroll to section ─────────────────────────────────────
  const scrollToSection = (id: string): void => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); setActiveSection(id); }
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      setBanner(null);

      // Required field check for new profiles
      if (isNewProfile) {
        const required: Array<[keyof FormState, string]> = [
          ["companyName", "Company Name"],
          ["developerType", "Developer Type"],
          ["companyType", "Company Type"],
          ["ntnNumber", "NTN Number"],
          ["secpNumber", "SECP Number"],
          ["phone", "Phone Number"],
          ["email", "Email"],
          ["city", "City"],
          ["authorizedPersonName", "Authorized Person Name"],
          ["officeAddress", "Office Address"],
        ];
        for (const [field, label] of required) {
          if (!form[field].trim()) {
            setBanner({ type: "error", message: `${label} is required.` });
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
        }
        if (!logoUpload.ref) {
          setBanner({ type: "error", message: "Company logo is required." });
          return;
        }
        // Mirrors server-side validation — prevents the failed-submit
        // round-trip that previously triggered the form-reset data loss.
        if (!coverUpload.ref) {
          setBanner({ type: "error", message: "Cover image is required." });
          return;
        }
        // V6.4.5+: Validate company email verified
        if (!companyEmailVerified) {
          setBanner({ type: "error", message: "Please verify your company email before submitting." });
          return;
        }
        // V6.4.5+: Validate auth person email verified
        if (form.authorizedPersonEmail.trim() && !authPersonEmailVerified) {
          setBanner({ type: "error", message: "Please verify the authorized person email before submitting." });
          return;
        }
      }

      setSaving(true);

      try {
        const body: Record<string, unknown> = {
          companyName: form.companyName.trim() || undefined,
          companyType: form.companyType.trim() || undefined,
          developerType: form.developerType.trim() || undefined,
          establishedYear: form.establishedYear ? Number(form.establishedYear) : undefined,
          description: form.description.trim() || undefined,
          tagline: form.tagline.trim() || undefined,
          ceoName: form.ceoName.trim() || undefined,
          email: form.email.trim() || undefined,
          website: form.website.trim() || undefined,
          officeAddress: form.officeAddress.trim() || undefined,
          city: form.city.trim() || undefined,
          authorizedPersonName: form.authorizedPersonName.trim() || undefined,
          authorizedPersonEmail: form.authorizedPersonEmail.trim() || undefined,
          authorizedPersonDesignation: form.authorizedPersonDesignation.trim() || undefined,
          operatingCities,
          serviceAreas,
          socialLinks: {
            facebook: form.facebook.trim() || undefined,
            linkedin: form.linkedin.trim() || undefined,
            instagram: form.instagram.trim() || undefined,
            youtube: form.youtube.trim() || undefined,
            twitter: form.twitter.trim() || undefined,
          },
          metaTitle: form.metaTitle.trim() || undefined,
          metaDescription: form.metaDescription.trim() || undefined,
        };

        // V6.4.5+: Portfolio projects
        body.portfolio = {
          completedProjects: formProjectsToApi(completedProjects),
        };

        // KYC fields
        if (form.ntnNumber.trim()) body.ntnNumber = form.ntnNumber.trim();
        if (form.secpNumber.trim()) body.secpNumber = form.secpNumber.trim();
        if (form.strn.trim()) body.strn = form.strn.trim();
        if (form.phone.trim()) body.phone = form.phone.trim();
        if (form.whatsapp.trim()) body.whatsapp = form.whatsapp.trim();
        if (form.authorizedPersonCNIC.trim()) body.authorizedPersonCNIC = form.authorizedPersonCNIC.trim();
        if (form.authorizedPersonPhone.trim()) body.authorizedPersonPhone = form.authorizedPersonPhone.trim();

        // Media refs
        if (logoUpload.ref) body.logo = logoUpload.ref;
        if (coverUpload.ref) {
          body.coverImage = { ...coverUpload.ref, focalY: coverFocalY };
        } else if (profile?.coverImage?.url) {
          const existingPid = (profile.coverImage as { public_id?: string }).public_id;
          if (existingPid) {
            // Position-only update — same asset, new focal point
            body.coverImage = { url: profile.coverImage.url, public_id: existingPid, focalY: coverFocalY };
          }
        }

        // Legal docs
        const legalDocs: Record<string, unknown> = {};
        if (secpDocUpload.ref) legalDocs.secpCertificate = secpDocUpload.ref;
        if (ntnDocUpload.ref) legalDocs.ntnCertificate = ntnDocUpload.ref;
        if (memorandumUpload.ref) legalDocs.memorandum = memorandumUpload.ref;
        // V6.4.5+: CNIC images
        if (cnicFrontUpload.ref) legalDocs.authorizedPersonCnicFrontImage = cnicFrontUpload.ref;
        if (cnicBackUpload.ref) legalDocs.authorizedPersonCnicBackImage = cnicBackUpload.ref;

        if (Object.keys(legalDocs).length > 0) body.legalDocs = legalDocs;

        const method = isNewProfile ? "POST" : "PUT";
        const res = await fetch("/api/developer/profile", {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as ApiResponse;

        if (!res.ok || !data.success) {
          setBanner({ type: "error", message: data.message ?? data.error ?? "Failed to save profile." });
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        await refreshProfile();
        setBanner({
          type: "success",
          message: isNewProfile
            ? "Profile created! Our team will review it within 24–48 hours."
            : "Profile updated successfully.",
        });
        setHasChanges(false);
        setForm((prev) => ({ ...prev, ntnNumber: "", secpNumber: "", phone: "", authorizedPersonCNIC: "" }));
        setLogoUpload(makeEmptyUpload());
        setCoverUpload(makeEmptyUpload());
        setSecpDocUpload(makeEmptyUpload());
        setNtnDocUpload(makeEmptyUpload());
        setMemorandumUpload(makeEmptyUpload());
        setCnicFrontUpload(makeEmptyUpload());
        setCnicBackUpload(makeEmptyUpload());
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err: unknown) {
        setBanner({
          type: "error",
          message: err instanceof Error ? err.message : "Something went wrong.",
        });
      } finally {
        setSaving(false);
      }
    },
    [form, isNewProfile, logoUpload, coverUpload, coverFocalY, secpDocUpload, ntnDocUpload,
     memorandumUpload, cnicFrontUpload, cnicBackUpload, operatingCities,
     serviceAreas, completedProjects, companyEmailVerified,
     authPersonEmailVerified, refreshProfile]
  );

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) return <ProfileSkeleton />;
  if (contextError) {
    return (
      <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-xl p-5 m-6">
        <p className="text-sm text-[#ef4444]">{contextError}</p>
      </div>
    );
  }

  const showCelebration = isEditMode && profileCompletion === 100;

  return (
    <>
      <Head>
        <title>{isEditMode ? "Edit Profile" : "Create Profile"} — Highrise.pk Developer Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Sticky sub-navigation */}
      <div className="sticky top-16 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" onClick={() => scrollToSection(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeSection === s.id ? "bg-[#029bba] text-white" : "text-gray-500 hover:bg-gray-100 hover:text-[#333333]"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#004063]">
            {isEditMode ? "Edit Developer Profile" : "Create Developer Profile"}
          </h1>
          <p className="text-[#666666] mt-1 text-sm">
            {isEditMode
              ? "Update your company information and verification documents."
              : "Complete your profile to start publishing projects on Highrise.pk."}
          </p>
        </div>

        {/* Profile Completion Card */}
        {isEditMode && (
          showCelebration ? (
            <div className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-xl font-black">Profile 100% Complete! 🎉</p>
                  <p className="text-emerald-100 text-sm mt-0.5">Your profile is fully optimized.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-base font-bold text-[#004063]">Profile Completion</p>
                  <p className="text-xs text-gray-500 mt-0.5">Complete all fields to boost your trust score</p>
                </div>
                <div className="text-3xl font-black text-[#029bba] shrink-0">{profileCompletion}%</div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${
                  profileCompletion >= 70 ? "bg-emerald-500" : profileCompletion >= 40 ? "bg-amber-500" : "bg-red-500"
                }`} style={{ width: `${profileCompletion}%` }} />
              </div>
              {missingItems.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Missing items ({missingItems.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missingItems.map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full border border-red-100">
                        <XCircle className="w-3 h-3" />{item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Banner */}
        {banner && (
          <div className={`mb-6 rounded-xl p-4 flex items-start gap-3 border-l-4 ${
            banner.type === "success" ? "bg-[#f0fdf4] border-[#10b981]"
            : banner.type === "error" ? "bg-[#fef2f2] border-[#ef4444]"
            : "bg-[#eff6ff] border-[#029bba]"
          }`}>
            {banner.type === "success" && <CheckCircle2 className="w-5 h-5 text-[#10b981] mt-0.5 shrink-0" />}
            {banner.type === "error" && <XCircle className="w-5 h-5 text-[#ef4444] mt-0.5 shrink-0" />}
            {banner.type === "info" && <AlertCircle className="w-5 h-5 text-[#029bba] mt-0.5 shrink-0" />}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${
                banner.type === "success" ? "text-green-800"
                : banner.type === "error" ? "text-red-800" : "text-[#004063]"
              }`}>{banner.message}</p>
            </div>
            <button type="button" onClick={() => setBanner(null)} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">

          {/* ════ Section 1: Media ═══════════════════════════════ */}
          <Section id="section-media" title="Company Media" subtitle="Logo and cover image" icon={<ImageIcon className="w-5 h-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FileUploadField label="Company Logo" required={isNewProfile} accept="image/jpeg,image/png,image/webp" folder="profiles"
                currentUrl={profile?.logo?.url} uploadState={logoUpload} onUpload={makeUploadHandler(setLogoUpload)}
                helpText="Square recommended. 400×400px. Max 10MB." isImage />
              <div>
                <FileUploadField label="Cover Image" accept="image/jpeg,image/png,image/webp" folder="profiles"
                  currentUrl={profile?.coverImage?.url} uploadState={coverUpload} onUpload={makeUploadHandler(setCoverUpload)}
                  helpText="Landscape recommended. 1920×640px. Max 10MB." isImage />
                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <label htmlFor="coverFocalY" className="block text-sm font-semibold text-[#333333] mb-2">
                    Cover Position (Facebook-style crop)
                  </label>
                  <input
                    id="coverFocalY"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={coverFocalY}
                    onChange={(e) => { setCoverFocalY(Number(e.target.value)); setHasChanges(true); }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#029bba]"
                  />
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 mt-1">
                    <span>Top</span><span>{coverFocalY}%</span><span>Bottom</span>
                  </div>
                  <p className="text-xs text-[#666666] mt-1.5">
                    Image is cropped to a fixed banner height — set which part stays visible.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* ════ Section 2: Company Info ════════════════════════ */}
          <Section id="section-company" title="Company Information" subtitle="Official registration and company details" icon={<Building2 className="w-5 h-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls} htmlFor="developerType">Developer Type {isNewProfile && <span className="text-[#ef4444]">*</span>}</label>
                <select id="developerType" className={inputCls} value={form.developerType} onChange={handleChange("developerType")}>
                  <option value="">Select Developer Type</option>
                  {DEVELOPER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="companyType">Company Type {isNewProfile && <span className="text-[#ef4444]">*</span>}</label>
                <select id="companyType" className={inputCls} value={form.companyType} onChange={handleChange("companyType")}>
                  <option value="">Select Company Type</option>
                  {COMPANY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls} htmlFor="companyName">Company Name {isNewProfile && <span className="text-[#ef4444]">*</span>}</label>
                <input id="companyName" type="text" className={inputCls} value={form.companyName} onChange={handleChange("companyName")} placeholder="e.g. ABC Developers (Pvt) Ltd" maxLength={150} />
              </div>
              <div>
                <label className={labelCls} htmlFor="establishedYear">Established Year</label>
                <input id="establishedYear" type="number" className={inputCls} value={form.establishedYear} onChange={handleChange("establishedYear")} placeholder="e.g. 2010" min={1900} max={CURRENT_YEAR} />
              </div>
              <div>
                <label className={labelCls} htmlFor="ceoName">CEO / Director Name</label>
                <input id="ceoName" type="text" className={inputCls} value={form.ceoName} onChange={handleChange("ceoName")} placeholder="e.g. Muhammad Ali Khan" maxLength={100} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls} htmlFor="tagline">Company Tagline</label>
                <input id="tagline" type="text" className={inputCls} value={form.tagline} onChange={handleChange("tagline")} placeholder="e.g. Building Dreams Since 2010" maxLength={200} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls} htmlFor="description">Company Description</label>
                <textarea id="description" className={`${inputCls} min-h-[120px] resize-y`} value={form.description} onChange={handleChange("description")} placeholder="Tell buyers about your company..." maxLength={2000} />
                <p className={helpCls}>{form.description.length}/2000 — Minimum 50 characters</p>
              </div>
            </div>
          </Section>

          {/* ════ Section 3: KYC / Registration ═════════════════ */}
          <Section id="section-kyc" title="Registration Numbers" subtitle="Government registration — encrypted and secured" icon={<Lock className="w-5 h-5" />}>
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-800 font-medium">🔒 All registration numbers are encrypted with AES-256-GCM.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {kycLocked && profile?.ntnNumberMasked ? (
                <KycLockedField label="NTN Number" maskedValue={profile.ntnNumberMasked} />
              ) : (
                <div>
                  <label className={labelCls} htmlFor="ntnNumber">NTN Number{isNewProfile && <span className="text-[#ef4444]"> *</span>}</label>
                  <input id="ntnNumber" type="text" className={inputCls} value={form.ntnNumber} onChange={handleChange("ntnNumber")} placeholder="e.g. 1234567-8" autoComplete="off" />
                  {profile?.ntnNumberMasked && <p className={helpCls}>Current: {profile.ntnNumberMasked}</p>}
                </div>
              )}
              {kycLocked && profile?.secpNumberMasked ? (
                <KycLockedField label="SECP Registration Number" maskedValue={profile.secpNumberMasked} />
              ) : (
                <div>
                  <label className={labelCls} htmlFor="secpNumber">SECP Registration Number{isNewProfile && <span className="text-[#ef4444]"> *</span>}</label>
                  <input id="secpNumber" type="text" className={inputCls} value={form.secpNumber} onChange={handleChange("secpNumber")} placeholder="e.g. 0123456" autoComplete="off" />
                  {profile?.secpNumberMasked && <p className={helpCls}>Current: {profile.secpNumberMasked}</p>}
                </div>
              )}
              <div>
                <label className={labelCls} htmlFor="strn">STRN (Sales Tax) — Optional</label>
                <input id="strn" type="text" className={inputCls} value={form.strn} onChange={handleChange("strn")} placeholder="Sales Tax Registration Number" autoComplete="off" />
              </div>
            </div>
          </Section>

          {/* ════ Section 4: Contact ════════════════════════════ */}
          <Section id="section-contact" title="Contact Information" subtitle="How buyers and our team can reach you" icon={<Phone className="w-5 h-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* V6.4.5+: Email with OTP verification */}
              <div className="md:col-span-2">
                <EmailVerifyField
                  label="Official Company Email"
                  email={form.email}
                  purpose="company_email"
                  onEmailChange={(val) => {
                    setForm((prev) => ({ ...prev, email: val }));
                    setHasChanges(true);
                    setCompanyEmailVerified(false);
                  }}
                  onVerified={(verifiedEmail) => {
                    setForm((prev) => ({ ...prev, email: verifiedEmail }));
                    setCompanyEmailVerified(true);
                    setHasChanges(true);
                  }}
                  required={isNewProfile}
                  helpText="Business email will be shown to buyers. Must be verified."
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="phone">Phone Number{isNewProfile && <span className="text-[#ef4444]"> *</span>}</label>
                <input id="phone" type="tel" className={inputCls} value={form.phone} onChange={handleChange("phone")}
                  placeholder={profile?.phoneMasked ? `Current: ${profile.phoneMasked}` : "e.g. 0300-1234567"} autoComplete="off" />
                {profile?.phoneMasked && <p className={helpCls}>Current: {profile.phoneMasked}</p>}
              </div>
              <div>
                <label className={labelCls} htmlFor="whatsapp">WhatsApp Number</label>
                <input id="whatsapp" type="tel" className={inputCls} value={form.whatsapp} onChange={handleChange("whatsapp")} placeholder="e.g. 0300-1234567" autoComplete="off" />
              </div>
              <div>
                <label className={labelCls} htmlFor="website">Website</label>
                <input id="website" type="url" className={inputCls} value={form.website} onChange={handleChange("website")} placeholder="https://www.yourcompany.com" />
              </div>
              <div>
                <label className={labelCls} htmlFor="city">Primary City {isNewProfile && <span className="text-[#ef4444]">*</span>}</label>
                <select id="city" className={inputCls} value={form.city} onChange={handleChange("city")}>
                  <option value="">Select City</option>
                  {PAKISTAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls} htmlFor="officeAddress">Office Address</label>
                <input id="officeAddress" type="text" className={inputCls} value={form.officeAddress} onChange={handleChange("officeAddress")} placeholder="Complete office address" />
              </div>
              <div className="md:col-span-2">
                <ChipInput label="Operating Cities" values={operatingCities}
                  onAdd={(v) => { setOperatingCities((prev) => [...prev, v]); setHasChanges(true); }}
                  onRemove={(v) => { setOperatingCities((prev) => prev.filter((c) => c !== v)); setHasChanges(true); }}
                  placeholder="Type city and press Enter" suggestions={PAKISTAN_CITIES} />
              </div>
              <div className="md:col-span-2">
                <ChipInput label="Service Areas / Localities" values={serviceAreas}
                  onAdd={(v) => { setServiceAreas((prev) => [...prev, v]); setHasChanges(true); }}
                  onRemove={(v) => { setServiceAreas((prev) => prev.filter((a) => a !== v)); setHasChanges(true); }}
                  placeholder="e.g. DHA Phase 5, Bahria Town" />
                <p className={helpCls}>Add specific localities where you operate</p>
              </div>
            </div>
          </Section>

          {/* ════ Section 5: Authorized Person ═════════════════ */}
          <Section id="section-authorized" title="Authorized Person"
            subtitle="Person responsible for official communication and verification"
            icon={<User className="w-5 h-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls} htmlFor="authorizedPersonName">Full Name {isNewProfile && <span className="text-[#ef4444]">*</span>}</label>
                <input id="authorizedPersonName" type="text" className={inputCls} value={form.authorizedPersonName} onChange={handleChange("authorizedPersonName")} placeholder="e.g. Muhammad Ali" />
              </div>
              <div>
                <label className={labelCls} htmlFor="authorizedPersonDesignation">Designation</label>
                <input id="authorizedPersonDesignation" type="text" className={inputCls} value={form.authorizedPersonDesignation} onChange={handleChange("authorizedPersonDesignation")} placeholder="e.g. CEO, Director" />
              </div>
              {kycLocked && profile?.authorizedPersonCnicMasked ? (
                <KycLockedField label="Authorized Person CNIC" maskedValue={profile.authorizedPersonCnicMasked} />
              ) : (
                <div>
                  <label className={labelCls} htmlFor="authorizedPersonCNIC">CNIC Number <span className="text-[#ef4444]">*</span></label>
                  <input id="authorizedPersonCNIC" type="text" className={inputCls} value={form.authorizedPersonCNIC} onChange={handleChange("authorizedPersonCNIC")} placeholder="e.g. 12345-1234567-1" autoComplete="off" />
                  {profile?.authorizedPersonCnicMasked && <p className={helpCls}>Current: {profile.authorizedPersonCnicMasked}</p>}
                </div>
              )}
              <div>
                <label className={labelCls} htmlFor="authorizedPersonPhone">Phone <span className="text-[#ef4444]">*</span></label>
                <input id="authorizedPersonPhone" type="tel" className={inputCls} value={form.authorizedPersonPhone} onChange={handleChange("authorizedPersonPhone")} placeholder="e.g. 0300-1234567" autoComplete="off" />
              </div>
              {/* V6.4.5+: Auth person email with OTP verification */}
              <div className="md:col-span-2">
                <EmailVerifyField
                  label="Authorized Person Email"
                  email={form.authorizedPersonEmail}
                  purpose="authorized_person_email"
                  onEmailChange={(val) => {
                    setForm((prev) => ({ ...prev, authorizedPersonEmail: val }));
                    setHasChanges(true);
                    setAuthPersonEmailVerified(false);
                  }}
                  onVerified={(verifiedEmail) => {
                    setForm((prev) => ({ ...prev, authorizedPersonEmail: verifiedEmail }));
                    setAuthPersonEmailVerified(true);
                    setHasChanges(true);
                  }}
                  required
                  helpText="Must be verified independently for legal accountability."
                />
              </div>

              {/* V6.4.5+: CNIC Front + Back Image Upload */}
              <FileUploadField
                label="CNIC Front Image"
                required
                accept="image/jpeg,image/png,image/webp"
                folder="documents"
                currentUrl={profile?.legalDocs?.authorizedPersonCnicFrontImage?.url}
                uploadState={cnicFrontUpload}
                onUpload={makeUploadHandler(setCnicFrontUpload)}
                helpText="Clear photo of CNIC front side. Max 10MB."
                isImage
              />
              <FileUploadField
                label="CNIC Back Image"
                required
                accept="image/jpeg,image/png,image/webp"
                folder="documents"
                currentUrl={profile?.legalDocs?.authorizedPersonCnicBackImage?.url}
                uploadState={cnicBackUpload}
                onUpload={makeUploadHandler(setCnicBackUpload)}
                helpText="Clear photo of CNIC back side. Max 10MB."
                isImage
              />
            </div>
          </Section>

          {/* ════ Section 6: Portfolio ══════════════════════════ */}
          <Section id="section-portfolio" title="Portfolio & Projects"
            subtitle="Showcase your completed projects — verified by admin"
            icon={<Award className="w-5 h-5" />}>

            {/* Legal documents */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#004063] mb-4">Legal Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FileUploadField label="SECP Certificate" required accept="image/jpeg,image/png,application/pdf" folder="documents"
                  currentUrl={profile?.legalDocs?.secpCertificate?.url} uploadState={secpDocUpload} onUpload={makeUploadHandler(setSecpDocUpload)} isImage={false} />
                {/* V6.4.5+: NTN Certificate now MANDATORY */}
                <FileUploadField label="NTN Certificate" required accept="image/jpeg,image/png,application/pdf" folder="documents"
                  currentUrl={profile?.legalDocs?.ntnCertificate?.url} uploadState={ntnDocUpload} onUpload={makeUploadHandler(setNtnDocUpload)} isImage={false} />
                <FileUploadField label="Memorandum of Association" accept="image/jpeg,image/png,application/pdf" folder="documents"
                  currentUrl={profile?.legalDocs?.memorandum?.url} uploadState={memorandumUpload} onUpload={makeUploadHandler(setMemorandumUpload)} helpText="Optional but recommended" isImage={false} />
              </div>
            </div>

            {/* V6.4.5+: Completed Projects Repeater (replaces old numbers) */}
            <CompletedProjectRepeater
              projects={completedProjects}
              onChange={(updated) => {
                setCompletedProjects(updated);
                setHasChanges(true);
              }}
            />
          </Section>

          {/* ════ Section 7: Social Media ═══════════════════════ */}
          <Section id="section-social" title="Social Media" subtitle="Connect your social profiles (optional)" icon={<Globe className="w-5 h-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {([
                ["facebook", "Facebook", "https://facebook.com/yourcompany"],
                ["linkedin", "LinkedIn", "https://linkedin.com/company/yourcompany"],
                ["instagram", "Instagram", "https://instagram.com/yourcompany"],
                ["youtube", "YouTube", "https://youtube.com/@yourcompany"],
                ["twitter", "Twitter / X", "https://twitter.com/yourcompany"],
              ] as const).map(([field, label, placeholder]) => (
                <div key={field}>
                  <label className={labelCls} htmlFor={field}>{label}</label>
                  <input id={field} type="url" className={inputCls} value={form[field]} onChange={handleChange(field)} placeholder={placeholder} />
                </div>
              ))}
            </div>
          </Section>

          {/* ════ Section 8: SEO ════════════════════════════════ */}
          <Section id="section-seo" title="SEO & Metadata" subtitle="Improve your visibility in search results (optional)" icon={<LinkIcon className="w-5 h-5" />}>
            <div className="space-y-5">
              <div>
                <label className={labelCls} htmlFor="metaTitle">Meta Title</label>
                <input id="metaTitle" type="text" className={inputCls} value={form.metaTitle} onChange={handleChange("metaTitle")} placeholder="e.g. ABC Developers — Top Builder in Islamabad" maxLength={70} />
                <p className={helpCls}>{form.metaTitle.length}/70 characters</p>
              </div>
              <div>
                <label className={labelCls} htmlFor="metaDescription">Meta Description</label>
                <textarea id="metaDescription" className={`${inputCls} min-h-[80px] resize-none`} value={form.metaDescription} onChange={handleChange("metaDescription")} placeholder="Brief description for search engines..." maxLength={160} />
                <p className={helpCls}>{form.metaDescription.length}/160 characters</p>
              </div>
            </div>
          </Section>

        </form>
      </div>

      {/* Sticky Save Bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
        hasChanges ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}>
        <div className="bg-white border-t border-gray-200 shadow-2xl px-4 py-3">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-[#666666]">
              {isNewProfile ? "Your profile will be reviewed within 24–48 hours." : "You have unsaved changes."}
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { setForm(initFormState(profile)); setCompletedProjects(profileProjectsToForm(profile)); setHasChanges(false); setBanner(null); }}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-[#666666] hover:bg-gray-50 transition-colors" disabled={saving}>
                Discard
              </button>
              <button type="button"
                onClick={(e) => { void handleSubmit(e as unknown as React.FormEvent); }}
                disabled={saving || !hasChanges}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-bold text-sm shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>) : (<><Save className="w-4 h-4" />{isNewProfile ? "Create Profile" : "Save Changes"}</>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// PAGE EXPORT
// ============================================

export default function DeveloperProfilePage(): React.ReactElement {
  return (
    <DeveloperLayout pageTitle="Company Profile">
      <ProfileForm />
    </DeveloperLayout>
  );
}