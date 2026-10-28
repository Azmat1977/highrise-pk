// components/property/forms/listing/StepDetails.tsx
//
// Step 2: Property Details — conditional fields by property type
// Plot: dimensions + boundary + corner
// Built (house/apt/villa/penthouse): beds/baths/floors/parking
// Commercial (shop/office): floor # + front
// Agricultural: cultivation + bore + electricity

'use client';

import React from 'react';
import {
  Ruler, Bed, Bath, Car, Building, Layers, MapPin, Compass,
  Fence, Droplets, Zap, Tractor, Clock,
} from 'lucide-react';

import type { ListingFormState, PropertyType } from './types';
import {
  AREA_UNITS,
  FACING_OPTIONS,
  FURNISHING_OPTIONS,
  POSSESSION_OPTIONS,
  NEARBY_CATEGORIES,
  getAmenityGroupForType,
} from './types';
import { Plus, X } from 'lucide-react';

interface StepDetailsProps {
  form: ListingFormState;
  setField: <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => void;
  errors: Record<string, string>;
}

// Field groups by property type category
function isPlotType(t: PropertyType): boolean {
  return t === 'plot' || t === 'farmhouse' || t === 'other';
}
function isBuiltType(t: PropertyType): boolean {
  return ['house', 'apartment', 'villa', 'penthouse', 'room'].includes(t);
}
function isCommercialType(t: PropertyType): boolean {
  return ['shop', 'office', 'warehouse', 'building', 'commercial'].includes(t);
}

const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

