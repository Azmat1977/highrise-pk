// components/property/forms/tabs/TabMedia.tsx

import { useState, useRef, ChangeEvent } from 'react';
import {
  Upload, Image, Video, FileText, Phone, Mail,
  CheckSquare, X, Star, Globe, MapPin, Loader2, Eye,
} from 'lucide-react';
import FormSection from '../shared/FormSection';
import {
  PropertyFormState,
  TabErrors,
  UsePropertyFormReturn,
  UploadedImage,
} from '../shared/usePropertyForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabMediaProps {
  form: PropertyFormState;
  errors: TabErrors;
  setField: UsePropertyFormReturn['setField'];
}

type ImageCategory = UploadedImage['category'];

// ═══════════════════════════════════════════════════════════════
// V4.9.8 — UPLOAD LIMITS (single source of truth)
// ═══════════════════════════════════════════════════════════════

interface UploadLimit {
  maxFiles:    number;
  maxSizeMB:   number;
  accepted:    string[];          // Display labels: ['JPG', 'PNG', 'PDF']
  acceptAttr:  string;            // MIME types for <input accept>
  recommended: number;            // "Upload at least N for best results"
}

const UPLOAD_LIMITS: Record<'images' | 'floorPlans' | 'ownershipProof', UploadLimit> = {
  images: {
    maxFiles:    30,
    maxSizeMB:   8,
    accepted:    ['JPG', 'PNG', 'WebP'],
    acceptAttr:  'image/jpeg,image/png,image/webp',
    recommended: 10,
  },
  floorPlans: {
    maxFiles:    5,
    maxSizeMB:   10,
    accepted:    ['JPG', 'PNG', 'WebP', 'PDF'],
    acceptAttr:  'image/jpeg,image/png,image/webp,application/pdf',
    recommended: 1,
  },
  ownershipProof: {
    maxFiles:    1,
    maxSizeMB:   10,
    accepted:    ['PDF', 'JPG', 'PNG'],
    acceptAttr:  'image/jpeg,image/png,application/pdf',
    recommended: 1,
  },
};

// Recommended shot list for Pakistani real estate
const RECOMMENDED_SHOTS = [
  { icon: '🏠', label: 'Front exterior (street view)' },
  { icon: '🛋️', label: 'Living / Drawing room' },
  { icon: '🍳', label: 'Kitchen' },
  { icon: '🛏️', label: 'Each bedroom' },
  { icon: '🚿', label: 'Each bathroom' },
  { icon: '🌳', label: 'Lawn / Garden / Terrace' },
  { icon: '🅿️', label: 'Parking area' },
  { icon: '🏢', label: 'Building entrance / lobby' },
  { icon: '🌆', label: 'View from balcony / window' },
  { icon: '🚪', label: 'Main door / entrance' },
];

// Privacy warnings — what NOT to show in photos
const PRIVACY_WARNINGS = [
  'People (especially family members)',
  'Personal valuables (jewellery, cash)',
  'Visible house numbers or full addresses',
  'Personal documents or photos on walls',
  'Vehicle license plates',
];

// ═══════════════════════════════════════════════════════════════

const IMAGE_CATEGORIES: { value: ImageCategory; label: string }[] = [
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'other', label: 'Other' },
];

// ─── Error Label ──────────────────────────────────────────────────────────────

function FieldError({ error }: { error?: string }): React.ReactElement | null {
  if (!error) return null;
  return (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
      <span>⚠</span>
      <span>{error}</span>
    </p>
  );
}

// ─── V4.9.8: Upload Hints Component ───────────────────────────────────────────

interface UploadHintsProps {
  limit:        UploadLimit;
  currentCount: number;
  tipLine?:     string;
  trustTip?:    string;
}

