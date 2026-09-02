// components/developer/CompletedProjectRepeater.tsx
// ═══════════════════════════════════════════════════════════════
// COMPLETED PROJECT REPEATER — Highrise.pk V6.4.5+
// Developer portfolio section — add/edit/remove completed projects
// ═══════════════════════════════════════════════════════════════
// ✅ Add/remove projects (max 50)
// ✅ Per-project 1-5 image uploads via /api/upload
// ✅ Delayed/on_hold → auto-shows delayReason field
// ✅ YouTube/Vimeo URL validation
// ✅ Admin verification badge (read-only)
// ✅ Expand/collapse per project
// ✅ No banned patterns, strict TypeScript
// ═══════════════════════════════════════════════════════════════

import React, {
  useState,
  useCallback,
  useRef,
} from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Upload,
  Loader2,
  X,
  AlertTriangle,
  Building2,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Video,
  FileText,
  AlertCircle,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export type CompletedProjectType =
  | "residential_society"
  | "residential_highrise"
  | "apartment_complex"
  | "commercial_society"
  | "highrise_building"
  | "mixed_use"
  | "townhouse_complex"
  | "gated_community"
  | "housing_scheme"
  | "township"
  | "farmhouse_society"
  | "commercial_plaza"
  | "shopping_mall"
  | "corporate_office_tower"
  | "industrial_park"
  | "retirement_community"
  | "student_housing";

export type CompletedProjectStatus =
  | "completed"
  | "under_construction"
  | "ready_for_possession"
  | "delayed"
  | "on_hold";

export interface CompletedProject {
  _id?: string;
  projectName: string;
  projectType: CompletedProjectType | "";
  city: string;
  area: string;
  location?: string;
  startYear?: string;
  completionYear: string;
  status: CompletedProjectStatus | "";
  delayReason?: string;
  expectedResolutionDate?: string;
  totalUnits?: string;
  totalPlots?: string;
  totalArea?: string;
  societyName?: string;
  description?: string;
  images: string[];         // Cloudinary URLs
  videoUrl?: string;
  virtualTourUrl?: string;
  brochureUrl?: string;
  // Read-only — set by admin
  isVerified?: boolean;
  verifiedAt?: string;
  verificationNotes?: string;
  addedAt?: string;
  updatedAt?: string;
}

interface CompletedProjectRepeaterProps {
  projects: CompletedProject[];
  onChange: (projects: CompletedProject[]) => void;
  disabled?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_PROJECTS = 50;
const MAX_IMAGES_PER_PROJECT = 5;
const CURRENT_YEAR = new Date().getFullYear();

const PROJECT_TYPES: { value: CompletedProjectType; label: string }[] = [
  { value: "residential_society",    label: "Residential Society" },
  { value: "residential_highrise",   label: "Residential High-Rise Building" },
  { value: "apartment_complex",      label: "Apartment Complex" },
  { value: "commercial_society",     label: "Commercial Society" },
  { value: "highrise_building",      label: "Highrise Building" },
  { value: "mixed_use",              label: "Mixed Use Development" },
  { value: "townhouse_complex",      label: "Townhouse Complex" },
  { value: "gated_community",        label: "Gated Community" },
  { value: "housing_scheme",         label: "Housing Scheme" },
  { value: "township",               label: "Township" },
  { value: "farmhouse_society",      label: "Farmhouse Society" },
  { value: "commercial_plaza",       label: "Commercial Plaza" },
  { value: "shopping_mall",          label: "Shopping Mall" },
  { value: "corporate_office_tower", label: "Corporate Office Tower" },
  { value: "industrial_park",        label: "Industrial Park" },
  { value: "retirement_community",   label: "Senior Living / Retirement Community" },
  { value: "student_housing",        label: "Student Housing / Hostels" },
];

const PROJECT_STATUSES: {
  value: CompletedProjectStatus;
  label: string;
  color: string;
}[] = [
  {
    value: "completed",
    label: "✅ Completed",
    color: "text-emerald-700",
  },
  {
    value: "ready_for_possession",
    label: "🔑 Ready for Possession",
    color: "text-blue-700",
  },
  {
    value: "under_construction",
    label: "🏗️ Under Construction",
    color: "text-amber-700",
  },
  {
    value: "delayed",
    label: "⚠️ Delayed",
    color: "text-orange-700",
  },
  {
    value: "on_hold",
    label: "⏸️ On Hold",
    color: "text-red-700",
  },
];

// YouTube/Vimeo regex — matches client-side (mirrors API validation)
const VIDEO_URL_REGEX =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)[a-zA-Z0-9_\-?=&]+$/;

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
const helpCls  = "text-xs text-[#666666] mt-1.5";