export default function StepDetails({ form, setField, errors }: StepDetailsProps): React.ReactElement {
  const pt = form.propertyType as PropertyType;

  return (
    <div className="space-y-6">
      {/* ── Area (sab types) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>
            Area <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="number"
              value={form.area}
              onChange={(e) => setField('area', e.target.value)}
              placeholder="e.g. 5"
              min={0}
              className={`${inputCls} pl-10`}
            />
          </div>
          {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
        </div>
        <div>
          <label className={labelCls}>Unit</label>
          <select
            value={form.areaUnit}
            onChange={(e) => setField('areaUnit', e.target.value as typeof form.areaUnit)}
            className={inputCls}
          >
            {AREA_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* Plot dimensions — plots only */}
        {isPlotType(pt) && (
          <>
            <div>
              <label className={labelCls}>Front (ft)</label>
              <input
                type="number"
                value={form.frontSize}
                onChange={(e) => setField('frontSize', e.target.value)}
                placeholder="e.g. 30"
                min={0}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Depth (ft)</label>
              <input
                type="number"
                value={form.depthSize}
                onChange={(e) => setField('depthSize', e.target.value)}
                placeholder="e.g. 60"
                min={0}
                className={inputCls}
              />
            </div>
          </>
        )}

        {/* Covered area — built types */}
        {isBuiltType(pt) && (
          <div>
            <label className={labelCls}>Covered Area (Sq. Ft.)</label>
            <input
              type="number"
              value={form.coveredArea}
              onChange={(e) => setField('coveredArea', e.target.value)}
              placeholder="e.g. 1350"
              min={0}
              className={inputCls}
            />
          </div>
        )}
      </div>

      {/* ── Plot-specific ── */}
      {isPlotType(pt) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <Fence className="w-5 h-5 text-[#029bba]" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Boundary Wall</p>
              <button
                type="button"
                onClick={() => setField('boundaryWall', !form.boundaryWall)}
                className={`mt-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  form.boundaryWall ? 'bg-[#029bba] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {form.boundaryWall ? 'Yes' : 'No'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <Compass className="w-5 h-5 text-[#029bba]" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Corner Plot</p>
              <button
                type="button"
                onClick={() => setField('isCorner', !form.isCorner)}
                className={`mt-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  form.isCorner ? 'bg-[#029bba] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {form.isCorner ? 'Yes' : 'No'}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Facing</label>
            <select
              value={form.facing}
              onChange={(e) => setField('facing', e.target.value)}
              className={inputCls}
            >
              <option value="">Select facing</option>
              {FACING_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Built-specific (house/apartment/villa/penthouse) ── */}
      {isBuiltType(pt) && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>
                <Bed className="w-4 h-4 inline mr-1" />
                Bedrooms
              </label>
              <input
                type="number"
                value={form.bedrooms}
                onChange={(e) => setField('bedrooms', e.target.value)}
                placeholder="e.g. 3"
                min={0}
                max={15}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <Bath className="w-4 h-4 inline mr-1" />
                Bathrooms
              </label>
              <input
                type="number"
                value={form.bathrooms}
                onChange={(e) => setField('bathrooms', e.target.value)}
                placeholder="e.g. 3"
                min={0}
                max={15}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <Car className="w-4 h-4 inline mr-1" />
                Parkings
              </label>
              <input
                type="number"
                value={form.parkings}
                onChange={(e) => setField('parkings', e.target.value)}
                placeholder="e.g. 1"
                min={0}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <Layers className="w-4 h-4 inline mr-1" />
                {pt === 'house' || pt === 'villa' ? 'Total Floors' : 'Floor #'}
              </label>
              <input
                type="number"
                value={pt === 'house' || pt === 'villa' ? form.floors : form.floorNumber}
                onChange={(e) => setField(
                  pt === 'house' || pt === 'villa' ? 'floors' : 'floorNumber',
                  e.target.value
                )}
                placeholder={pt === 'house' || pt === 'villa' ? 'e.g. 2' : 'e.g. 5'}
                min={pt === 'house' || pt === 'villa' ? 1 : 0}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Furnishing</label>
              <select
                value={form.furnishingStatus}
                onChange={(e) => setField('furnishingStatus', e.target.value)}
                className={inputCls}
              >
                <option value="">Select furnishing</option>
                {FURNISHING_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f.replace('-', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Servant Quarters</label>
              <input
                type="number"
                value={form.servantQuarters}
                onChange={(e) => setField('servantQuarters', e.target.value)}
                placeholder="e.g. 1"
                min={0}
                className={inputCls}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Commercial-specific ── */}
      {isCommercialType(pt) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>
              <Layers className="w-4 h-4 inline mr-1" />
              Floor Number
            </label>
            <input
              type="number"
              value={form.floorNumber}
              onChange={(e) => setField('floorNumber', e.target.value)}
              placeholder="Ground = 0"
              min={0}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              <Building className="w-4 h-4 inline mr-1" />
              Total Floors (building)
            </label>
            <input
              type="number"
              value={form.floors}
              onChange={(e) => setField('floors', e.target.value)}
              placeholder="e.g. 10"
              min={0}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              <MapPin className="w-4 h-4 inline mr-1" />
              Facing
            </label>
            <select
              value={form.facing}
              onChange={(e) => setField('facing', e.target.value)}
              className={inputCls}
            >
              <option value="">Select facing</option>
              {FACING_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Agricultural-specific ── */}
      {(pt === 'farmhouse' || pt === 'other') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>
              <Tractor className="w-4 h-4 inline mr-1" />
              Cultivation
            </label>
            <select
              value={form.cultivationType}
              onChange={(e) => setField('cultivationType', e.target.value)}
              className={inputCls}
            >
              <option value="">Select type</option>
              <option value="orchard">Orchard (bagh)</option>
              <option value="crop">Crop land</option>
              <option value="barren">Barren land</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <Droplets className="w-5 h-5 text-[#029bba]" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Water Bore</p>
              <button
                type="button"
                onClick={() => setField('hasBore', !form.hasBore)}
                className={`mt-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  form.hasBore ? 'bg-[#029bba] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {form.hasBore ? 'Available' : 'No'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <Zap className="w-5 h-5 text-[#029bba]" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Electricity</p>
              <button
                type="button"
                onClick={() => setField('hasElectricity', !form.hasElectricity)}
                className={`mt-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  form.hasElectricity ? 'bg-[#029bba] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {form.hasElectricity ? 'Available' : 'No'}
              </button>
            </div>
          </div>
        </div>
      )}

       {/* --- Amenities (property-type aware) --- */}
      <div>
        <label className={labelCls}>Property Amenities</label>
        <p className="text-xs text-gray-500 mb-3">
          Select amenities that match this property type.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {getAmenityGroupForType(pt).map((item) => {
            const selectedAmenities = Array.isArray(form.amenities) ? form.amenities : [];
            const checked = selectedAmenities.includes(item.key);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setField(
                    'amenities',
                    checked
                      ? selectedAmenities.filter((a) => a !== item.key)
                      : [...selectedAmenities, item.key]
                  );
                }}
                className={`text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  checked
                    ? 'border-[#029bba] bg-[#029bba]/10 text-[#029bba]'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Nearby neighbourhood facilities --- */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls + ' mb-0'}>Nearby Facilities</label>
          <button
            type="button"
            onClick={() =>
              setField('nearbyFacilities', [
                ...(Array.isArray(form.nearbyFacilities) ? form.nearbyFacilities : []),
                { name: '', category: 'School', distance: '' },
              ])
            }
            className="inline-flex items-center gap-1 text-xs font-bold text-[#029bba] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Facility
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Schools, colleges, hospitals, malls, gyms, major roads, and more.
        </p>
        <div className="space-y-2">
          {(Array.isArray(form.nearbyFacilities) ? form.nearbyFacilities : []).map((item, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <select
                value={item.category}
                onChange={(e) => {
                  const current = Array.isArray(form.nearbyFacilities) ? form.nearbyFacilities : [];
                  const next = [...current];
                  next[idx] = { ...next[idx], category: e.target.value };
                  setField('nearbyFacilities', next);
                }}
                className="md:col-span-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#029bba]"
              >
                {NEARBY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="text"
                value={item.name}
                onChange={(e) => {
                  const current = Array.isArray(form.nearbyFacilities) ? form.nearbyFacilities : [];
                  const next = [...current];
                  next[idx] = { ...next[idx], name: e.target.value };
                  setField('nearbyFacilities', next);
                }}
                placeholder="e.g. Beaconhouse School"
                className="md:col-span-5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#029bba]"
                maxLength={100}
              />
              <input
                type="text"
                value={item.distance}
                onChange={(e) => {
                  const current = Array.isArray(form.nearbyFacilities) ? form.nearbyFacilities : [];
                  const next = [...current];
                  next[idx] = { ...next[idx], distance: e.target.value };
                  setField('nearbyFacilities', next);
                }}
                placeholder="e.g. 1.5 km"
                className="md:col-span-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#029bba]"
                maxLength={30}
              />
              <button
                type="button"
                onClick={() => {
                  const current = Array.isArray(form.nearbyFacilities) ? form.nearbyFacilities : [];
                  setField(
                    'nearbyFacilities',
                    current.filter((_, i) => i !== idx)
                  );
                }}
                className="md:col-span-1 p-2 rounded-lg text-red-500 hover:bg-red-50"
                aria-label="Remove facility"
              >
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>
          ))}
          {(Array.isArray(form.nearbyFacilities) ? form.nearbyFacilities : []).length === 0 && (
            <p className="text-xs text-gray-400">No nearby facilities added yet.</p>
          )}
        </div>
      </div>

      {/* --- Possession (sab types - API contract) --- */}
      <div>
        <label className={labelCls}>Possession Status</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {POSSESSION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setField('possessionStatus', opt.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                form.possessionStatus === opt.value
                  ? 'border-[#029bba] bg-[#029bba]/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <p className={`text-sm font-bold ${
                form.possessionStatus === opt.value ? 'text-[#029bba]' : 'text-gray-700'
              }`}>
                {opt.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}