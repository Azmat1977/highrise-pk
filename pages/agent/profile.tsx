// ========== FILE: pages/agent/profile.tsx ==========
// Agent Profile Management — Enterprise Redesign V6.4.3
// LESSON #196: Zero `as unknown as` casts — full type safety
// Features: profile completion %, sticky sub-nav, enhanced UX
// ====================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  Save, Upload, User, MapPin, Phone, Globe, Briefcase,
  Clock, Shield, AlertCircle, CheckCircle, Camera, Loader2,
  X, Plus, Trash2, Facebook, Instagram, Linkedin, Youtube,
  Twitter, Lock, Mail, Target, ChevronRight,
} from "lucide-react";
import AgentLayout from "@/components/agent/AgentLayout";
import {
  useAgentContext,
  type AgentType,
  type AgentSpecialization,
} from "@/components/agent/AgentContext";
import OfficeLocationPicker, { type LocationData } from "@/components/OfficeLocationPicker";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaFile {
  url:        string;
  public_id?: string;
}

interface ProfileFormData {
  displayName:    string;
  tagline:        string;
  about:          string;
  agentType:      AgentType;
  licenseNumber:  string;
  agencyName:     string;
  experience: {
    years:      number;
    totalDeals: number;
    totalValue: number;
  };
  serviceAreas: {
    cities:     string[];
    localities: string[];
  };
  specializations: AgentSpecialization[];
  languages:       string[];
  socialLinks: {
    facebook?:  string;
    instagram?: string;
    linkedin?:  string;
    youtube?:   string;
    twitter?:   string;
  };
  businessHours: {
    weekdays?: string;
    weekends?: string;
  };
  officeVerification: {
    address:   string;
    city?:     string;
    latitude?: number | null;
    longitude?: number | null;
  };
  documents: {
    profilePhoto: MediaFile | null;
    coverPhoto:   MediaFile | null;
    agencyLogo:   MediaFile | null;   // V6.9.1: Agency logo (only for agency accounts)
  };
}

type FormErrors = Partial<Record<keyof ProfileFormData | "general", string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const PAKISTAN_CITIES = [
  "Islamabad", "Rawalpindi", "Lahore", "Karachi", "Faisalabad",
  "Multan", "Peshawar", "Quetta", "Gujranwala", "Sialkot",
  "Hyderabad", "Bahawalpur", "Sargodha", "Sukkur", "Larkana",
] as const;

const SPECIALIZATION_OPTIONS: Array<{ value: AgentSpecialization; label: string }> = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial" },
  { value: "plots",       label: "Plots & Land" },
  { value: "rental",      label: "Rentals" },
  { value: "all",         label: "All Types" },
];

const LANGUAGES = [
  "Urdu", "English", "Punjabi", "Sindhi",
  "Pashto", "Balochi", "Arabic", "Chinese",
] as const;

const DEFAULT_FORM: ProfileFormData = {
  displayName:   "",
  tagline:       "",
  about:         "",
  agentType:     "individual",
  licenseNumber: "",
  agencyName:    "",
  experience:    { years: 0, totalDeals: 0, totalValue: 0 },
  serviceAreas:  { cities: [], localities: [] },
  specializations: [],
  languages:     ["Urdu"],
  socialLinks:   {},
  businessHours: {
    weekdays: "9:00 AM - 6:00 PM",
    weekends: "10:00 AM - 4:00 PM",
  },
  officeVerification: { address: "" },
  documents:          { profilePhoto: null, coverPhoto: null, agencyLogo: null },
};

// ─── Section Definitions (for sticky sub-nav) ────────────────────────────────

const SECTIONS = [
  { id: "media",       label: "Photos",        icon: <Camera className="w-4 h-4" /> },
  { id: "basic",       label: "Basic Info",    icon: <User className="w-4 h-4" /> },
  { id: "contact",     label: "Contact",       icon: <Phone className="w-4 h-4" /> },
  { id: "experience",  label: "Experience",    icon: <Briefcase className="w-4 h-4" /> },
  { id: "areas",       label: "Service Areas", icon: <MapPin className="w-4 h-4" /> },
  { id: "hours",       label: "Hours",         icon: <Clock className="w-4 h-4" /> },
  { id: "social",      label: "Social Media",  icon: <Globe className="w-4 h-4" /> },
] as const;

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon, title, description,
}: {
  icon:         React.ReactNode;
  title:        string;
  description?: string;
}): React.ReactElement {
  return (
    <div className="mb-6 pb-4 border-b border-gray-100">
      <h2 className="text-lg font-bold text-[#004063] flex items-center gap-2">
        <span className="text-[#029bba]">{icon}</span>
        {title}
      </h2>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }): React.ReactElement | null {
  if (!message) return null;
  return (
    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />
      {message}
    </p>
  );
}

function ReadOnlyField({
  label, value, icon, note,
}: {
  label: string;
  value: string;
  icon:  React.ReactNode;
  note?: string;
}): React.ReactElement {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
        <span className="text-gray-400">{icon}</span>
        <span className="flex-1 text-gray-700 text-sm truncate">
          {value || "—"}
        </span>
        <Lock className="w-4 h-4 text-gray-300" />
      </div>
      {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
    </div>
  );
}

