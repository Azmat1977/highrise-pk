// components/property/forms/listing/StepType.tsx
//
// Step 1: Property Type + Listing Type + Location
// Type: 4 groups (PROPERTY_TYPE_GROUPS) + subtypes
// Listing: getFieldConfig().allowedListingTypes (type-driven)
// Location: City → Society → Phase → Block (PK pattern)

'use client';

import React, { useMemo } from 'react';
import {
  MapPin, ChevronDown, Building2, Home, Landmark, Tractor,
} from 'lucide-react';

import type { ListingFormState, PropertyType, ListingType } from './types';
import { PAKISTAN_CITIES, PROPERTY_TYPE_GROUPS, PROPERTY_TYPE_LABELS } from './types';
import { PROPERTY_SUBTYPES, getFieldConfig } from '../shared/usePropertyForm';

interface StepTypeProps {
  form: ListingFormState;
  setField: <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => void;
  errors: Record<string, string>;
}

// Listing type options — labels (config se allowed aayenge)
const LISTING_TYPE_OPTIONS: Array<{ value: ListingType; label: string; hint: string }> = [
  { value: 'full_payment', label: 'Full Payment', hint: 'One-time payment' },
  { value: 'installment', label: 'Installment Plan', hint: 'Booking + installments' },
  { value: 'rent', label: 'For Rent', hint: 'Monthly rental' },
  { value: 'pre_launch', label: 'Pre-Launch Booking', hint: 'Early bird' },
];