function UploadHints({
  limit,
  currentCount,
  tipLine,
  trustTip,
}: UploadHintsProps): React.ReactElement {
  const isFull       = currentCount >= limit.maxFiles;
  const remaining    = limit.maxFiles - currentCount;
  const meetsTarget  = currentCount >= limit.recommended;
  const progressPct  = Math.min(100, (currentCount / limit.maxFiles) * 100);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
      {/* Top row: File type + size + count */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">📋</span>
          <span className="text-gray-600">
            <strong className="text-gray-700">Formats:</strong>{' '}
            {limit.accepted.join(', ')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">📊</span>
          <span className="text-gray-600">
            <strong className="text-gray-700">Max size:</strong>{' '}
            {limit.maxSizeMB} MB per file
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">🔢</span>
          <span className={`${isFull ? 'text-[#ef4444] font-semibold' : 'text-gray-600'}`}>
            <strong className="text-gray-700">Used:</strong>{' '}
            {currentCount} / {limit.maxFiles}
            {isFull && ' (limit reached)'}
          </span>
        </div>
      </div>

      {/* Progress bar (only if files uploaded) */}
      {currentCount > 0 && limit.maxFiles > 1 && (
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isFull         ? 'bg-[#ef4444]'
              : meetsTarget  ? 'bg-[#10b981]'
              :                'bg-[#029bba]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Tip line (optional, photo-specific) */}
      {tipLine && (
        <p className="text-xs text-gray-500 border-t border-gray-200 pt-2">
          💡 <strong>Tip:</strong> {tipLine}
        </p>
      )}

      {/* Trust stat (e.g., "Listings with 10+ photos get 4× more inquiries") */}
      {trustTip && !meetsTarget && (
        <p className="text-xs text-[#029bba] bg-[#eff6ff] border-l-2 border-[#029bba]
          pl-2 py-1 rounded-r">
          🎯 {trustTip}
        </p>
      )}

      {/* Recommended target reached */}
      {meetsTarget && trustTip && (
        <p className="text-xs text-[#10b981] font-medium">
          ✓ Recommended count reached ({limit.recommended}+)
        </p>
      )}

      {/* Full warning */}
      {isFull && (
        <p className="text-xs text-[#ef4444] font-medium border-t border-red-200 pt-2">
          ⚠ Maximum files reached. Remove an existing file to upload more.
        </p>
      )}

      {/* Remaining count */}
      {!isFull && currentCount > 0 && (
        <p className="text-xs text-gray-400">
          You can upload {remaining} more file{remaining !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

// ─── V4.9.8: Recommended Shots Collapsible ────────────────────────────────────

function RecommendedShots(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-[#029bba] border-opacity-30 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-[#eff6ff] hover:bg-blue-100
          flex items-center justify-between transition-colors duration-150"
      >
        <span className="text-sm font-semibold text-[#004063] flex items-center gap-2">
          📸 Recommended Photo Shot List
          <span className="text-xs font-normal text-gray-500">
            (Click to expand)
          </span>
        </span>
        <span className={`text-[#029bba] transition-transform duration-200
          ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="px-4 py-3 bg-white space-y-3">
          <p className="text-xs text-gray-600">
            For best results and faster verification, upload photos of:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5">
            {RECOMMENDED_SHOTS.map((shot, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                <span>{shot.icon}</span>
                <span>{shot.label}</span>
              </div>
            ))}
          </div>

          {/* Privacy warning section */}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs font-semibold text-[#ef4444] mb-1.5
              flex items-center gap-1">
              🔒 For your privacy, AVOID showing:
            </p>
            <ul className="text-xs text-gray-600 space-y-0.5 pl-4">
              {PRIVACY_WARNINGS.map((warning, idx) => (
                <li key={idx} className="list-disc">{warning}</li>
              ))}
            </ul>
          </div>

          {/* Quality guidance */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-700 mb-1.5
              flex items-center gap-1">
              📐 Image quality guidance:
            </p>
            <ul className="text-xs text-gray-600 space-y-0.5 pl-4">
              <li className="list-disc">
                Minimum resolution: 1280 × 720 px
              </li>
              <li className="list-disc">
                Recommended: 1920 × 1080 px or larger
              </li>
              <li className="list-disc">
                Take photos in daylight for best lighting
              </li>
              <li className="list-disc">
                Avoid heavy filters or photo editing
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Image Uploader Component ─────────────────────────────────────────────────

interface ImageUploaderProps {
  label:           string;
  accept:          string;
  multiple?:       boolean;
  onFilesSelected: (files: FileList) => void;
  isUploading:     boolean;
  disabled?:       boolean;             // V4.9.8 — disable when max reached
  disabledMsg?:    string;              // V4.9.8 — message when disabled
}

function ImageUploader({
  label,
  accept,
  multiple = false,
  onFilesSelected,
  isUploading,
  disabled = false,
  disabledMsg,
}: ImageUploaderProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const isInteractive = !isUploading && !disabled;

  return (
    <div
      onClick={() => isInteractive && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-2
        border-2 border-dashed rounded-xl p-6 text-center
        transition-colors duration-150
        ${disabled
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          : isUploading
          ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 cursor-wait'
          : 'border-gray-300 hover:border-[#029bba] hover:bg-gray-50 cursor-pointer'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
            e.target.value = '';
          }
        }}
        disabled={isUploading || disabled}
      />
      {isUploading ? (
        <>
          <Loader2 className="w-6 h-6 text-[#029bba] animate-spin" />
          <p className="text-sm text-[#029bba] font-medium">Uploading...</p>
        </>
      ) : disabled ? (
        <>
          <span className="text-2xl">🚫</span>
          <p className="text-sm font-medium text-gray-500">
            {disabledMsg ?? 'Upload limit reached'}
          </p>
          <p className="text-xs text-gray-400">
            Remove existing files to upload more
          </p>
        </>
      ) : (
        <>
          <Upload className="w-6 h-6 text-gray-400" />
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-xs text-gray-400">Click or drag files here</p>
        </>
      )}
    </div>
  );
}

// ─── Image Card Component ─────────────────────────────────────────────────────

interface ImageCardProps {
  img: UploadedImage;
  index: number;
  isPrimary: boolean;
  onSetPrimary: (index: number) => void;
  onSetCategory: (index: number, cat: ImageCategory) => void;
  onRemove: (index: number) => void;
}

function ImageCard({
  img,
  index,
  isPrimary,
  onSetPrimary,
  onSetCategory,
  onRemove,
}: ImageCardProps): React.ReactElement {
  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-150">
      {/* Image Preview */}
      <div className="aspect-video w-full bg-gray-100 flex items-center justify-center overflow-hidden">
        <img
          src={img.url}
          alt={img.caption || `Property image ${index + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Primary Badge */}
      <button
        type="button"
        onClick={() => onSetPrimary(index)}
        className={`
          absolute top-2 left-2 p-1.5 rounded-full shadow-md
          transition-all duration-150
          ${isPrimary
            ? 'bg-[#f59e0b] text-white'
            : 'bg-white bg-opacity-80 text-gray-400 hover:bg-opacity-100 hover:text-[#f59e0b]'
          }
        `}
        title={isPrimary ? 'Primary Image' : 'Set as Primary'}
      >
        <Star className={`w-4 h-4 ${isPrimary ? 'fill-current' : ''}`} />
      </button>

      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="
          absolute top-2 right-2 p-1.5 rounded-full bg-white bg-opacity-80
          text-gray-500 hover:bg-red-500 hover:text-white
          opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-sm
        "
        title="Remove image"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Category Selector */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <select
          value={img.category || 'other'}
          onChange={(e) => onSetCategory(index, e.target.value as ImageCategory)}
          className="
            w-full text-xs bg-white bg-opacity-90 text-gray-700 rounded px-1.5 py-1
            border-0 focus:ring-1 focus:ring-[#029bba] cursor-pointer
          "
        >
          {IMAGE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Contact Toggle Component ─────────────────────────────────────────────────

interface ContactToggleProps {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  icon: React.ReactNode;
}

function ContactToggle({
  label,
  checked,
  onChange,
  icon,
}: ContactToggleProps): React.ReactElement {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer group">
      <div className="flex-shrink-0 text-gray-400 group-hover:text-[#029bba] transition-colors duration-150">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-700 group-hover:text-[#029bba] transition-colors duration-150">
          {label}
        </span>
      </div>
      <div className="flex-shrink-0">
        <div
          role="switch"
          aria-checked={checked}
          tabIndex={0}
          onClick={() => onChange(!checked)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onChange(!checked);
            }
          }}
          className={`
            relative inline-flex h-5 w-9 items-center rounded-full
            transition-colors duration-200 cursor-pointer
            ${checked ? 'bg-[#029bba]' : 'bg-gray-300'}
          `}
        >
          <span
            className={`
              inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm
              transition-transform duration-200
              ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'}
            `}
          />
        </div>
      </div>
    </label>
  );
}

// ─── Upload Response Type ─────────────────────────────────────────────────────

interface UploadResponseData {
  url: string;
  publicId: string;
  format?: string;
  size?: number;
  resourceType: 'image' | 'video' | 'raw';
  mimeType: string;
  assetToken: string;
}

interface UploadResponse {
  success?: boolean;
  message?: string;
  error?: string;
  data?: UploadResponseData;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TabMedia({
  form,
  errors,
  setField,
}: TabMediaProps): React.ReactElement {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // ── Upload Handler
  const handleUpload = async (
    files: FileList,
    target: 'images' | 'floorPlans' | 'ownershipProof'
  ): Promise<void> => {
    if (isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      // V4.9.8 — Get target-specific limits
      const limit = UPLOAD_LIMITS[target];
      const currentCount =
        target === 'images'        ? form.images.length
      : target === 'floorPlans'    ? form.floorPlanImages.length
      :                              (form.ownershipProofUrl ? 1 : 0);

      // Check max files
      if (currentCount + files.length > limit.maxFiles) {
        const remaining = limit.maxFiles - currentCount;
        setUploadError(
          remaining > 0
            ? `You can only upload ${remaining} more file(s). Maximum: ${limit.maxFiles}.`
            : `Maximum ${limit.maxFiles} file(s) reached. Remove existing files to upload more.`
        );
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file size per target limit
        if (file.size > limit.maxSizeMB * 1024 * 1024) {
          setUploadError(
            `File "${file.name}" exceeds ${limit.maxSizeMB}MB limit.`
          );
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const folder =
          target === 'ownershipProof' ? 'documents'
          : target === 'floorPlans' ? 'property-floorplans'
          : 'properties';

        const res = await fetch(`/api/upload?folder=${folder}`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(
            errData.message ?? `Upload failed (${res.status})`
          );
        }

        const response = (await res.json()) as UploadResponse;
        const data = response.data;
        if (!response.success || !data?.url || !data.publicId || !data.assetToken) {
          throw new Error(response.message ?? response.error ?? 'Upload response was incomplete.');
        }

        if (target === 'images') {
          const isFirst = form.images.length === 0 && i === 0;
          const newImage: UploadedImage = {
            url: data.url,
            publicId: data.publicId,
            isPrimary: isFirst,
            category: 'exterior',
            assetToken: data.assetToken,
            resourceType: data.resourceType,
            mimeType: data.mimeType,
          };
          setField('images', [...form.images, newImage]);
        } else if (target === 'floorPlans') {
          const newImage: UploadedImage = {
            url: data.url,
            publicId: data.publicId,
            assetToken: data.assetToken,
            resourceType: data.resourceType,
            mimeType: data.mimeType,
          };
          setField('floorPlanImages', [...form.floorPlanImages, newImage]);
        } else {
          setField('ownershipProofUrl', data.url);
          setField('ownershipProofPublicId', data.publicId);
          setField('ownershipProofAssetToken', data.assetToken);
          setField('ownershipProofResourceType', data.resourceType === 'raw' ? 'raw' : 'image');
          setField('ownershipProofMimeType', data.mimeType);
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Image Actions
  const setPrimaryImage = (index: number): void => {
    const updated = form.images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    setField('images', updated);
  };

  const setCategory = (index: number, cat: ImageCategory): void => {
    const updated = [...form.images];
    updated[index] = { ...updated[index], category: cat };
    setField('images', updated);
  };

  const removeImage = (index: number): void => {
    const updated = form.images.filter((_, i) => i !== index);
    // If removed image was primary, set first remaining as primary
    if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
      updated[0] = { ...updated[0], isPrimary: true };
    }
    setField('images', updated);
  };

  const removeFloorPlan = (index: number): void => {
    const updated = form.floorPlanImages.filter((_, i) => i !== index);
    setField('floorPlanImages', updated);
  };

  const removeOwnershipProof = (): void => {
    setField('ownershipProofUrl', '');
    setField('ownershipProofPublicId', '');
    setField('ownershipProofAssetToken', '');
    setField('ownershipProofResourceType', '');
    setField('ownershipProofMimeType', '');
  };

  // ── Contact setter
  const setContact = <K extends keyof PropertyFormState['contactDetails']>(
    key: K,
    value: PropertyFormState['contactDetails'][K]
  ): void => {
    setField('contactDetails', { ...form.contactDetails, [key]: value });
  };

  // ── Preferred Contact Options
  const preferredOptions: {
    value: PropertyFormState['contactDetails']['preferredContact'];
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: 'phone', label: 'Phone Call', icon: <Phone className="w-4 h-4" /> },
    { value: 'whatsapp', label: 'WhatsApp', icon: <Globe className="w-4 h-4" /> },
    { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">

      {/* ── Upload Error Banner ── */}
      {uploadError && (
        <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] px-4 py-3 rounded-r-lg flex items-start gap-2">
          <span className="text-[#ef4444] mt-0.5 flex-shrink-0">⚠</span>
          <div className="flex-1">
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setUploadError('')}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: Property Images
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="media-images"
        title="Property Photos"
        icon={<Image className="w-5 h-5" />}
        defaultOpen={true}
        required
        description={`${form.images.length} uploaded`}
        completionStatus={form.images.length > 0 ? 'complete' : 'incomplete'}
      >
        <div className="space-y-4">
          {/* V4.9.8 — Recommended shot list (collapsible) */}
          <RecommendedShots />

          {/* Upload Area */}
          <ImageUploader
            label="Upload Property Photos"
            accept={UPLOAD_LIMITS.images.acceptAttr}
            multiple
            onFilesSelected={(files) => handleUpload(files, 'images')}
            isUploading={isUploading}
            disabled={form.images.length >= UPLOAD_LIMITS.images.maxFiles}
            disabledMsg={`Maximum ${UPLOAD_LIMITS.images.maxFiles} photos reached`}
          />

          {/* Upload progress bar */}
          {isUploading && uploadProgress > 0 && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#029bba] rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <FieldError error={errors.images} />

          {/* V4.9.8 — Upload hints */}
          <UploadHints
            limit={UPLOAD_LIMITS.images}
            currentCount={form.images.length}
            tipLine="⭐ First uploaded image is set as cover automatically. Click star icon to change cover."
            trustTip={`Listings with ${UPLOAD_LIMITS.images.recommended}+ photos receive 4× more inquiries.`}
          />

          {/* Image Grid */}
          {form.images.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {form.images.length} Photo{form.images.length !== 1 ? 's' : ''}
                </p>
                {form.images.length > 1 && (
                  <p className="text-xs text-gray-400">
                    ⭐ Click star to set cover photo
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {form.images.map((img, idx) => (
                  <ImageCard
                    key={img.publicId || `img-${idx}`}
                    img={img}
                    index={idx}
                    isPrimary={img.isPrimary === true}
                    onSetPrimary={setPrimaryImage}
                    onSetCategory={setCategory}
                    onRemove={removeImage}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: Floor Plans
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="media-floorplans"
        title="Floor Plans"
        icon={<MapPin className="w-5 h-5" />}
        defaultOpen={false}
        description={
          form.floorPlanImages.length > 0
            ? `${form.floorPlanImages.length} uploaded`
            : 'Layout diagrams'
        }
        completionStatus={
          form.floorPlanImages.length > 0 ? 'complete' : 'optional'
        }
      >
        <div className="space-y-4">
          <ImageUploader
            label="Upload Floor Plans"
            accept={UPLOAD_LIMITS.floorPlans.acceptAttr}
            multiple
            onFilesSelected={(files) => handleUpload(files, 'floorPlans')}
            isUploading={isUploading}
            disabled={form.floorPlanImages.length >= UPLOAD_LIMITS.floorPlans.maxFiles}
            disabledMsg={`Maximum ${UPLOAD_LIMITS.floorPlans.maxFiles} floor plans reached`}
          />

          {/* V4.9.8 — Upload hints */}
          <UploadHints
            limit={UPLOAD_LIMITS.floorPlans}
            currentCount={form.floorPlanImages.length}
            tipLine="Upload one plan per floor (Ground / 1st / 2nd / Basement). PDF supported for architect drawings."
            trustTip="Listings with floor plans receive 3× more inquiries."
          />

          {form.floorPlanImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {form.floorPlanImages.map((img, idx) => (
                <div
                  key={img.publicId || `fp-${idx}`}
                  className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm"
                >
                  <div className="aspect-video w-full bg-gray-100 flex items-center justify-center">
                    {img.resourceType === 'raw' || img.mimeType === 'application/pdf' ? (
                      <a
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-[#004063] hover:bg-gray-50"
                      >
                        <FileText className="h-8 w-8 text-[#029bba]" />
                        <span className="font-medium">Open floor-plan PDF</span>
                      </a>
                    ) : (
                      <img
                        src={img.url}
                        alt={`Floor plan ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFloorPlan(idx)}
                    className="
                      absolute top-2 right-2 p-1.5 rounded-full
                      bg-white bg-opacity-80 text-gray-500
                      hover:bg-red-500 hover:text-white
                      opacity-0 group-hover:opacity-100
                      transition-all duration-150 shadow-sm
                    "
                    title="Remove floor plan"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3: Video & Virtual Tour
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="media-video"
        title="Video & Virtual Tour"
        icon={<Video className="w-5 h-5" />}
        defaultOpen={false}
        description="YouTube, Vimeo, or Matterport links"
        completionStatus={
          form.videoUrl || form.virtualTourUrl ? 'complete' : 'optional'
        }
      >
        <div className="space-y-4">
          {/* V4.9.8 — Video guidance banner */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-600">
              <strong className="text-gray-700">📺 How videos work:</strong>{' '}
              Videos are hosted on YouTube/Vimeo (not uploaded to Highrise).
              Paste the shareable link below.
            </p>
            <p className="text-xs text-[#029bba] mt-2">
              🎯 Listings with video walkthrough get <strong>5× more inquiries</strong>.
            </p>
          </div>

          <div>
            <label
              htmlFor="video-url"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Video URL
            </label>
            <div className="relative">
              <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="video-url"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={form.videoUrl}
                onChange={(e) => setField('videoUrl', e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              YouTube, Vimeo, or direct video link
            </p>
          </div>

          <div>
            <label
              htmlFor="virtual-tour-url"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Virtual Tour URL
            </label>
            <div className="relative">
              <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="virtual-tour-url"
                type="url"
                placeholder="https://matterport.com/..."
                value={form.virtualTourUrl}
                onChange={(e) => setField('virtualTourUrl', e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Matterport, Kuula, or 3D tour link
            </p>
          </div>
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4: Ownership Proof
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="media-ownership"
        title="Ownership Proof"
        icon={<FileText className="w-5 h-5" />}
        defaultOpen={false}
        description="Registry, allotment letter, or NOC"
        badge="Trust Builder"
        badgeColor="green"
        completionStatus={form.ownershipProofUrl ? 'complete' : 'optional'}
      >
        <div className="space-y-3">
          <div className="bg-[#f0fdf4] border-l-4 border-[#10b981] px-4 py-3 rounded-r-lg">
            <p className="text-sm text-[#10b981] font-medium">
              🛡️ Verified Owner Badge
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Uploading ownership proof (kept private) earns you a
              &quot;Verified Owner&quot; badge and boosts listing visibility.
            </p>
          </div>

          {!form.ownershipProofUrl ? (
            <>
              <ImageUploader
                label="Upload Ownership Document"
                accept={UPLOAD_LIMITS.ownershipProof.acceptAttr}
                onFilesSelected={(files) =>
                  handleUpload(files, 'ownershipProof')
                }
                isUploading={isUploading}
              />

              {/* V4.9.8 — Upload hints */}
              <UploadHints
                limit={UPLOAD_LIMITS.ownershipProof}
                currentCount={0}
                tipLine="Accepted documents: Registry, Allotment Letter, Possession Letter, NOC, or Authority Letter from society."
                trustTip="🔒 This document is kept PRIVATE — only verified by Highrise admin team. It earns you a Verified Owner badge."
              />
            </>
          ) : (
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-[#029bba] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    Document Uploaded
                  </p>
                  <p className="text-xs text-gray-400 truncate max-w-[200px]">
                    {form.ownershipProofUrl}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeOwnershipProof}
                className="
                  text-xs text-red-500 hover:text-red-700 font-medium
                  px-3 py-1.5 rounded-lg hover:bg-red-50
                  transition-colors duration-150 flex-shrink-0
                "
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5: Contact Details
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="media-contact"
        title="Contact Details"
        icon={<Phone className="w-5 h-5" />}
        defaultOpen={true}
        required
        completionStatus={
          form.contactDetails.name.trim() && form.contactDetails.phone.trim()
            ? 'complete'
            : 'incomplete'
        }
      >
        <div className="space-y-4">
          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                placeholder="e.g. Ahmed Khan"
                value={form.contactDetails.name}
                onChange={(e) => setContact('name', e.target.value)}
                className={`
                  w-full border rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#029bba] focus:border-transparent
                  ${errors['contactDetails.name'] ? 'border-red-500' : 'border-gray-300'}
                `}
              />
              <FieldError error={errors['contactDetails.name']} />
            </div>
            <div>
              <label
                htmlFor="contact-phone"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  +92
                </span>
                <input
                  id="contact-phone"
                  type="tel"
                  placeholder="300-1234567"
                  value={form.contactDetails.phone}
                  onChange={(e) =>
                    setContact(
                      'phone',
                      e.target.value.replace(/\D/g, '').slice(0, 10)
                    )
                  }
                  className={`
                    w-full border rounded-lg pl-10 pr-4 py-2.5
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent
                    ${errors['contactDetails.phone'] ? 'border-red-500' : 'border-gray-300'}
                  `}
                />
              </div>
              <FieldError error={errors['contactDetails.phone']} />
            </div>
          </div>

          {/* WhatsApp & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contact-whatsapp"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                WhatsApp Number
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="contact-whatsapp"
                  type="tel"
                  placeholder="Same as phone or different"
                  value={form.contactDetails.whatsapp}
                  onChange={(e) => setContact('whatsapp', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="contact-email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.contactDetails.email}
                  onChange={(e) => setContact('email', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Preferred Contact Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Contact Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {preferredOptions.map((opt) => {
                const isActive =
                  form.contactDetails.preferredContact === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setContact('preferredContact', opt.value)}
                    className={`
                      flex items-center justify-center gap-2 px-3 py-2.5
                      rounded-lg border-2 text-sm font-medium
                      transition-all duration-150
                      ${isActive
                        ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 text-[#029bba]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }
                    `}
                  >
                    {opt.icon}
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="border-t border-gray-100 pt-3 space-y-1">
            <ContactToggle
              label="Show Phone Number Publicly"
              checked={form.contactDetails.showPhone}
              onChange={(val) => setContact('showPhone', val)}
              icon={<Phone className="w-4 h-4" />}
            />
            <ContactToggle
              label="Show Email Address Publicly"
              checked={form.contactDetails.showEmail}
              onChange={(val) => setContact('showEmail', val)}
              icon={<Mail className="w-4 h-4" />}
            />
          </div>
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6: Terms & Accuracy
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="media-terms"
        title="Terms & Accuracy"
        icon={<CheckSquare className="w-5 h-5" />}
        defaultOpen={true}
        required
        completionStatus={
          form.termsAccepted && form.accuracyConfirmed
            ? 'complete'
            : 'incomplete'
        }
      >
        <div className="space-y-4">
          {/* Terms Checkbox */}
          <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:border-[#029bba] transition-colors duration-150">
            <input
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(e) => setField('termsAccepted', e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba] cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-800">
                I agree to Highrise.pk Terms of Service &amp; Privacy Policy
              </span>
              <p className="text-xs text-gray-500 mt-1">
                By submitting, you confirm this listing complies with our
                anti-fraud guidelines and community standards.
              </p>
            </div>
          </label>
          <FieldError error={errors.termsAccepted} />

          {/* Accuracy Checkbox */}
          <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:border-[#029bba] transition-colors duration-150">
            <input
              type="checkbox"
              checked={form.accuracyConfirmed}
              onChange={(e) =>
                setField('accuracyConfirmed', e.target.checked)
              }
              className="mt-1 w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba] cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-800">
                I confirm all information provided is accurate and truthful
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Misleading information or fake listings will result in immediate
                account suspension.
              </p>
            </div>
          </label>
          <FieldError error={errors.accuracyConfirmed} />

          {/* Warning banner */}
          {(!form.termsAccepted || !form.accuracyConfirmed) && (
            <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] px-4 py-3 rounded-r-lg flex items-start gap-2">
              <span className="text-[#ef4444] mt-0.5 flex-shrink-0">⚠</span>
              <p className="text-sm text-red-700">
                You must accept both terms and confirm accuracy to submit this
                listing.
              </p>
            </div>
          )}

          {/* Both accepted — success */}
          {form.termsAccepted && form.accuracyConfirmed && (
            <div className="bg-[#f0fdf4] border-l-4 border-[#10b981] px-4 py-3 rounded-r-lg flex items-center gap-2">
              <span className="text-[#10b981] flex-shrink-0">✓</span>
              <p className="text-sm text-[#10b981] font-medium">
                Ready to submit — all terms accepted
              </p>
            </div>
          )}
        </div>
      </FormSection>

    </div>
  );
}