// ─── Image Upload Section ─────────────────────────────────────────────────────

interface ImageUploadProps {
  type:     "profile" | "cover" | "logo";                              // V6.9.1
  current:  MediaFile | null;
  onUpload: (type: "profile" | "cover" | "logo", file: MediaFile) => void;
  onRemove: (type: "profile" | "cover" | "logo") => void;
}

function ImageUploadSection({
  type, current, onUpload, onRemove,
}: ImageUploadProps): React.ReactElement {
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setError]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side validation
      if (file.size > 10 * 1024 * 1024) {
        setError("File too large. Max 10MB.");
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Only JPEG, PNG, WebP allowed.");
        return;
      }

      setUploading(true);
      setError("");

      try {
        const formData = new FormData();
        formData.append("file", file);
        // V6.9.1: Route logos to a separate Cloudinary folder for organization
        formData.append("folder", type === "logo" ? "agencies" : "agents");

        const res = await fetch("/api/upload", {
          method:      "POST",
          credentials: "include",
          body:        formData,
        });

        const data = (await res.json()) as {
          success:  boolean;
          message?: string;
          data?:    { url: string; publicId: string };
        };

        if (!res.ok || !data.success || !data.data) {
          setError(data.message ?? "Upload failed. Please try again.");
          return;
        }

        onUpload(type, {
          url:       data.data.url,
          public_id: data.data.publicId,
        });
      } catch {
        setError("Upload failed. Please check your connection.");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [type, onUpload]
  );

  const isCover = type === "cover";
  const isLogo  = type === "logo";

  // V6.9.1: Dynamic labels + copy based on upload type
  const labelText =
    isCover ? "Cover Photo" :
    isLogo  ? "Agency Logo" :
              "Profile Photo";

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {labelText}
      </label>

      {isCover ? (
        // Cover Photo — wide banner
        <div className="relative h-48 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
          {current?.url ? (
            <>
              <Image
                src={current.url}
                alt="Cover photo"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
              />
              <button
                type="button"
                onClick={() => onRemove("cover")}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md"
                aria-label="Remove cover photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {uploading ? (
                <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600 font-semibold">
                    Upload Cover Photo
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    Recommended: 1920×400px · Max 10MB
                  </span>
                </>
              )}
            </label>
          )}
        </div>
      ) : isLogo ? (
        // V6.9.1: Agency Logo — square with white background (transparent PNG friendly)
        <div className="flex items-center gap-4">
          <div className="relative w-32 h-32 bg-white rounded-2xl overflow-hidden border-2 border-gray-200 shrink-0 flex items-center justify-center p-2">
            {current?.url ? (
              <>
                <Image
                  src={current.url}
                  alt="Agency logo"
                  fill
                  className="object-contain p-2"
                  sizes="128px"
                />
                <button
                  type="button"
                  onClick={() => onRemove("logo")}
                  className="absolute bottom-1 right-1 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors z-10"
                  aria-label="Remove agency logo"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center h-full w-full cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-[#029bba] animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500 font-semibold">
                      Upload Logo
                    </span>
                  </>
                )}
              </label>
            )}
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">Agency Logo</p>
            <p className="text-xs">Appears next to your profile on listings</p>
            <p className="text-xs">Recommended: 400×400px square</p>
            <p className="text-xs">Transparent PNG works best · Max 10MB</p>
            {!current?.url && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#029bba] text-white text-xs font-semibold rounded-lg hover:bg-[#027a94] transition-colors disabled:opacity-50"
              >
                <Upload className="w-3 h-3" />
                {uploading ? "Uploading..." : "Choose Logo"}
              </button>
            )}
          </div>
        </div>
      ) : (
        // Profile Photo — square
        <div className="flex items-center gap-4">
          <div className="relative w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 shrink-0">
            {current?.url ? (
              <>
                <Image
                  src={current.url}
                  alt="Profile photo"
                  fill
                  className="object-cover"
                  sizes="128px"
                />
                <button
                  type="button"
                  onClick={() => onRemove("profile")}
                  className="absolute bottom-1 right-1 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  aria-label="Remove profile photo"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-[#029bba] animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500 font-semibold">
                      Upload
                    </span>
                  </>
                )}
              </label>
            )}
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">Professional Photo</p>
            <p className="text-xs">Recommended: 400×400px</p>
            <p className="text-xs">Max 10MB · JPEG, PNG, WebP</p>
            {!current?.url && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#029bba] text-white text-xs font-semibold rounded-lg hover:bg-[#027a94] transition-colors disabled:opacity-50"
              >
                <Upload className="w-3 h-3" />
                {uploading ? "Uploading..." : "Choose Photo"}
              </button>
            )}
          </div>
        </div>
      )}

      {uploadError && (
        <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {uploadError}
        </p>
      )}
    </div>
  );
}

// ─── Toggle Chip ──────────────────────────────────────────────────────────────