// Allowed listing types per property type — usePropertyForm config se
export default function StepType({ form, setField, errors }: StepTypeProps): React.ReactElement {
  const config = useMemo(
    () => getFieldConfig(form.propertyType as PropertyType | ''),
    [form.propertyType]
  );

  const subtypes = useMemo(
    () => (form.propertyType ? (PROPERTY_SUBTYPES[form.propertyType] ?? []) : []),
    [form.propertyType]
  );

  const handleTypeChange = (type: PropertyType): void => {
    const newConfig = getFieldConfig(type);
    // Listing type reset agar new type mein allowed nahi
    if (form.listingType && !newConfig.allowedListingTypes.includes(form.listingType)) {
      setField('listingType', newConfig.defaultListingType);
    }
    setField('propertyType', type);
    setField('propertySubtype', '');
  };

  return (
    <div className="space-y-6">
      {/* ── Property Category Groups ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Property Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PROPERTY_TYPE_GROUPS.map((group) => (
            <button
              key={group.label}
              type="button"
              onClick={() => {
                // Group click → first type in group
                handleTypeChange(group.types[0]!);
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                form.propertyType && group.types.includes(form.propertyType)
                  ? 'border-[#029bba] bg-[#029bba]/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="text-2xl">{group.icon}</span>
              <p className="text-sm font-bold text-gray-900 mt-1">{group.label}</p>
              <p className="text-[10px] text-gray-500">{group.types.length} types</p>
            </button>
          ))}
        </div>

        {/* Sub-types within selected group */}
        {(() => {
          const selectedType = form.propertyType;
          if (!selectedType) return null;
          const selectedGroup = PROPERTY_TYPE_GROUPS.find((g) =>
            g.types.includes(selectedType)
          );
          if (!selectedGroup) return null;
          return (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedGroup.types.map((type) => {
                const Icon = type === 'plot' ? Landmark
                  : type === 'farmhouse' || type === 'other' ? Tractor
                  : type === 'apartment' || type === 'penthouse' ? Building2
                  : Home;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                text-xs font-semibold transition-all ${
                      form.propertyType === type
                        ? 'bg-[#029bba] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {PROPERTY_TYPE_LABELS[type]}
                  </button>
                );
              })}
          </div>
          );
        })()}
        {errors.propertyType && (
          <p className="text-xs text-red-500 mt-1">{errors.propertyType}</p>
        )}
      </div>

      {/* ── Sub-type (if exists for selected type) ── */}
      {subtypes.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Sub-type
          </label>
          <select
            value={form.propertySubtype}
            onChange={(e) => setField('propertySubtype', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                       text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                       outline-none"
          >
            <option value="">Select sub-type (optional)</option>
            {subtypes.map((st) => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Listing Type (allowed per property) ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Listing Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {LISTING_TYPE_OPTIONS.map((lt) => {
            const isAllowed = config.allowedListingTypes.includes(lt.value);
            return (
              <button
                key={lt.value}
                type="button"
                onClick={() => isAllowed && setField('listingType', lt.value)}
                disabled={!isAllowed}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  form.listingType === lt.value
                    ? 'border-[#029bba] bg-[#029bba]/5'
                    : isAllowed
                      ? 'border-gray-200 hover:border-gray-300 bg-white'
                      : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
              >
                <p className={`text-sm font-bold ${
                  form.listingType === lt.value ? 'text-[#029bba]' : 'text-gray-700'
                }`}>
                  {lt.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{lt.hint}</p>
              </button>
            );
          })}
        </div>
        {errors.listingType && (
          <p className="text-xs text-red-500 mt-1">{errors.listingType}</p>
        )}

        {/* Selected listing type — preview hint */}
        {form.listingType && (
          <p className="text-xs text-[#029bba] font-semibold mt-2 bg-[#029bba]/5
                         border border-[#029bba]/20 rounded-lg px-3 py-2">
            {form.listingType === 'installment' && 'Installment details (total price + % + plan) — Step 3: Pricing'}
            {form.listingType === 'full_payment' && 'Asking price — Step 3: Pricing'}
            {form.listingType === 'rent' && 'Rental details (monthly rent + deposit) — Step 3: Pricing'}
            {form.listingType === 'pre_launch' && 'Pre-launch price — Step 3: Pricing'}
          </p>
        )}
      </div>

      {/* ── Location ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            City <span className="text-red-500">*</span>
          </label>
          <select
            value={form.city}
            onChange={(e) => setField('city', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                       text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                       outline-none"
          >
            <option value="">Select city</option>
            {PAKISTAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Society / Area <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.society}
            onChange={(e) => setField('society', e.target.value)}
            placeholder="e.g. DHA Phase 5, Bahria Town"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                       text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                       outline-none"
            maxLength={100}
          />
          {errors.society && <p className="text-xs text-red-500 mt-1">{errors.society}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Phase / Sector
          </label>
          <input
            type="text"
            value={form.phase}
            onChange={(e) => setField('phase', e.target.value)}
            placeholder="e.g. Phase 5, Sector H-13"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                       text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                       outline-none"
            maxLength={60}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Block / Street
          </label>
          <input
            type="text"
            value={form.block}
            onChange={(e) => setField('block', e.target.value)}
            placeholder="e.g. Block C, Street 12"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                       text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                       outline-none"
            maxLength={60}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Map Coordinates (Lat, Lng)
          </label>
          <input
            type="text"
            value={form.coordinatesRaw}
            onChange={(e) => {
              const raw = e.target.value;
              setField('coordinatesRaw', raw);
              const match = raw.trim().match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
              if (match) {
                setField('lat', match[1]);
                setField('lng', match[3]);
              }
            }}
            placeholder="e.g. 33.6844, 73.0479"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                       text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                       outline-none"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Right-click on Google Maps - &quot;What&apos;s here?&quot; - copy coordinates.
            If empty, city center coordinates will be used automatically.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.lat}
              onChange={(e) => setField('lat', e.target.value)}
              placeholder="Latitude"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#029bba]"
            />
            <input
              type="text"
              value={form.lng}
              onChange={(e) => setField('lng', e.target.value)}
              placeholder="Longitude"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#029bba]"
            />
          </div>
        </div>
      </div>

      {/* ── Listing Title ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Listing Title <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="e.g. 5 Marla Corner Plot in DHA Phase 5 — Near Park"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white
                       text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                       outline-none"
            minLength={10}
            maxLength={120}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          {form.title.length}/120 — descriptive title buyers search for (min 10 chars)
        </p>
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
      </div>
    </div>
  );
}