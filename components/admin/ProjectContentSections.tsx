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

import React, { useCallback } from 'react';
import { Plus, X, Video } from 'lucide-react';

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
  value, onChange, disabled,
}: EditorProps<DevelopmentUpdateInput>): React.ReactElement {
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