// ============================================
// HELPERS
// ============================================

function makeEmptyProject(): CompletedProject {
  return {
    projectName:    "",
    projectType:    "",
    city:           "",
    area:           "",
    location:       "",
    startYear:      "",
    completionYear: String(CURRENT_YEAR),
    status:         "",
    delayReason:    "",
    totalUnits:     "",
    totalPlots:     "",
    totalArea:      "",
    societyName:    "",
    description:    "",
    images:         [],
    videoUrl:       "",
    virtualTourUrl: "",
    isVerified:     false,
  };
}

function needsDelayReason(status: string): boolean {
  return status === "delayed" || status === "on_hold";
}

function validateVideoUrl(url: string): boolean {
  if (!url.trim()) return true; // Optional field
  return VIDEO_URL_REGEX.test(url.trim());
}

// ============================================
// IMAGE UPLOADER SUB-COMPONENT
// ============================================

interface ProjectImageUploaderProps {
  images: string[];
  projectIndex: number;
  onChange: (images: string[]) => void;
  disabled?: boolean;
}

function ProjectImageUploader({
  images,
  projectIndex,
  onChange,
  disabled,
}: ProjectImageUploaderProps): React.ReactElement {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      const remaining = MAX_IMAGES_PER_PROJECT - images.length;
      if (remaining <= 0) {
        setUploadError(`Maximum ${MAX_IMAGES_PER_PROJECT} images per project.`);
        return;
      }

      const toUpload = files.slice(0, remaining);
      setUploading(true);
      setUploadError(null);

      const newUrls: string[] = [];

      for (const file of toUpload) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`"${file.name}" exceeds 10MB limit.`);
          continue;
        }
        if (file.size === 0) {
          setUploadError(`"${file.name}" appears to be empty.`);
          continue;
        }

        try {
          const formData = new FormData();
          formData.append("file", file, file.name);

          const res = await fetch("/api/upload?folder=profiles", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          const data = (await res.json()) as {
            success: boolean;
            data?: { url: string; publicId: string };
            error?: string;
          };

          if (data.success && data.data?.url) {
            newUrls.push(data.data.url);
          } else {
            setUploadError(data.error ?? "Upload failed. Please try again.");
          }
        } catch {
          setUploadError("Upload failed. Please check your connection.");
        }
      }

      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
      }

      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    },
    [images, onChange]
  );

  const handleRemoveImage = (index: number): void => {
    onChange(images.filter((_, i) => i !== index));
  };

  const canAddMore = images.length < MAX_IMAGES_PER_PROJECT && !disabled;

  return (
    <div>
      <label className={labelCls}>
        Project Images{" "}
        <span className="text-[#ef4444]">*</span>
        <span className="text-xs font-normal text-gray-400 ml-1">
          (1–{MAX_IMAGES_PER_PROJECT} photos)
        </span>
      </label>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
          {images.map((url, idx) => (
            <div
              key={`${projectIndex}-img-${idx}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group"
            >
              <Image
                src={url}
                alt={`Project image ${idx + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove image ${idx + 1}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add more slot */}
          {canAddMore && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-[#029bba] hover:bg-[#029bba]/5 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
              aria-label="Add image"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-[#029bba] animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] text-gray-400">Add</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Upload button when no images */}
      {images.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || disabled}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#029bba] hover:bg-[#029bba]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-[#029bba] animate-spin shrink-0" />
          ) : (
            <Upload className="w-5 h-5 text-gray-400 shrink-0" />
          )}
          <div className="text-left">
            <p className="text-sm font-medium text-gray-600">
              {uploading ? "Uploading..." : "Upload project photos"}
            </p>
            <p className="text-xs text-gray-400">
              JPG, PNG, WebP — Max 10MB each
            </p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => { void handleFileChange(e); }}
      />

      {uploadError && (
        <p className="text-xs text-[#ef4444] mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {uploadError}
        </p>
      )}

      {images.length > 0 && (
        <p className={helpCls}>
          {images.length}/{MAX_IMAGES_PER_PROJECT} images •{" "}
          {canAddMore ? "Click + to add more" : "Maximum reached"}
        </p>
      )}
    </div>
  );
}

// ============================================
// SINGLE PROJECT CARD
// ============================================

interface ProjectCardProps {
  project: CompletedProject;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updated: CompletedProject) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function ProjectCard({
  project,
  index,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
  disabled,
}: ProjectCardProps): React.ReactElement {
  const [videoError, setVideoError] = useState<string | null>(null);

  const handleField = (
    field: keyof CompletedProject,
    value: string | string[]
  ): void => {
    onChange({ ...project, [field]: value });
  };

  const handleVideoUrl = (url: string): void => {
    handleField("videoUrl", url);
    if (url.trim() && !validateVideoUrl(url)) {
      setVideoError("Must be a valid YouTube or Vimeo URL");
    } else {
      setVideoError(null);
    }
  };

  // Derive display info for collapsed header
  const displayName = project.projectName.trim() || `Project ${index + 1}`;
  const displayCity = project.city.trim();
  const displayYear = project.completionYear;
  const statusConfig = PROJECT_STATUSES.find((s) => s.value === project.status);

  const hasImages  = project.images.length > 0;
  const isVerified = project.isVerified === true;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isVerified
          ? "border-emerald-200 bg-emerald-50/30"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* ── Card Header (always visible) ──────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isExpanded}
      >
        {/* Index badge */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
            isVerified
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[#029bba]/10 text-[#029bba]"
          }`}
        >
          {index + 1}
        </div>

        {/* Project summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-[#004063] truncate">
              {displayName}
            </p>

            {/* Verified badge */}
            {isVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full border border-amber-200 shrink-0">
                <Clock className="w-3 h-3" />
                Pending Verification
              </span>
            )}

            {/* Status badge */}
            {statusConfig && (
              <span
                className={`text-[11px] font-semibold shrink-0 ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
            )}
          </div>

          {/* Sub-info row */}
          {(displayCity || displayYear) && (
            <div className="flex items-center gap-3 mt-0.5">
              {displayCity && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {displayCity}
                </span>
              )}
              {displayYear && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {displayYear}
                </span>
              )}
              {hasImages && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {project.images.length} photo
                  {project.images.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
              aria-label={`Remove project ${index + 1}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="w-6 h-6 flex items-center justify-center text-gray-400">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* ── Expanded Form Body ─────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-5">

          {/* Admin verification notice */}
          {isVerified && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-800">
                  Admin Verified
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  This project has been verified by the Highrise.pk team.
                  {project.verificationNotes && (
                    <> Notes: {project.verificationNotes}</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Row 1: Project Name + Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor={`pname-${index}`}>
                Project Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id={`pname-${index}`}
                type="text"
                className={inputCls}
                value={project.projectName}
                onChange={(e) => handleField("projectName", e.target.value)}
                placeholder="e.g. Bahria Enclave Block A"
                maxLength={150}
                disabled={disabled}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor={`ptype-${index}`}>
                Project Type <span className="text-[#ef4444]">*</span>
              </label>
              <select
                id={`ptype-${index}`}
                className={inputCls}
                value={project.projectType}
                onChange={(e) =>
                  handleField("projectType", e.target.value)
                }
                disabled={disabled}
              >
                <option value="">Select Type</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: City + Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor={`pcity-${index}`}>
                City <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id={`pcity-${index}`}
                type="text"
                className={inputCls}
                value={project.city}
                onChange={(e) => handleField("city", e.target.value)}
                placeholder="e.g. Islamabad"
                disabled={disabled}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor={`parea-${index}`}>
                Area / Locality <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id={`parea-${index}`}
                type="text"
                className={inputCls}
                value={project.area}
                onChange={(e) => handleField("area", e.target.value)}
                placeholder="e.g. DHA Phase 5"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Row 3: Location (full address) */}
          <div>
            <label className={labelCls} htmlFor={`ploc-${index}`}>
              Full Location / Landmark
            </label>
            <input
              id={`ploc-${index}`}
              type="text"
              className={inputCls}
              value={project.location ?? ""}
              onChange={(e) => handleField("location", e.target.value)}
              placeholder="e.g. Near Motorway M2, Islamabad"
              disabled={disabled}
            />
          </div>

          {/* Row 4: Years */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor={`pstart-${index}`}>
                Start Year
              </label>
              <input
                id={`pstart-${index}`}
                type="number"
                className={inputCls}
                value={project.startYear ?? ""}
                onChange={(e) => handleField("startYear", e.target.value)}
                placeholder="e.g. 2018"
                min={1900}
                max={CURRENT_YEAR}
                disabled={disabled}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor={`pcomp-${index}`}>
                Completion Year <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id={`pcomp-${index}`}
                type="number"
                className={inputCls}
                value={project.completionYear}
                onChange={(e) =>
                  handleField("completionYear", e.target.value)
                }
                placeholder={String(CURRENT_YEAR)}
                min={1900}
                max={CURRENT_YEAR + 10}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Row 5: Status */}
          <div>
            <label className={labelCls} htmlFor={`pstatus-${index}`}>
              Project Status <span className="text-[#ef4444]">*</span>
            </label>
            <select
              id={`pstatus-${index}`}
              className={inputCls}
              value={project.status}
              onChange={(e) => handleField("status", e.target.value)}
              disabled={disabled}
            >
              <option value="">Select Status</option>
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Row 6: Delay Reason (conditional) */}
          {needsDelayReason(project.status) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-sm font-bold text-amber-800">
                  Transparency Required
                </p>
              </div>
              <label className={labelCls} htmlFor={`pdelay-${index}`}>
                Reason for Delay / Hold{" "}
                <span className="text-[#ef4444]">*</span>
              </label>
              <textarea
                id={`pdelay-${index}`}
                className={`${inputCls} min-h-[80px] resize-none`}
                value={project.delayReason ?? ""}
                onChange={(e) =>
                  handleField("delayReason", e.target.value)
                }
                placeholder="Explain the reason honestly — buyers appreciate transparency..."
                maxLength={500}
                disabled={disabled}
              />
              <p className={helpCls}>
                {(project.delayReason ?? "").length}/500 — Honest
                explanation builds trust with buyers
              </p>

              {/* Expected resolution */}
              <div className="mt-4">
                <label
                  className={labelCls}
                  htmlFor={`presolution-${index}`}
                >
                  Expected Resolution Date
                </label>
                <input
                  id={`presolution-${index}`}
                  type="text"
                  className={inputCls}
                  value={project.expectedResolutionDate ?? ""}
                  onChange={(e) =>
                    handleField("expectedResolutionDate", e.target.value)
                  }
                  placeholder="e.g. Q1 2026 or March 2026"
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {/* Row 7: Details grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls} htmlFor={`punits-${index}`}>
                Total Units
              </label>
              <input
                id={`punits-${index}`}
                type="number"
                className={inputCls}
                value={project.totalUnits ?? ""}
                onChange={(e) =>
                  handleField("totalUnits", e.target.value)
                }
                placeholder="e.g. 500"
                min={0}
                disabled={disabled}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor={`pplots-${index}`}>
                Total Plots
              </label>
              <input
                id={`pplots-${index}`}
                type="number"
                className={inputCls}
                value={project.totalPlots ?? ""}
                onChange={(e) =>
                  handleField("totalPlots", e.target.value)
                }
                placeholder="e.g. 200"
                min={0}
                disabled={disabled}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor={`parea2-${index}`}>
                Total Area
              </label>
              <input
                id={`parea2-${index}`}
                type="text"
                className={inputCls}
                value={project.totalArea ?? ""}
                onChange={(e) =>
                  handleField("totalArea", e.target.value)
                }
                placeholder="e.g. 50 Acres"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Row 8: Society Name */}
          <div>
            <label className={labelCls} htmlFor={`psoc-${index}`}>
              Society / Brand Name
            </label>
            <input
              id={`psoc-${index}`}
              type="text"
              className={inputCls}
              value={project.societyName ?? ""}
              onChange={(e) =>
                handleField("societyName", e.target.value)
              }
              placeholder="e.g. Bahria Town, DHA, etc."
              disabled={disabled}
            />
          </div>

          {/* Row 9: Description */}
          <div>
            <label className={labelCls} htmlFor={`pdesc-${index}`}>
              Project Description
            </label>
            <textarea
              id={`pdesc-${index}`}
              className={`${inputCls} min-h-[90px] resize-none`}
              value={project.description ?? ""}
              onChange={(e) =>
                handleField("description", e.target.value)
              }
              placeholder="Brief description of the project, features, amenities..."
              maxLength={500}
              disabled={disabled}
            />
            <p className={helpCls}>
              {(project.description ?? "").length}/500 characters
            </p>
          </div>

          {/* Row 10: Images */}
          <ProjectImageUploader
            images={project.images}
            projectIndex={index}
            onChange={(imgs) => handleField("images", imgs)}
            disabled={disabled}
          />

          {/* Row 11: Video URL */}
          <div>
            <label className={labelCls} htmlFor={`pvideo-${index}`}>
              <Video className="w-4 h-4 inline mr-1.5 text-[#029bba]" />
              Video URL
            </label>
            <input
              id={`pvideo-${index}`}
              type="url"
              className={inputCls}
              value={project.videoUrl ?? ""}
              onChange={(e) => handleVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              disabled={disabled}
            />
            {videoError && (
              <p className="text-xs text-[#ef4444] mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {videoError}
              </p>
            )}
            <p className={helpCls}>
              YouTube or Vimeo links only
            </p>
          </div>

          {/* Row 12: Virtual Tour + Brochure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor={`pvtour-${index}`}>
                Virtual Tour URL
              </label>
              <input
                id={`pvtour-${index}`}
                type="url"
                className={inputCls}
                value={project.virtualTourUrl ?? ""}
                onChange={(e) =>
                  handleField("virtualTourUrl", e.target.value)
                }
                placeholder="https://..."
                disabled={disabled}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor={`pbroch-${index}`}>
                <FileText className="w-4 h-4 inline mr-1.5 text-[#029bba]" />
                Brochure URL
              </label>
              <input
                id={`pbroch-${index}`}
                type="url"
                className={inputCls}
                value={project.brochureUrl ?? ""}
                onChange={(e) =>
                  handleField("brochureUrl", e.target.value)
                }
                placeholder="https://..."
                disabled={disabled}
              />
            </div>
          </div>

          {/* Verification notice for unverified */}
          {!isVerified && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">
                <span className="font-bold text-gray-700">
                  Pending admin verification.
                </span>{" "}
                Our team will review this project and verify the details.
                Verified projects appear on your public profile and
                contribute to your badge tier.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CompletedProjectRepeater({
  projects,
  onChange,
  disabled,
}: CompletedProjectRepeaterProps): React.ReactElement {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    projects.length === 0 ? null : 0
  );

  const handleToggle = (index: number): void => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  const handleAdd = (): void => {
    if (projects.length >= MAX_PROJECTS || disabled) return;
    const newProject = makeEmptyProject();
    const newProjects = [...projects, newProject];
    onChange(newProjects);
    // Auto-expand new project
    setExpandedIndex(newProjects.length - 1);
  };

  const handleRemove = (index: number): void => {
    const updated = projects.filter((_, i) => i !== index);
    onChange(updated);
    // Collapse if removed was expanded
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const handleChange = (index: number, updated: CompletedProject): void => {
    const newProjects = [...projects];
    newProjects[index] = updated;
    onChange(newProjects);
  };

  // Stats bar
  const verifiedCount   = projects.filter((p) => p.isVerified).length;
  const unverifiedCount = projects.length - verifiedCount;
  const canAdd = projects.length < MAX_PROJECTS && !disabled;

  return (
    <div className="space-y-4">

      {/* ── Header with stats ────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#004063]">
            Completed Projects
          </h3>
          {projects.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
              {verifiedCount > 0 && (
                <span className="text-emerald-600 font-semibold">
                  {" "}
                  • {verifiedCount} verified
                </span>
              )}
              {unverifiedCount > 0 && (
                <span className="text-amber-600">
                  {" "}
                  • {unverifiedCount} pending
                </span>
              )}
            </p>
          )}
        </div>

        {canAdd && (
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-semibold transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        )}
      </div>

      {/* ── Max reached notice ───────────────────────────────── */}
      {projects.length >= MAX_PROJECTS && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Maximum {MAX_PROJECTS} projects reached.
          </p>
        </div>
      )}

      {/* ── Project cards ─────────────────────────────────────── */}
      {projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((project, index) => (
            <ProjectCard
              key={project._id ?? `new-${index}`}
              project={project}
              index={index}
              isExpanded={expandedIndex === index}
              onToggle={() => handleToggle(index)}
              onChange={(updated) => handleChange(index, updated)}
              onRemove={() => handleRemove(index)}
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        /* ── Empty state ──────────────────────────────────────── */
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#029bba]/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-[#029bba]" />
          </div>
          <div>
            <p className="text-base font-bold text-[#004063]">
              No projects yet
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              Add your completed projects to showcase your track record.
              Admin verifies each project — verified projects boost your
              trust score and badge tier.
            </p>
          </div>
          {canAdd && (
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Project
            </button>
          )}
        </div>
      )}

      {/* ── Info box ──────────────────────────────────────────── */}
      {projects.length > 0 && (
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4">
          <p className="text-xs text-[#1e40af] font-semibold mb-1">
            ℹ️ How Project Verification Works
          </p>
          <ul className="text-xs text-[#1e40af] space-y-1 list-disc list-inside">
            <li>
              Submit your projects — our admin team reviews each one
            </li>
            <li>
              Verified projects appear on your public profile
            </li>
            <li>
              Verified project count determines your badge tier
              (Startup → Diamond)
            </li>
            <li>
              Delayed/on-hold projects require honest explanation
              (transparency builds buyer trust)
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}