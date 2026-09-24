// components/admin/ProjectContentSections.tsx
//
// Highrise.pk — Developer form content editors (Phase 2 display-sync).
// Self-contained list editors matching detail-page display shapes:
//   → DevelopmentUpdatesEditor  (Construction Tracker evidence fields)
//   → AmenitiesEditor           (Amenities section)
//   → NearbyFacilitiesEditor    (Nearby Places)
//   → LocationAdvantagesEditor  (Location Advantages)
//
// Pattern: BuildingFloorPlansSection/UnitPlansSection — value + onChange
// (setState), editors manage add/remove/change internally.

'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Plus, X, Video, Calendar, CalendarCheck } from 'lucide-react';

// ─── Types (form-string shapes) ─────────────────────────────────────────────

export interface DevelopmentUpdateInput {
  date:            string;
  progressPercent: string;
  title:           string;
  description:     string;
  videoUrl:        string;
  imageUrl:        string;   // legacy single-URL (kept for compat)
  images:          string[]; // display-matched (model images[])
  isDroneUpdate:   boolean;
  engineerNote:    string;
  qualityChecks:   string;   // comma-separated → string[] on submit
}

export interface AmenityInput {
  name: string;
  category: string;
  description: string;
}

export interface NearbyFacilityInput {
  name: string;
  category: string;
  distance: string;
}

export interface LocationAdvantageInput {
  title: string;
  points: string; // one point per line
}

interface EditorProps<T> {
  value: T[];
  onChange: React.Dispatch<React.SetStateAction<T[]>>;
  disabled?: boolean;
}

// ─── Style constants (match developer forms) ────────────────────────────────

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 ' +
  'text-sm text-[#333333] shadow-sm outline-none transition ' +
  'focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 ' +
  'placeholder:text-gray-400';

const selectClass = inputClass;
const labelClass  = 'block text-sm font-medium text-[#333333] mb-1.5';

const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-xl ' +
  'border-2 border-[#029bba] text-[#029bba] ' +
  'px-5 py-2.5 text-sm font-semibold ' +
  'hover:bg-[#029bba]/5 transition-all duration-200';

const AMENITY_CATEGORIES = [
  'general', 'security', 'lifestyle', 'convenience',
  'recreation', 'business', 'spiritual',
] as const;

const NEARBY_CATEGORIES = [
  'hospital', 'school', 'restaurant', 'park', 'mall',
  'mosque', 'bank', 'transport', 'other',
] as const;

// ─── Section wrapper (local — matches form style) ───────────────────────────