function ToggleChip({
  label, selected, onToggle,
}: {
  label:    string;
  selected: boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
        selected
          ? "bg-[#029bba] text-white shadow-sm shadow-[#029bba]/30"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Profile Completion Card ──────────────────────────────────────────────────

function ProfileCompletionCard({
  completion, profile,
}: {
  completion: number;
  profile:    ProfileFormData;
}): React.ReactElement {
  // Build missing-items checklist
  const checklist = [
    { done: profile.displayName.length >= 3,                                          label: "Display name" },
    { done: profile.about.length >= 100,                                              label: "About (min 100 chars)" },
    { done: profile.tagline.length >= 10,                                             label: "Tagline" },
    { done: Boolean(profile.documents.profilePhoto?.url),                             label: "Profile photo" },
    { done: Boolean(profile.documents.coverPhoto?.url),                               label: "Cover photo" },
    { done: Boolean(
        profile.socialLinks.facebook ??
        profile.socialLinks.instagram ??
        profile.socialLinks.linkedin
      ),                                                                              label: "At least one social link" },
    { done: profile.experience.years > 0,                                             label: "Years of experience" },
    { done: profile.serviceAreas.cities.length > 0,                                   label: "Service cities" },
    { done: profile.specializations.length > 0,                                       label: "Specializations" },
    { done: profile.languages.length > 0,                                             label: "Languages" },
  ];

  const missing = checklist.filter((c) => !c.done);

  if (completion >= 100) {
    return (
      <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-emerald-800">Profile Complete! 🎉</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              You&apos;re maximizing your visibility to potential clients.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-gradient-to-br from-[#029bba]/5 to-[#029bba]/10 border border-[#029bba]/20 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-[#029bba]/20 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-[#029bba]" />
            </div>
            <div>
              <p className="font-bold text-[#004063] text-base">
                Profile Completion: {completion}%
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Complete profiles get 3× more inquiries
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-[#029bba] to-[#027a94] transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>

        {/* Missing items */}
        {missing.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[#004063] uppercase tracking-wide mb-2">
              What&apos;s Missing:
            </p>
            <div className="flex flex-wrap gap-2">
              {missing.slice(0, 6).map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700"
                >
                  <X className="w-3 h-3 text-red-400" />
                  {item.label}
                </span>
              ))}
              {missing.length > 6 && (
                <span className="text-[11px] text-gray-500 self-center">
                  +{missing.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile Form Content ─────────────────────────────────────────────────────

function ProfileFormContent(): React.ReactElement {
  const { data: session } = useSession();
  const {
    profile: contextProfile,
    profileLoading,
    profileCompletion,
    refreshProfile,
  } = useAgentContext();

  const [form, setForm]             = useState<ProfileFormData>(DEFAULT_FORM);
  const [errors, setErrors]         = useState<FormErrors>({});
  const [saving, setSaving]         = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [localityInput, setLocalityInput] = useState("");
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("media");

  // V6.8.23: No body lock needed — modal backdrop is solid and covers everything
  // Removed body scroll lock (was causing footer position issue)
  // Modal's z-[9999] and solid backdrop hide all background content

  // ── Hydrate form from context profile (fully typed, no casts) ─────────────
  // V6.8.13: Uses JSON stringify comparison to detect actual changes
  // Prevents unnecessary form re-population on same-reference updates
  useEffect(() => {
    if (!contextProfile) return;

    const p = contextProfile;
    setForm({
      displayName:   p.displayName ?? "",
      tagline:       p.tagline ?? "",
      about:         p.about ?? "",
      agentType:     p.agentType ?? "individual",
      licenseNumber: p.licenseNumber ?? "",
      agencyName:    p.agencyName ?? "",
      experience: {
        years:      p.experience?.years ?? 0,
        totalDeals: p.experience?.totalDeals ?? 0,
        totalValue: p.experience?.totalValue ?? 0,
      },
      serviceAreas: {
        cities:     p.serviceAreas?.cities ?? [],
        localities: p.serviceAreas?.localities ?? [],
      },
      specializations: p.specializations ?? [],
      languages:       p.languages ?? ["Urdu"],
      socialLinks: {
        facebook:  p.socialLinks?.facebook ?? "",
        instagram: p.socialLinks?.instagram ?? "",
        linkedin:  p.socialLinks?.linkedin ?? "",
        youtube:   p.socialLinks?.youtube ?? "",
        twitter:   p.socialLinks?.twitter ?? "",
      },
      businessHours: {
        weekdays: p.businessHours?.weekdays ?? "9:00 AM - 6:00 PM",
        weekends: p.businessHours?.weekends ?? "10:00 AM - 4:00 PM",
      },
      officeVerification: {
        address:   p.officeVerification?.address ?? "",
        city:      p.officeVerification?.city,
        latitude:  p.officeVerification?.coordinates?.latitude ?? null,
        longitude: p.officeVerification?.coordinates?.longitude ?? null,
      },
      documents: {
        profilePhoto: p.documents?.profilePhoto?.url
          ? { url: p.documents.profilePhoto.url, public_id: p.documents.profilePhoto.publicId }
          : null,
        coverPhoto: p.documents?.coverPhoto?.url
          ? { url: p.documents.coverPhoto.url, public_id: p.documents.coverPhoto.publicId }
          : null,
        // V6.9.1: Agency logo (top-level field on AgentProfile, not inside documents)
        // Only relevant for agency accounts, but always read to avoid stale data
        agencyLogo: (p as unknown as { agencyLogo?: { url?: string; publicId?: string } })
          .agencyLogo?.url
          ? {
              url: (p as unknown as { agencyLogo: { url: string; publicId?: string } }).agencyLogo.url,
              public_id: (p as unknown as { agencyLogo: { url: string; publicId?: string } }).agencyLogo.publicId,
            }
          : null,
      },
    });

    // V6.8.13: Reset unsaved state after form hydration
    // This ensures fresh data from server = clean state
    setHasUnsaved(false);
  }, [contextProfile]);

  // ── Field handlers ──────────────────────────────────────────────────────────
  const setField = useCallback(
    <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setHasUnsaved(true);
    },
    []
  );

  const setNested = useCallback(
    (parent: keyof ProfileFormData, child: string, value: unknown) => {
      setForm((prev) => {
        const parentVal = prev[parent];
        if (typeof parentVal !== "object" || parentVal === null) return prev;
        return {
          ...prev,
          [parent]: {
            ...(parentVal as Record<string, unknown>),
            [child]: value,
          },
        };
      });
      setHasUnsaved(true);
    },
    []
  );

  const toggleSpecialization = useCallback((value: AgentSpecialization) => {
  setForm((prev) => {
    const arr = prev.specializations;
    return {
      ...prev,
      specializations: arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value],
    };
  });
  setHasUnsaved(true);
}, []);

const toggleLanguage = useCallback((value: string) => {
  setForm((prev) => {
    const arr = prev.languages;
    return {
      ...prev,
      languages: arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value],
    };
  });
  setHasUnsaved(true);
}, []);

  const toggleCity = useCallback((city: string) => {
    setForm((prev) => {
      const cities = prev.serviceAreas.cities;
      return {
        ...prev,
        serviceAreas: {
          ...prev.serviceAreas,
          cities: cities.includes(city)
            ? cities.filter((c) => c !== city)
            : [...cities, city],
        },
      };
    });
    setHasUnsaved(true);
  }, []);

  const addLocality = useCallback(() => {
    const val = localityInput.trim();
    if (!val) return;
    setForm((prev) => {
      if (prev.serviceAreas.localities.includes(val)) return prev;
      return {
        ...prev,
        serviceAreas: {
          ...prev.serviceAreas,
          localities: [...prev.serviceAreas.localities, val],
        },
      };
    });
    setLocalityInput("");
    setHasUnsaved(true);
  }, [localityInput]);

  const removeLocality = useCallback((val: string) => {
    setForm((prev) => ({
      ...prev,
      serviceAreas: {
        ...prev.serviceAreas,
        localities: prev.serviceAreas.localities.filter((l) => l !== val),
      },
    }));
    setHasUnsaved(true);
  }, []);

  const handleImageUpload = useCallback(
    (type: "profile" | "cover" | "logo", file: MediaFile) => {
      setForm((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [type === "profile" ? "profilePhoto" :
           type === "cover"   ? "coverPhoto"   :
                                "agencyLogo"]: file,
        },
      }));
      setHasUnsaved(true);
    },
    []
  );

  const handleImageRemove = useCallback((type: "profile" | "cover" | "logo") => {
    setForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [type === "profile" ? "profilePhoto" :
         type === "cover"   ? "coverPhoto"   :
                              "agencyLogo"]: null,
      },
    }));
    setHasUnsaved(true);
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!form.displayName.trim()) {
      newErrors.displayName = "Display name is required";
    } else if (form.displayName.trim().length < 3) {
      newErrors.displayName = "Display name must be at least 3 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // V6.8.21: No scroll position capture needed
      // Body lock via useLayoutEffect prevents any scroll movement
      if (!validate()) {
        // Only scroll to top on VALIDATION error (user needs to see the error)
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      setSaving(true);
      setSuccessMsg("");
      setErrors({});

      try {
        // V6.8.24: Build API payload with correct structure
        // Coordinates must be inside officeVerification.coordinates object
        // (API expects nested structure, not flat)
        const payload = {
          ...form,
          // Photo URLs flattened at root
          profilePhotoUrl:      form.documents.profilePhoto?.url,
          profilePhotoPublicId: form.documents.profilePhoto?.public_id,
          coverPhotoUrl:        form.documents.coverPhoto?.url,
          coverPhotoPublicId:   form.documents.coverPhoto?.public_id,
          // V6.9.1: Agency logo (only sent if agency account has logo)
          agencyLogoUrl:        form.documents.agencyLogo?.url,
          agencyLogoPublicId:   form.documents.agencyLogo?.public_id,
          // V6.8.24 FIX: Wrap coordinates in nested structure
          // API expects: officeVerification.coordinates.latitude/longitude
          officeVerification: {
            address: form.officeVerification.address,
            city:    form.officeVerification.city,
            coordinates:
              form.officeVerification.latitude !== null &&
              form.officeVerification.latitude !== undefined &&
              form.officeVerification.longitude !== null &&
              form.officeVerification.longitude !== undefined
                ? {
                    latitude:  form.officeVerification.latitude,
                    longitude: form.officeVerification.longitude,
                  }
                : undefined,
          },
        };

        const res = await fetch("/api/agent/profile", {
          method:      "PATCH",
          credentials: "include",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify(payload),
        });

        const data = (await res.json()) as {
          success:  boolean;
          message?: string;
        };

        if (!res.ok || !data.success) {
          setErrors({
            general: data.message ?? "Failed to save profile. Please try again.",
          });
          // Don't scroll on error — error shows inline
          return;
        }

        // V6.8.23: DEFINITIVE FIX — Show modal FIRST, refresh in background
        // Key insight: refreshProfile() causes layout shift only if awaited
        //   BEFORE modal shows. Show modal FIRST, then refresh silently.
        // This way: modal covers everything → user never sees layout shift.

        // STEP 1: Clear unsaved + errors (fast state updates)
        setHasUnsaved(false);
        setErrors({});

        // STEP 2: Show modal IMMEDIATELY (backdrop covers page instantly)
        setSuccessMsg("Your profile changes are now live and visible to clients.");

        // STEP 3: Refresh profile in BACKGROUND (user can't see layout shift)
        // The modal + backdrop hide everything behind it
        // No await needed — fire-and-forget with error handling
        void refreshProfile().catch(() => {
          // Silent fail — profile will refresh on next page load
          // Modal still shows success (data IS saved on server)
        });

        // Defensive: reset hasUnsaved
        setTimeout(() => setHasUnsaved(false), 100);
        setTimeout(() => setHasUnsaved(false), 500);

        // Auto-clear success message after 5 seconds
        setTimeout(() => setSuccessMsg(""), 5000);
      } catch {
        setErrors({ general: "Something went wrong. Please try again." });
      } finally {
        setSaving(false);
      }
    },
    [form, validate, refreshProfile]
  );

  // ── Scroll to section handler ──────────────────────────────────────────────
  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse"
          >
            <div className="h-5 bg-gray-200 rounded w-40 mb-6" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const userEmail = session?.user?.email ?? "";
  const userPhone = contextProfile
    ? "Encrypted — visible to admin only"
    : "Not on file";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#004063] tracking-tight">
              Edit Profile
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Update your professional information visible to clients
            </p>
          </div>
          {contextProfile?.verificationLevel &&
            contextProfile.verificationLevel !== "not_verified" && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-xs font-bold">
                <Shield className="w-3.5 h-3.5" />
                {contextProfile.verificationLevel.replace(/_/g, " ").toUpperCase()}
              </div>
            )}
        </div>

        {/* ── Profile Completion ────────────────────────────────────────────── */}
        <ProfileCompletionCard completion={profileCompletion} profile={form} />

        {/* V6.8.23: Beautiful centered success modal with SOLID backdrop */}
        {/* Uses SOLID color (not transparent) to hide ALL background content */}
        {successMsg && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* SOLID backdrop — completely hides background including footer */}
            <div
              className="absolute inset-0"
              style={{
                background: "rgba(15, 23, 42, 0.75)",  // Solid dark navy (matches Highrise)
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                animation: "fadeIn 0.3s ease-out",
              }}
              onClick={() => setSuccessMsg("")}
            />

            {/* Modal card */}
            <div
              className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
              style={{ animation: "modalPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              {/* Highrise gradient header banner */}
              <div className="h-2 bg-gradient-to-r from-[#029bba] via-[#0284a3] to-[#004063]" />

              <div className="p-8 pt-10">
                {/* Animated checkmark circle */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    {/* Outer glow ring */}
                    <div
                      className="absolute inset-0 rounded-full bg-emerald-400 blur-xl opacity-50"
                      style={{ animation: "pulseGlow 2s ease-in-out infinite" }}
                    />
                    {/* Main circle */}
                    <div
                      className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg"
                      style={{ animation: "iconBounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                    >
                      <CheckCircle
                        className="w-11 h-11 text-white"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                </div>

                {/* Title with gradient */}
                <h2 className="text-2xl font-black text-center mb-2 bg-gradient-to-r from-[#029bba] to-[#004063] bg-clip-text text-transparent">
                  Changes Saved! 🎉
                </h2>

                {/* Message */}
                <p className="text-sm text-gray-600 text-center leading-relaxed mb-6 px-2">
                  {successMsg}
                </p>

                {/* Info badge */}
                <div className="bg-gradient-to-r from-[#029bba]/5 to-[#004063]/5 border border-[#029bba]/20 rounded-xl p-3 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#029bba] flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Your profile is now <strong className="text-[#004063]">live</strong> and visible to clients on Highrise.pk
                  </p>
                </div>

                {/* Highrise gradient primary button */}
                <button
                  type="button"
                  onClick={() => setSuccessMsg("")}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #029bba 0%, #0284a3 50%, #004063 100%)",
                    boxShadow: "0 10px 25px -5px rgba(2, 155, 186, 0.4)",
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    Perfect, Continue
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </button>

                {/* Auto-dismiss indicator */}
                <p className="text-[10px] text-center text-gray-400 mt-3">
                  Auto-closes in 5 seconds
                </p>
              </div>

              {/* Bottom progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#029bba] to-[#004063]"
                  style={{ animation: "shrinkBar 5s linear forwards" }}
                />
              </div>
            </div>

            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to   { opacity: 1; }
              }
              @keyframes modalPop {
                0%   { transform: scale(0.7) translateY(20px); opacity: 0; }
                60%  { transform: scale(1.05) translateY(-4px); opacity: 1; }
                100% { transform: scale(1)    translateY(0);    opacity: 1; }
              }
              @keyframes iconBounce {
                0%   { transform: scale(0);    opacity: 0; }
                60%  { transform: scale(1.15); opacity: 1; }
                100% { transform: scale(1);    opacity: 1; }
              }
              @keyframes pulseGlow {
                0%, 100% { opacity: 0.3; transform: scale(1);   }
                50%      { opacity: 0.6; transform: scale(1.1); }
              }
              @keyframes shrinkBar {
                from { width: 100%; }
                to   { width: 0%;   }
              }
            `}</style>
          </div>
        )}

        {/* Error toast — kept simple, top-right */}
        {errors.general && (
          <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right-8 fade-in duration-300 max-w-sm">
            <div className="bg-white rounded-xl shadow-xl border-l-4 border-red-500 p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-900">Error</p>
                <p className="text-xs text-gray-600 mt-0.5">{errors.general}</p>
              </div>
              <button
                onClick={() => setErrors({})}
                className="p-1 rounded hover:bg-gray-100 transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {/* ── Unsaved Changes Warning ───────────────────────────────────────── */}
        {hasUnsaved && !successMsg && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="text-sm text-amber-800">
              You have unsaved changes.
            </span>
          </div>
        )}

        {/* ── Sticky Section Nav ───────────────────────────────────────────── */}
        <div className="sticky top-16 z-20 bg-gray-50 border-b border-gray-200 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-6 backdrop-blur-sm">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeSection === section.id
                    ? "bg-[#029bba] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">

          {/* ── Section 1: Profile Media ─────────────────────────────────── */}
          <div
            id="section-media"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <SectionHeader
              icon={<Camera className="w-5 h-5" />}
              title="Profile Media"
              description="Photos help clients recognize and trust you"
            />
            <div className="space-y-6">
              <ImageUploadSection
                type="cover"
                current={form.documents.coverPhoto}
                onUpload={handleImageUpload}
                onRemove={handleImageRemove}
              />
              <ImageUploadSection
                type="profile"
                current={form.documents.profilePhoto}
                onUpload={handleImageUpload}
                onRemove={handleImageRemove}
              />

              {/* V6.9.1: Agency Logo — ONLY for agency accounts */}
              {/* Divider + explanation shown before the logo upload */}
              {form.agentType === "agency" && (
                <>
                  <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 leading-relaxed">
                        <strong>Agency Branding:</strong> Your agency logo will appear next to your
                        name on property listings, search results, and your public profile — helping
                        clients recognize your brand instantly.
                      </p>
                    </div>
                    <ImageUploadSection
                      type="logo"
                      current={form.documents.agencyLogo}
                      onUpload={handleImageUpload}
                      onRemove={handleImageRemove}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Section 2: Basic Information ─────────────────────────────── */}
          <div
            id="section-basic"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <SectionHeader
              icon={<User className="w-5 h-5" />}
              title="Basic Information"
              description="Your professional identity"
            />
            <div className="grid md:grid-cols-2 gap-6">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setField("displayName", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none transition-colors ${
                    errors.displayName ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder="Your professional name"
                />
                <FieldError message={errors.displayName} />
              </div>

              {/* Agent Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Agent Type
                </label>
                <select
                  value={form.agentType}
                  onChange={(e) => setField("agentType", e.target.value as AgentType)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none bg-white"
                >
                  <option value="individual">Individual Agent</option>
                  <option value="agency">Real Estate Agency</option>
                  <option value="freelance">Freelance Agent</option>
                </select>
              </div>

              {/* Agency Name — conditional */}
              {form.agentType === "agency" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Agency Name
                  </label>
                  <input
                    type="text"
                    value={form.agencyName}
                    onChange={(e) => setField("agencyName", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                    placeholder="Your agency name"
                  />
                </div>
              )}

              {/* License Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  value={form.licenseNumber}
                  onChange={(e) => setField("licenseNumber", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                  placeholder="Professional license number"
                />
              </div>

              {/* Tagline */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tagline
                </label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setField("tagline", e.target.value)}
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                  placeholder="e.g., Your trusted property advisor in Lahore"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {form.tagline.length}/100
                </p>
              </div>

              {/* About */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  About
                </label>
                <textarea
                  value={form.about}
                  onChange={(e) => setField("about", e.target.value)}
                  maxLength={1000}
                  rows={5}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none resize-none"
                  placeholder="Tell clients about yourself, your experience, and what makes you unique..."
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {form.about.length}/1000
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 3: Contact Information ───────────────────────────── */}
          <div
            id="section-contact"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <SectionHeader
              icon={<Phone className="w-5 h-5" />}
              title="Contact Information"
              description="How clients can reach you"
            />
            <div className="grid md:grid-cols-2 gap-6">
              {/* Phone — read only */}
              <ReadOnlyField
                label="Phone Number"
                value={userPhone}
                icon={<Phone className="w-4 h-4" />}
                note="Phone is verified and locked. Contact support@highrise.pk to change."
              />

              {/* Email — read only */}
              <ReadOnlyField
                label="Email Address"
                value={userEmail}
                icon={<Mail className="w-4 h-4" />}
                note="Email is your account identity and cannot be changed here."
              />

              {/* Office Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Office Address
                </label>
                <input
                  type="text"
                  value={form.officeVerification.address}
                  onChange={(e) =>
                    setNested("officeVerification", "address", e.target.value)
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                  placeholder="Shop 12, Rehman Center, F-10 Markaz"
                />
              </div>

              {/* V6.8.11: Interactive Location Picker */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📍 Pinpoint Your Exact Location
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    (helps clients find you)
                  </span>
                </label>
                <OfficeLocationPicker
                  initialAddress={form.officeVerification.address}
                  initialCity={form.serviceAreas.cities[0]}
                  initialLat={form.officeVerification.latitude ?? undefined}
                  initialLng={form.officeVerification.longitude ?? undefined}
                  onLocationChange={(location) => {
                    setForm((prev) => {
                      // V6.8.14 FIX: Only mark unsaved if coordinates ACTUALLY changed
                      // Prevents false "unsaved" trigger on initial map load
                      const oldLat = prev.officeVerification.latitude;
                      const oldLng = prev.officeVerification.longitude;
                      const latChanged = Math.abs((oldLat ?? 0) - location.lat) > 0.000001;
                      const lngChanged = Math.abs((oldLng ?? 0) - location.lng) > 0.000001;

                      if (latChanged || lngChanged) {
                        // Only trigger unsaved if REAL change
                        setTimeout(() => setHasUnsaved(true), 0);
                      }

                      return {
                        ...prev,
                        officeVerification: {
                          ...prev.officeVerification,
                          address:   location.address || prev.officeVerification.address,
                          city:      location.city    || prev.officeVerification.city,
                          latitude:  location.lat,
                          longitude: location.lng,
                        },
                      };
                    });
                  }}
                  height={380}
                  showGpsButton={true}
                  showSearchBox={true}
                />
              </div>
            </div>
          </div>

          {/* ── Section 4: Experience & Expertise ────────────────────────── */}
          <div
            id="section-experience"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <SectionHeader
              icon={<Briefcase className="w-5 h-5" />}
              title="Experience & Expertise"
              description="Your professional track record"
            />

            {/* V6.8.11: Experience — Years EDITABLE, Deals/Value READ-ONLY */}
            {/* Enterprise pattern: Only Highrise-verified stats are trustworthy */}
            <div className="mb-8">
              {/* Editable: Years of Experience */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={form.experience.years}
                  onChange={(e) =>
                    setNested(
                      "experience",
                      "years",
                      Math.max(0, parseInt(e.target.value) || 0)
                    )
                  }
                  min={0}
                  max={60}
                  className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Your industry experience — will be verified during account review.
                </p>
              </div>

              {/* Read-Only: Verified Performance Stats */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#029bba] flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-[#004063]">
                      Verified Performance Stats
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Managed by Highrise.pk to ensure trust and prevent fraud
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    Read Only
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Total Deals — Read Only */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        🤝 Total Deals Closed
                      </p>
                      <Lock className="w-3 h-3 text-gray-300" />
                    </div>
                    <p className="text-2xl font-black text-[#004063]">
                      {form.experience.totalDeals ?? 0}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Updated when Highrise verifies your transactions
                    </p>
                  </div>

                  {/* Total Value — Read Only */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        💰 Total Deal Value
                      </p>
                      <Lock className="w-3 h-3 text-gray-300" />
                    </div>
                    <p className="text-2xl font-black text-[#004063]">
                      {form.experience.totalValue
                        ? form.experience.totalValue >= 10_000_000
                          ? `PKR ${(form.experience.totalValue / 10_000_000).toFixed(1)} Cr`
                          : form.experience.totalValue >= 100_000
                          ? `PKR ${(form.experience.totalValue / 100_000).toFixed(1)} Lac`
                          : `PKR ${form.experience.totalValue.toLocaleString()}`
                        : "PKR 0"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Sum of verified transactions
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#029bba] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    <strong>Why can&apos;t I edit these?</strong> To maintain trust, Highrise.pk verifies
                    every transaction and updates these numbers automatically. Complete more deals
                    through our platform to grow your stats.
                  </p>
                </div>
              </div>
            </div>

            {/* Specializations */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Specializations
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATION_OPTIONS.map((spec) => (
  <ToggleChip
    key={spec.value}
    label={spec.label}
    selected={form.specializations.includes(spec.value)}
    onToggle={() => toggleSpecialization(spec.value)}
  />
))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Languages Spoken
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
  <ToggleChip
    key={lang}
    label={lang}
    selected={form.languages.includes(lang)}
    onToggle={() => toggleLanguage(lang)}
  />
))}
              </div>
            </div>
          </div>

          {/* ── Section 5: Service Areas ─────────────────────────────────── */}
          <div
            id="section-areas"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <SectionHeader
              icon={<MapPin className="w-5 h-5" />}
              title="Service Areas"
              description="Where you operate"
            />

            {/* Cities */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Cities Served
              </label>
              <div className="flex flex-wrap gap-2">
                {PAKISTAN_CITIES.map((city) => (
                  <ToggleChip
                    key={city}
                    label={city}
                    selected={form.serviceAreas.cities.includes(city)}
                    onToggle={() => toggleCity(city)}
                  />
                ))}
              </div>
            </div>

            {/* Localities */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Specific Localities
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={localityInput}
                  onChange={(e) => setLocalityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLocality();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                  placeholder="e.g., DHA Phase 5, Gulberg III"
                />
                <button
                  type="button"
                  onClick={addLocality}
                  className="px-4 py-2.5 bg-[#029bba] text-white rounded-xl hover:bg-[#027a94] transition-colors"
                  aria-label="Add locality"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {form.serviceAreas.localities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.serviceAreas.localities.map((loc) => (
                    <span
                      key={loc}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {loc}
                      <button
                        type="button"
                        onClick={() => removeLocality(loc)}
                        className="hover:text-red-500 transition-colors"
                        aria-label={`Remove ${loc}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 6: Business Hours ────────────────────────────────── */}
          <div
            id="section-hours"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <SectionHeader
              icon={<Clock className="w-5 h-5" />}
              title="Business Hours"
              description="When you're available"
            />
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Weekdays (Mon–Fri)
                </label>
                <input
                  type="text"
                  value={form.businessHours.weekdays ?? ""}
                  onChange={(e) => setNested("businessHours", "weekdays", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                  placeholder="e.g., 9:00 AM - 6:00 PM"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Weekends (Sat–Sun)
                </label>
                <input
                  type="text"
                  value={form.businessHours.weekends ?? ""}
                  onChange={(e) => setNested("businessHours", "weekends", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                  placeholder="e.g., 10:00 AM - 4:00 PM"
                />
              </div>
            </div>
          </div>

          {/* ── Section 7: Social Media Links ────────────────────────────── */}
          <div
            id="section-social"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <SectionHeader
              icon={<Globe className="w-5 h-5" />}
              title="Social Media Links"
              description="Build trust with your social presence"
            />
            <div className="grid md:grid-cols-2 gap-6">
              {(
                [
                  {
                    key: "facebook" as const,
                    icon: <Facebook className="w-4 h-4" />,
                    label: "Facebook",
                    placeholder: "https://facebook.com/yourpage",
                  },
                  {
                    key: "instagram" as const,
                    icon: <Instagram className="w-4 h-4" />,
                    label: "Instagram",
                    placeholder: "https://instagram.com/yourprofile",
                  },
                  {
                    key: "linkedin" as const,
                    icon: <Linkedin className="w-4 h-4" />,
                    label: "LinkedIn",
                    placeholder: "https://linkedin.com/in/yourprofile",
                  },
                  {
                    key: "youtube" as const,
                    icon: <Youtube className="w-4 h-4" />,
                    label: "YouTube",
                    placeholder: "https://youtube.com/yourchannel",
                  },
                  {
                    key: "twitter" as const,
                    icon: <Twitter className="w-4 h-4" />,
                    label: "Twitter / X",
                    placeholder: "https://twitter.com/yourhandle",
                  },
                ]
              ).map(({ key, icon, label, placeholder }) => (
                <div key={key}>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                    <span className="text-gray-500">{icon}</span>
                    {label}
                  </label>
                  <input
                    type="url"
                    value={form.socialLinks[key] ?? ""}
                    onChange={(e) => setNested("socialLinks", key, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sticky Save Bar ────────────────────────────────────────────── */}
        <div className="sticky bottom-4 z-10 mt-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg px-6 py-4 flex items-center justify-between gap-4">
            <p className="text-sm">
              {hasUnsaved ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Unsaved changes
                </span>
              ) : successMsg ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  All changes saved
                </span>
              ) : (
                <span className="text-gray-500">
                  Complete your profile for better visibility
                </span>
              )}
            </p>
            <button
              type="submit"
              disabled={saving || !hasUnsaved}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#029bba] text-white font-bold rounded-xl hover:bg-[#027a94] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#029bba]/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hide scrollbar utility */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </form>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function AgentProfilePage(): React.ReactElement {
  return (
    <AgentLayout
      title="Edit Profile | Highrise.pk"
      description="Update your agent profile on Highrise.pk"
    >
      <ProfileFormContent />
    </AgentLayout>
  );
}

// ========== END OF FILE ==========