function Section({
  title, subtitle, children,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#f8f9fa] to-white px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-[#004063]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[#666666]">{subtitle}</p>}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

// ─── DevelopmentUpdatesEditor ───────────────────────────────────────────────

export function DevelopmentUpdatesEditor({
  value, onChange, disabled, launchDate, possessionDate,
}: EditorProps<DevelopmentUpdateInput> & {
  launchDate?: string;
  possessionDate?: string;
}): React.ReactElement {
  const add = useCallback((): void => {
    onChange((prev) => [
      ...prev,
      {
        date: '', progressPercent: '', title: '', description: '',
        videoUrl: '', imageUrl: '', images: [],
        isDroneUpdate: false, engineerNote: '', qualityChecks: '',
      },
    ]);
  }, [onChange]);

  const remove = useCallback((index: number): void => {
    onChange((prev) => prev.filter((_, i) => i !== index));
  }, [onChange]);

  const change = useCallback((
    index: number, field: keyof DevelopmentUpdateInput, v: string | boolean
  ): void => {
    onChange((prev) => prev.map((u, i) => (i === index ? { ...u, [field]: v } : u)));
  }, [onChange]);

  const addImage = useCallback((index: number): void => {
    onChange((prev) => prev.map((u, i) =>
      i === index ? { ...u, images: [...u.images, ''] } : u
    ));
  }, [onChange]);

  const changeImage = useCallback((index: number, imgIdx: number, url: string): void => {
    onChange((prev) => prev.map((u, i) =>
      i === index
        ? { ...u, images: u.images.map((im, j) => (j === imgIdx ? url : im)) }
        : u
    ));
  }, [onChange]);

  const removeImage = useCallback((index: number, imgIdx: number): void => {
    onChange((prev) => prev.map((u, i) =>
      i === index ? { ...u, images: u.images.filter((_, j) => j !== imgIdx) } : u
    ));
  }, [onChange]);

  return (
    <Section
      title="Construction Progress & Site Updates"
      subtitle="Dated updates with photos, videos, and engineering evidence — buyers track real progress from launch to possession."
    >
      <div className="space-y-4">
        {/* Timeline header — launch → possession (form context) */}
        {launchDate && possessionDate && (
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#029bba]/10 to-transparent p-4 mb-2">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                Project Timeline
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-bold text-gray-900">
                  <Calendar className="w-3.5 h-3.5 inline mr-1 text-[#029bba]" />
                  {new Date(launchDate).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}
                </span>
                <span className="text-gray-300">──→</span>
                <span className="font-bold text-[#029bba]">
                  <CalendarCheck className="w-3.5 h-3.5 inline mr-1" />
                  {new Date(possessionDate).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {Math.round(
                (new Date(possessionDate).getTime() - new Date(launchDate).getTime()) /
                  (1000 * 60 * 60 * 24 * 30)
              )} months
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-[#666666]">
            Add dated updates with photos and site video — buyers track real construction progress.
          </p>
          <button type="button" onClick={add} disabled={disabled}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#029bba] text-white hover:bg-[#027a94] transition-colors shadow-sm disabled:opacity-50">
            <Plus className="w-4 h-4" />
            Add Update
          </button>
        </div>

        {value.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-[#f8f9fa] px-4 py-6 text-center text-sm text-[#666666]">
            No updates yet. Add the first milestone — e.g. &quot;Grey structure work started&quot;.
          </div>
        )}

        <div className="space-y-4">
          {value.map((update, index) => (
            <div key={index} className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <button type="button" onClick={() => remove(index)} disabled={disabled}
                className="absolute top-3 right-3 p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>

              <div className="mb-3 flex items-center justify-between gap-3 pr-10">
                <p className="text-sm font-semibold text-[#004063]">Update #{index + 1}</p>
                {update.progressPercent && (
                  <span className="inline-flex items-center rounded-full bg-[#f0fdf4] px-3 py-1 text-xs font-semibold text-[#10b981]">
                    {update.progressPercent}% complete
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" className={inputClass} value={update.date}
                    onChange={(e) => change(index, 'date', e.target.value)} disabled={disabled} />
                </div>
                <div>
                  <label className={labelClass}>Progress (%)</label>
                  <input type="number" min={0} max={100} className={inputClass} placeholder="e.g. 40"
                    value={update.progressPercent}
                    onChange={(e) => change(index, 'progressPercent', e.target.value)} disabled={disabled} />
                </div>
                <div>
                  <label className={labelClass}>Short Title</label>
                  <input type="text" className={inputClass} placeholder="e.g. Block A grey structure completed"
                    value={update.title}
                    onChange={(e) => change(index, 'title', e.target.value)} disabled={disabled} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea className={`${inputClass} min-h-[90px] resize-y`}
                    placeholder="e.g. Raft + columns complete, brickwork in progress."
                    value={update.description}
                    onChange={(e) => change(index, 'description', e.target.value)} disabled={disabled} />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Site Activity Video URL (YouTube / Vimeo)</label>
                    <input type="url" className={inputClass} placeholder="YouTube / Vimeo link"
                      value={update.videoUrl}
                      onChange={(e) => change(index, 'videoUrl', e.target.value)} disabled={disabled} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={update.isDroneUpdate}
                      onChange={(e) => change(index, 'isDroneUpdate', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]" disabled={disabled} />
                    <span className="text-sm text-[#333333]">Drone footage update</span>
                  </label>
                </div>
              </div>

              {/* Photos — display-matched images[] */}
              <div className="rounded-lg bg-[#f8f9fa] border border-gray-100 p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[#333333]">Site Photos (URLs)</label>
                  <button type="button" onClick={() => addImage(index)} disabled={disabled}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#029bba] text-[#029bba] hover:bg-[#029bba]/5 disabled:opacity-50">
                    <Plus className="w-3 h-3" />
                    Add Photo URL
                  </button>
                </div>
                {update.images.length === 0 && (
                  <p className="text-xs text-[#666666]">No photos yet — add image URLs (Cloudinary/gallery links).</p>
                )}
                <div className="space-y-2">
                  {update.images.map((img, imgIdx) => (
                    <div key={imgIdx} className="flex items-center gap-2">
                      <input type="url" className={inputClass} placeholder="https://... photo URL"
                        value={img}
                        onChange={(e) => changeImage(index, imgIdx, e.target.value)} disabled={disabled} />
                      <button type="button" onClick={() => removeImage(index, imgIdx)} disabled={disabled}
                        className="p-2 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Engineer&apos;s Note (Optional)</label>
                  <textarea className={`${inputClass} min-h-[70px] resize-y`}
                    placeholder="e.g. Concrete strength tests passed per structural engineer report."
                    value={update.engineerNote}
                    onChange={(e) => change(index, 'engineerNote', e.target.value)} disabled={disabled} />
                </div>
                <div>
                  <label className={labelClass}>Quality Checks (comma-separated)</label>
                  <input type="text" className={inputClass} placeholder="e.g. Concrete test, Steel inspection"
                    value={update.qualityChecks}
                    onChange={(e) => change(index, 'qualityChecks', e.target.value)} disabled={disabled} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── AmenitiesEditor ────────────────────────────────────────────────────────

export function AmenitiesEditor({
  value, onChange, disabled,
}: EditorProps<AmenityInput>): React.ReactElement {
  const add = useCallback((): void => {
    onChange((prev) => [...prev, { name: '', category: 'general', description: '' }]);
  }, [onChange]);

  const change = useCallback((index: number, field: keyof AmenityInput, v: string): void => {
    onChange((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: v } : a)));
  }, [onChange]);

  return (
    <Section
      title="Amenities & Features"
      subtitle="Amenities appear in the Features section of the project page."
    >
      <div className="space-y-3">
        {value.map((amenity, index) => (
          <div key={index} className="relative rounded-xl border border-gray-200 bg-[#f8f9fa] p-4">
            <button type="button"
              onClick={() => onChange((prev) => prev.filter((_, i) => i !== index))} disabled={disabled}
              className="absolute top-3 right-3 p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
              <div>
                <label className={labelClass}>Amenity Name <span className="text-[#ef4444]">*</span></label>
                <input type="text" className={inputClass} placeholder="e.g. Swimming Pool"
                  value={amenity.name}
                  onChange={(e) => change(index, 'name', e.target.value)} disabled={disabled} maxLength={100} />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select className={selectClass} value={amenity.category}
                  onChange={(e) => change(index, 'category', e.target.value)} disabled={disabled}>
                  {AMENITY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Description (Optional)</label>
                <input type="text" className={inputClass} placeholder="e.g. Heated rooftop pool"
                  value={amenity.description}
                  onChange={(e) => change(index, 'description', e.target.value)} disabled={disabled} maxLength={500} />
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={add} disabled={disabled} className={secondaryButtonClass}>
          <Plus className="w-4 h-4 mr-2" />
          Add Amenity
        </button>
      </div>
    </Section>
  );
}

// ─── NearbyFacilitiesEditor ─────────────────────────────────────────────────

export function NearbyFacilitiesEditor({
  value, onChange, disabled,
}: EditorProps<NearbyFacilityInput>): React.ReactElement {
  const add = useCallback((): void => {
    onChange((prev) => [...prev, { name: '', category: 'other', distance: '' }]);
  }, [onChange]);

  const change = useCallback((index: number, field: keyof NearbyFacilityInput, v: string): void => {
    onChange((prev) => prev.map((n, i) => (i === index ? { ...n, [field]: v } : n)));
  }, [onChange]);

  return (
    <Section
      title="Nearby Places"
      subtitle="Nearby places appear in the Location section of the project page."
    >
      <div className="space-y-3">
        {value.map((place, index) => (
          <div key={index} className="relative rounded-xl border border-gray-200 bg-[#f8f9fa] p-4">
            <button type="button"
              onClick={() => onChange((prev) => prev.filter((_, i) => i !== index))} disabled={disabled}
              className="absolute top-3 right-3 p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
              <div>
                <label className={labelClass}>Place Name <span className="text-[#ef4444]">*</span></label>
                <input type="text" className={inputClass} placeholder="e.g. Shifa International Hospital"
                  value={place.name}
                  onChange={(e) => change(index, 'name', e.target.value)} disabled={disabled} maxLength={100} />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select className={selectClass} value={place.category}
                  onChange={(e) => change(index, 'category', e.target.value)} disabled={disabled}>
                  {NEARBY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Distance (Optional)</label>
                <input type="text" className={inputClass} placeholder="e.g. 2.5 km"
                  value={place.distance}
                  onChange={(e) => change(index, 'distance', e.target.value)} disabled={disabled} maxLength={40} />
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={add} disabled={disabled} className={secondaryButtonClass}>
          <Plus className="w-4 h-4 mr-2" />
          Add Nearby Place
        </button>
      </div>
    </Section>
  );
}

// ─── PaymentPlanImagesEditor ────────────────────────────────────────────────

// Floor-wise price labels — standard Pakistani building breakdown.
// Dropdown + Custom fallback (BuildingFloorPlansSection pattern — consistent UX)
const PAYMENT_PLAN_LABELS = [
  'Lower Ground — Parking & Storage Prices',
  'Ground Floor — Shops Prices',
  'Ground Floor — Apartments Prices',
  'Mezzanine Floor — Shops Prices',
  '1st to 5th Floors — Apartments Prices',
  '6th to 15th Floors (Typical) — Apartments Prices',
  '16th to 25th Floors (Typical) — Apartments Prices',
  'Penthouse Floor Prices',
  'Complete Price List — All Floors',
  'Booking & Installment Schedule',
] as const;

const PAYMENT_PLAN_LABEL_CUSTOM = '__custom__';

export interface PaymentPlanImageInput {
  url:     string;
  caption: string;
}

export function PaymentPlanImagesEditor({
  value, onChange, disabled,
}: EditorProps<PaymentPlanImageInput>): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded: PaymentPlanImageInput[] = [];
      for (const file of files.slice(0, 6)) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError('Each image must be under 10MB.');
          continue;
        }
        const formData = new FormData();
        formData.append('file', file, file.name);
        const res = await fetch('/api/upload?folder=projects', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        const data = (await res.json()) as { success: boolean; data?: { url: string; publicId: string }; message?: string };
        if (data.success && data.data) {
          uploaded.push({ url: data.data.url, caption: '' });
        } else {
          setUploadError(data.message ?? 'Upload failed.');
        }
      }
      if (uploaded.length) {
        onChange((prev) => [...prev, ...uploaded].slice(0, 10));
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const change = (index: number, field: keyof PaymentPlanImageInput, v: string): void => {
    onChange((prev) => prev.map((img, i) => (i === index ? { ...img, [field]: v } : img)));
  };

  const remove = (index: number): void => {
    onChange((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Section
      title="Payment Plan Images"
      subtitle="Floor-wise price list images — buyers see each floor's prices with a clear label."
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#666666]">
            Buyers see these as payment plan cards with fullscreen zoom.
          </p>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || uploading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#029bba] text-white hover:bg-[#027a94] transition-colors shadow-sm disabled:opacity-50">
            <Plus className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Add Images'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { void handleUpload(e); }}
          />
        </div>

        {uploadError && (
          <p className="text-xs text-[#ef4444]">{uploadError}</p>
        )}

        {value.length === 0 && !uploading && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-[#f8f9fa] px-4 py-6 text-center text-sm text-[#666666]">
            No payment plan images yet — upload plan banners (JPG, PNG).
          </div>
        )}

        <div className="space-y-3">
          {value.map((img, index) => (
            <div key={index} className="relative rounded-xl border border-gray-200 bg-white p-4">
              <button type="button" onClick={() => remove(index)} disabled={disabled}
                className="absolute top-3 right-3 p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full md:w-56 h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                  <img src={img.url} alt={img.caption || 'Payment plan'} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Label</label>
                  <select
                    className={selectClass}
                    value={
                      PAYMENT_PLAN_LABELS.includes(img.caption as typeof PAYMENT_PLAN_LABELS[number])
                        ? img.caption
                        : img.caption
                          ? PAYMENT_PLAN_LABEL_CUSTOM
                          : ''
                    }
                    onChange={(e) =>
                      change(index, 'caption', e.target.value === PAYMENT_PLAN_LABEL_CUSTOM ? '' : e.target.value)
                    }
                    disabled={disabled}
                  >
                    <option value="">Select label</option>
                    {PAYMENT_PLAN_LABELS.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                    <option value={PAYMENT_PLAN_LABEL_CUSTOM}>Custom Label...</option>
                  </select>

                  {/* Custom text input — dropdown "Custom" ya pehle se custom label ho */}
                  {(img.caption === '' || !PAYMENT_PLAN_LABELS.includes(img.caption as typeof PAYMENT_PLAN_LABELS[number])) && (
                    <input
                      type="text"
                      className={`${inputClass} mt-2`}
                      placeholder="e.g. Lower Ground Price List"
                      value={img.caption}
                      onChange={(e) => change(index, 'caption', e.target.value)}
                      disabled={disabled}
                      maxLength={150}
                    />
                  )}

                  <p className="text-xs text-[#666666] mt-1.5">
                    Floor-wise price images — label tells buyers which floor and unit type.
                    Horizontal ya vertical dono supported.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── LocationAdvantagesEditor ───────────────────────────────────────────────

export function LocationAdvantagesEditor({
  value, onChange, disabled,
}: EditorProps<LocationAdvantageInput>): React.ReactElement {
  const add = useCallback((): void => {
    onChange((prev) => [...prev, { title: '', points: '' }]);
  }, [onChange]);

  const change = useCallback((index: number, field: keyof LocationAdvantageInput, v: string): void => {
    onChange((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: v } : a)));
  }, [onChange]);

  return (
    <Section
      title="Location Advantages"
      subtitle="Location advantages appear on the project page — one point per line."
    >
      <div className="space-y-3">
        {value.map((adv, index) => (
          <div key={index} className="relative rounded-xl border border-gray-200 bg-[#f8f9fa] p-4">
            <button type="button"
              onClick={() => onChange((prev) => prev.filter((_, i) => i !== index))} disabled={disabled}
              className="absolute top-3 right-3 p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-3 pr-8">
              <div>
                <label className={labelClass}>Advantage Title <span className="text-[#ef4444]">*</span></label>
                <input type="text" className={inputClass} placeholder="e.g. Prime Connectivity"
                  value={adv.title}
                  onChange={(e) => change(index, 'title', e.target.value)} disabled={disabled} maxLength={150} />
              </div>
              <div>
                <label className={labelClass}>Points (one per line)</label>
                <textarea className={`${inputClass} min-h-[90px] resize-y`}
                  placeholder={'e.g. 5 min from Kashmir Highway\nDirect access to Srinagar Highway'}
                  value={adv.points}
                  onChange={(e) => change(index, 'points', e.target.value)} disabled={disabled} />
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={add} disabled={disabled} className={secondaryButtonClass}>
          <Plus className="w-4 h-4 mr-2" />
          Add Advantage
        </button>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FeeTransparencyEditor (Utility connections, maintenance & possession fees)
// ─────────────────────────────────────────────────────────────────────────────

export interface FeeTransparencyInput {
  electricityIncluded: boolean;
  gasIncluded:         boolean;
  waterIncluded:       boolean;
  maintenanceFee:      string;
  transferTax:         string;
  possessionCharges:   string;
  disclaimer:          string;
}

interface FeeTransparencyProps {
  value: FeeTransparencyInput;
  onChange: React.Dispatch<React.SetStateAction<FeeTransparencyInput>>;
  disabled?: boolean;
}

export function FeeTransparencyEditor({
  value,
  onChange,
  disabled,
}: FeeTransparencyProps): React.ReactElement {
  
  const handleToggle = (field: keyof Omit<FeeTransparencyInput, 'maintenanceFee' | 'transferTax' | 'possessionCharges' | 'disclaimer'>): void => {
    onChange((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleTextChange = (field: keyof FeeTransparencyInput, text: string): void => {
    onChange((prev) => ({
      ...prev,
      [field]: text,
    }));
  };

  const toggleCls = "w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-[#029bba]/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#029bba]";

  return (
    <Section
      title="Pricing Transparency & Connection Fees"
      subtitle="Expose utility and FBR tax policies openly. Highly recommended to increase booking trust and eliminate hidden developer charge complaints."
    >
      <div className="space-y-6">
        
        {/* Toggle Grid */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Utility Meters Included in base price?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Electricity Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-150">
              <span className="text-sm font-semibold text-gray-700">Electricity Connection</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.electricityIncluded}
                  onChange={() => handleToggle('electricityIncluded')}
                  disabled={disabled}
                  className="sr-only peer"
                />
                <div className={toggleCls}></div>
              </label>
            </div>

            {/* Gas Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-150">
              <span className="text-sm font-semibold text-gray-700">Sui Gas Connection</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.gasIncluded}
                  onChange={() => handleToggle('gasIncluded')}
                  disabled={disabled}
                  className="sr-only peer"
                />
                <div className={toggleCls}></div>
              </label>
            </div>

            {/* Water Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-150">
              <span className="text-sm font-semibold text-gray-700">Water & Sewerage</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.waterIncluded}
                  onChange={() => handleToggle('waterIncluded')}
                  disabled={disabled}
                  className="sr-only peer"
                />
                <div className={toggleCls}></div>
              </label>
            </div>

          </div>
        </div>

        {/* Text Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div>
            <label className={labelClass}>Maintenance Fee Details</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. PKR 5,000 per month starting from possession"
              value={value.maintenanceFee}
              onChange={(e) => handleTextChange('maintenanceFee', e.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelClass}>Possession Charges Breakdown</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. 10% of total unit price due at handoff"
              value={value.possessionCharges}
              onChange={(e) => handleTextChange('possessionCharges', e.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>

        </div>

        <div>
          <label className={labelClass}>Transfer Taxes & FBR Rules</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Filer tax 3%, Non-Filer tax 6% per active Government schedule"
            value={value.transferTax}
            onChange={(e) => handleTextChange('transferTax', e.target.value)}
            disabled={disabled}
            maxLength={200}
          />
        </div>

        <div>
          <label className={labelClass}>Developer Transparent Disclaimer (Optional)</label>
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder="Any extra details on connection costs, utility meter guarantees, or FBR tax declarations..."
            value={value.disclaimer}
            onChange={(e) => handleTextChange('disclaimer', e.target.value)}
            disabled={disabled}
            maxLength={500}
          />
        </div>

      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FinishingSpecsEditor (Interior handover deliverables & commercial specs)
// ─────────────────────────────────────────────────────────────────────────────

export interface FinishingSpecsInput {
  deliveryCondition: 'grey_structure' | 'semi_furnished' | 'fully_furnished';
  flooring:          string;
  woodwork:          string;
  kitchen:           string;
  washrooms:         string;
  windows:           string;
  hvac:              string;
  fireSafety:        string;
  commercialMobility: string;
}

interface FinishingSpecsProps {
  value: FinishingSpecsInput;
  onChange: React.Dispatch<React.SetStateAction<FinishingSpecsInput>>;
  disabled?: boolean;
}

export function FinishingSpecsEditor({
  value,
  onChange,
  disabled,
}: FinishingSpecsProps): React.ReactElement {

  const handleSelectChange = (val: 'grey_structure' | 'semi_furnished' | 'fully_furnished'): void => {
    onChange((prev) => ({ ...prev, deliveryCondition: val }));
  };

  const handleTextChange = (field: keyof Omit<FinishingSpecsInput, 'deliveryCondition'>, text: string): void => {
    onChange((prev) => ({ ...prev, [field]: text }));
  };

  return (
    <Section
      title="Interior Finishing & Handover Deliverables"
      subtitle="Define exactly what items (tiles, doors, sanitary fittings, kitchen cabinets) will be installed on key handover."
    >
      <div className="space-y-6">
        <div>
          <label className={labelClass}>Delivery Condition / Finishing Level <span className="text-[#ef4444]">*</span></label>
          <select
            className={selectClass}
            value={value.deliveryCondition || 'semi_furnished'}
            onChange={(e) => handleSelectChange(e.target.value as 'grey_structure' | 'semi_furnished' | 'fully_furnished')}
            disabled={disabled}
          >
            <option value="grey_structure">Grey Structure (Unfinished Raw Structure)</option>
            <option value="semi_furnished">Semi-Furnished (Standard Handover with Tiles & Sanitary)</option>
            <option value="fully_furnished">Fully Furnished (Turnkey Ready with Furniture & Appliances)</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Flooring Specifications</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. 24x24 Master Porcelain Tiles in bedrooms, Granite in corridors"
              value={value.flooring || ''}
              onChange={(e) => handleTextChange('flooring', e.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelClass}>Woodwork & Main Doors</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Solid Ash Wood entrance door, UV Sheet Wardrobes"
              value={value.woodwork || ''}
              onChange={(e) => handleTextChange('woodwork', e.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelClass}>Kitchen Deliverables</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. High-Gloss Cabinets, Corian Countertops, Hood & Hob installed"
              value={value.kitchen || ''}
              onChange={(e) => handleTextChange('kitchen', e.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelClass}>Washroom & Sanitary Fittings</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Porta Commodes, Grohe Taps, Glass Shower Enclosures"
              value={value.washrooms || ''}
              onChange={(e) => handleTextChange('washrooms', e.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelClass}>Windows & Glazing</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Aluminum sliding windows with 5mm tinted glass & safety grills"
              value={value.windows || ''}
              onChange={(e) => handleTextChange('windows', e.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelClass}>HVAC / Air Conditioning Provisions</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Copper piping pre-installed for Split ACs in all rooms"
              value={value.hvac || ''}
              onChange={(e) => handleTextChange('hvac', e.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelClass}>Fire Safety & Emergency Standards</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Smoke detectors, hose reels, external fire escape stairs"
              value={value.fireSafety || ''}
              onChange={(e) => handleTextChange('fireSafety', e.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelClass}>Commercial Mobility (if applicable)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Heavy-duty Escalators for retail floors, Cargo Lift available"
              value={value.commercialMobility || ''}
              onChange={(e) => handleTextChange('commercialMobility', e.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}