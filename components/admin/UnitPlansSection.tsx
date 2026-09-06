// components/admin/UnitPlansSection.tsx

import React, { useState } from 'react';
import {
  Home,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Bed,
  Bath,
  Maximize,
  CreditCard,
  Video,
  Image as ImageIcon,
  X,
  Building2,
  Store,
  Briefcase,
  Crown,
  Coffee,
  Box,
} from 'lucide-react';
import FileUploader from './FileUploader';

// Type for interior image
interface InteriorImage {
  url: string;
  publicId: string;
  caption?: string;
}

// Type for a single unit plan
export interface UnitPlan {
  type: string;
  name: string;
  category?: 'residential' | 'commercial';
  totalUnits?: number;
  soldUnits?: number;
  availableUnits?: number;
  floorsAssigned?: string[];
  priceRange: {
    min: number;
    max: number;
  };
  areaRange?: {
    min: number;
    max: number;
    unit: string;
  };
  bedrooms?: number;
  bathrooms?: number;
  features?: string[];
  description?: string;
  layoutImageUrl?: string;
  layoutImagePublicId?: string;
  interiorImages?: InteriorImage[];
  floorPlanPdfUrl?: string;
  floorPlanPdfPublicId?: string;
  walkthroughVideoUrl?: string;
}

interface UnitPlansSectionProps {
  unitPlans: UnitPlan[];
  onChange: (unitPlans: UnitPlan[]) => void;
  projectSlug?: string;
  disabled?: boolean;
}

// Unit type options
const UNIT_TYPES = [
  { value: 'studio_apartment', label: 'Studio Apartment', icon: Home, category: 'residential' },
  { value: 'apartment_1bed', label: '1 Bed Apartment', icon: Home, category: 'residential' },
  { value: 'apartment_2bed', label: '2 Bed Apartment', icon: Home, category: 'residential' },
  { value: 'apartment_3bed', label: '3 Bed Apartment', icon: Home, category: 'residential' },
  { value: 'apartment_4bed', label: '4 Bed Apartment', icon: Home, category: 'residential' },
  { value: 'penthouse', label: 'Penthouse', icon: Crown, category: 'residential' },
  { value: 'duplex', label: 'Duplex', icon: Building2, category: 'residential' },
  { value: 'shop', label: 'Shop', icon: Store, category: 'commercial' },
  { value: 'office', label: 'Office', icon: Briefcase, category: 'commercial' },
  { value: 'food_court', label: 'Food Court', icon: Coffee, category: 'commercial' },
  { value: 'kiosk', label: 'Kiosk', icon: Box, category: 'commercial' },
  { value: 'showroom', label: 'Showroom', icon: Store, category: 'commercial' },
  { value: 'other', label: 'Other', icon: Box, category: 'commercial' },
];

// Common features for quick selection
const COMMON_FEATURES = [
  'Balcony',
  'Terrace',
  'Corner Unit',
  'Park Facing',
  'Road Facing',
  'Sea View',
  'City View',
  'Attached Bath',
  'Walk-in Closet',
  'Servant Quarter',
  'Laundry Area',
  'Storage Room',
  'Private Elevator',
  'Double Height Ceiling',
  'Smart Home',
  'Furnished',
  'Semi-Furnished',
];

// Helper function to format price
const formatPrice = (price: number): string => {
  if (price >= 10000000) {
    return `${(price / 10000000).toFixed(2)} Crore`;
  } else if (price >= 100000) {
    return `${(price / 100000).toFixed(2)} Lac`;
  }
  return price.toLocaleString();
};

// Helper function to convert area
const convertArea = (sqft: number, toUnit: string): string => {
  switch (toUnit) {
    case 'marla':
      return (sqft / 225).toFixed(2);
    case 'sqm':
      return (sqft * 0.0929).toFixed(2);
    case 'kanal':
      return (sqft / 4500).toFixed(3);
    default:
      return sqft.toString();
  }
};

export default function UnitPlansSection({
  unitPlans,
  onChange,
  projectSlug = 'general',
  disabled = false,
}: UnitPlansSectionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [newFeature, setNewFeature] = useState<{ [key: number]: string }>({});

  // Add new unit plan
  const addUnitPlan = () => {
    const newUnit: UnitPlan = {
      type: '',
      name: '',
      category: 'residential',
      priceRange: { min: 0, max: 0 },
      areaRange: { min: 0, max: 0, unit: 'Sq. Ft.' },
      features: [],
      interiorImages: [],
    };
    onChange([...unitPlans, newUnit]);
    setExpandedIndex(unitPlans.length);
  };

  // Remove unit plan
  const removeUnitPlan = (index: number) => {
    const updated = unitPlans.filter((_, i) => i !== index);
    onChange(updated);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  // Update a specific unit plan
  const updateUnitPlan = (index: number, updates: Partial<UnitPlan>) => {
    const updated = unitPlans.map((unit, i) =>
      i === index ? { ...unit, ...updates } : unit
    );
    onChange(updated);
  };

  // Add feature to unit
  const addFeature = (index: number, feature: string) => {
    if (!feature.trim()) return;
    const unit = unitPlans[index];
    const features = unit.features || [];
    if (!features.includes(feature.trim())) {
      updateUnitPlan(index, { features: [...features, feature.trim()] });
    }
    setNewFeature({ ...newFeature, [index]: '' });
  };

  // Remove feature from unit
  const removeFeature = (index: number, feature: string) => {
    const unit = unitPlans[index];
    const features = (unit.features || []).filter((f) => f !== feature);
    updateUnitPlan(index, { features });
  };

  // Add interior image
  const addInteriorImage = (
    index: number,
    image: { url: string; publicId: string }
  ) => {
    const unit = unitPlans[index];
    const images = unit.interiorImages || [];
    updateUnitPlan(index, {
      interiorImages: [...images, { ...image, caption: '' }],
    });
  };

  // Remove interior image
  const removeInteriorImage = (unitIndex: number, imageIndex: number) => {
    const unit = unitPlans[unitIndex];
    const images = (unit.interiorImages || []).filter((_, i) => i !== imageIndex);
    updateUnitPlan(unitIndex, { interiorImages: images });
  };

  // Get icon for unit type
  const getUnitIcon = (type: string) => {
    const unitType = UNIT_TYPES.find((t) => t.value === type);
    const IconComponent = unitType?.icon || Box;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#029bba]/10 to-transparent border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#029bba] flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Unit Types & Plans
              </h3>
              <p className="text-sm text-gray-500">
                Add different unit types with pricing, area, and floor plans
              </p>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={addUnitPlan}
              className="flex items-center gap-2 px-4 py-2 bg-[#029bba] text-white rounded-xl hover:bg-[#027a94] transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Unit Type
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {unitPlans.length === 0 && (
        <div className="mx-6 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-3">
          <Home className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-700">No unit types added yet</p>
            <p className="mt-1">
              Click "Add Unit Type" to add apartments, shops, offices, penthouses, etc.
              Each unit type can have its own pricing, area, and floor plans.
            </p>
          </div>
        </div>
      )}

      {/* Unit Plans List */}
      <div className="p-6 space-y-4">
        {unitPlans.map((unit, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50"
          >
            {/* Unit Header */}
            <div
              onClick={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              className="px-4 py-3 bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    unit.category === 'commercial'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-[#029bba]/10 text-[#029bba]'
                  }`}
                >
                  {getUnitIcon(unit.type)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {unit.name || 'Unnamed Unit Type'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
  {unit.priceRange && unit.priceRange.min > 0 && unit.priceRange.max > 0 && (
    <span className="text-green-600 font-medium">
      PKR {formatPrice(unit.priceRange.min)} - {formatPrice(unit.priceRange.max)}
    </span>
  )}
  {unit.areaRange && unit.areaRange.min > 0 && unit.areaRange.max > 0 && (
    <span>
      {unit.areaRange.min} - {unit.areaRange.max} {unit.areaRange.unit}
    </span>
  )}
  {unit.bedrooms && <span>{unit.bedrooms} Bed</span>}
</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Delete */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUnitPlan(index);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-500"
                    title="Delete unit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {/* Unit Details (Expandable) */}
            {expandedIndex === index && (
              <div className="px-4 py-4 border-t border-gray-200 space-y-6">
                {/* Basic Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Unit Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={unit.type}
                      onChange={(e) => {
                        const selectedType = UNIT_TYPES.find(
                          (t) => t.value === e.target.value
                        );
                        updateUnitPlan(index, {
                          type: e.target.value,
                          category: selectedType?.category as 'residential' | 'commercial',
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                      disabled={disabled}
                    >
                      <option value="">Select type</option>
                      <optgroup label="Residential">
                        {UNIT_TYPES.filter((t) => t.category === 'residential').map(
                          (type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          )
                        )}
                      </optgroup>
                      <optgroup label="Commercial">
                        {UNIT_TYPES.filter((t) => t.category === 'commercial').map(
                          (type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          )
                        )}
                      </optgroup>
                    </select>
                  </div>

                  {/* Unit Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={unit.name}
                      onChange={(e) =>
                        updateUnitPlan(index, { name: e.target.value })
                      }
                      placeholder="e.g., Studio Services Apartment"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                      disabled={disabled}
                    />
                  </div>

                  {/* Category Badge */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <div
                      className={`px-3 py-2 rounded-xl text-sm font-medium text-center ${
                        unit.category === 'commercial'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-[#029bba]/10 text-[#029bba]'
                      }`}
                    >
                      {unit.category === 'commercial' ? '🏪 Commercial' : '🏠 Residential'}
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CreditCard className="w-4 h-4 inline mr-1" />
                    Price Range (PKR) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Minimum Price
                      </label>
                      <input
                        type="number"
                        value={unit.priceRange?.min || ''}
                        onChange={(e) =>
                          updateUnitPlan(index, {
                            priceRange: {
                              ...unit.priceRange,
                              min: Number(e.target.value),
                            },
                          })
                        }
                        placeholder="e.g., 28800000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                        disabled={disabled}
                      />
                      {unit.priceRange?.min > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          = {formatPrice(unit.priceRange.min)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Maximum Price
                      </label>
                      <input
                        type="number"
                        value={unit.priceRange?.max || ''}
                        onChange={(e) =>
                          updateUnitPlan(index, {
                            priceRange: {
                              ...unit.priceRange,
                              max: Number(e.target.value),
                            },
                          })
                        }
                        placeholder="e.g., 38800000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                        disabled={disabled}
                      />
                      {unit.priceRange?.max > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          = {formatPrice(unit.priceRange.max)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Area Range */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    <Maximize className="w-4 h-4 inline mr-1" />
    Area Range <span className="text-red-500">*</span>
  </label>
  <div className="grid grid-cols-3 gap-4">
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        Minimum Area
      </label>
      <input
        type="number"
        value={unit.areaRange?.min ?? ''}
        onChange={(e) => {
          const currentAreaRange = unit.areaRange || { min: 0, max: 0, unit: 'Sq. Ft.' };
          updateUnitPlan(index, {
            areaRange: {
              ...currentAreaRange,
              min: Number(e.target.value),
            },
          });
        }}
        placeholder="e.g., 450"
        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
        disabled={disabled}
      />
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        Maximum Area
      </label>
      <input
        type="number"
        value={unit.areaRange?.max ?? ''}
        onChange={(e) => {
          const currentAreaRange = unit.areaRange || { min: 0, max: 0, unit: 'Sq. Ft.' };
          updateUnitPlan(index, {
            areaRange: {
              ...currentAreaRange,
              max: Number(e.target.value),
            },
          });
        }}
        placeholder="e.g., 548"
        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
        disabled={disabled}
      />
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        Unit
      </label>
      <select
        value={unit.areaRange?.unit ?? 'Sq. Ft.'}
        onChange={(e) => {
          const currentAreaRange = unit.areaRange || { min: 0, max: 0, unit: 'Sq. Ft.' };
          updateUnitPlan(index, {
            areaRange: {
              ...currentAreaRange,
              unit: e.target.value,
            },
          });
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
        disabled={disabled}
      >
        <option value="Sq. Ft.">Sq. Ft.</option>
        <option value="Marla">Marla</option>
        <option value="Sq. M.">Sq. M.</option>
        <option value="Kanal">Kanal</option>
      </select>
    </div>
  </div>

                  {/* Area Conversions */}
{unit.areaRange && unit.areaRange.min > 0 && unit.areaRange.max > 0 && (
  <div className="mt-2 p-3 bg-gray-100 rounded-xl text-xs text-gray-600">
    <p className="font-medium mb-1">Area Conversions:</p>
    <div className="grid grid-cols-4 gap-2">
      <span>
        Sq.Ft: {unit.areaRange.min} - {unit.areaRange.max}
      </span>
      <span>
        Marla: {convertArea(unit.areaRange.min, 'marla')} -{' '}
        {convertArea(unit.areaRange.max, 'marla')}
      </span>
      <span>
        Sq.M: {convertArea(unit.areaRange.min, 'sqm')} -{' '}
        {convertArea(unit.areaRange.max, 'sqm')}
      </span>
      <span>
        Kanal: {convertArea(unit.areaRange.min, 'kanal')} -{' '}
        {convertArea(unit.areaRange.max, 'kanal')}
      </span>
    </div>
  </div>
)}
                </div>

                {/* Bedrooms & Bathrooms (For Residential) */}
                {unit.category === 'residential' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Bed className="w-4 h-4 inline mr-1" />
                        Bedrooms
                      </label>
                      <input
                        type="number"
                        value={unit.bedrooms || ''}
                        onChange={(e) =>
                          updateUnitPlan(index, { bedrooms: Number(e.target.value) })
                        }
                        min="0"
                        max="10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Bath className="w-4 h-4 inline mr-1" />
                        Bathrooms
                      </label>
                      <input
                        type="number"
                        value={unit.bathrooms || ''}
                        onChange={(e) =>
                          updateUnitPlan(index, { bathrooms: Number(e.target.value) })
                        }
                        min="0"
                        max="10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Units
                      </label>
                      <input
                        type="number"
                        value={unit.totalUnits || ''}
                        onChange={(e) =>
                          updateUnitPlan(index, { totalUnits: Number(e.target.value) })
                        }
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Units
                      </label>
                      <input
                        type="number"
                        value={unit.availableUnits || ''}
                        onChange={(e) =>
                          updateUnitPlan(index, { availableUnits: Number(e.target.value) })
                        }
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                )}

                {/* Unit Counts (For Commercial) */}
                {unit.category === 'commercial' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Units
                      </label>
                      <input
                        type="number"
                        value={unit.totalUnits || ''}
                        onChange={(e) =>
                          updateUnitPlan(index, { totalUnits: Number(e.target.value) })
                        }
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Units
                      </label>
                      <input
                        type="number"
                        value={unit.availableUnits || ''}
                        onChange={(e) =>
                          updateUnitPlan(index, { availableUnits: Number(e.target.value) })
                        }
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                )}

                {/* Features */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features & Highlights
                  </label>

                  {/* Selected Features */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(unit.features || []).map((feature) => (
                      <span
                        key={feature}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#029bba]/10 text-[#029bba] rounded-full text-sm"
                      >
                        {feature}
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => removeFeature(index, feature)}
                            className="hover:text-[#004063]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Quick Add Features */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {COMMON_FEATURES.filter(
                      (f) => !(unit.features || []).includes(f)
                    )
                      .slice(0, 8)
                      .map((feature) => (
                        <button
                          key={feature}
                          type="button"
                          onClick={() => addFeature(index, feature)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                          disabled={disabled}
                        >
                          + {feature}
                        </button>
                      ))}
                  </div>

                  {/* Custom Feature Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFeature[index] || ''}
                      onChange={(e) =>
                        setNewFeature({ ...newFeature, [index]: e.target.value })
                      }
                      placeholder="Add custom feature..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none text-sm"
                      disabled={disabled}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFeature(index, newFeature[index] || '');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addFeature(index, newFeature[index] || '')}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
                      disabled={disabled}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={unit.description || ''}
                    onChange={(e) =>
                      updateUnitPlan(index, { description: e.target.value })
                    }
                    placeholder="Describe this unit type..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none resize-none"
                    disabled={disabled}
                  />
                </div>

                {/* Media Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Media & Floor Plans
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Layout Image */}
                    <FileUploader
                      label="Layout / Floor Plan Image"
                      accept="image"
                      folder={`projects/${projectSlug}/unit-plans`}
                      value={
                        unit.layoutImageUrl && unit.layoutImagePublicId
                          ? {
                              url: unit.layoutImageUrl,
                              publicId: unit.layoutImagePublicId,
                            }
                          : null
                      }
                      onChange={(file) =>
                        updateUnitPlan(index, {
                          layoutImageUrl: file?.url || '',
                          layoutImagePublicId: file?.publicId || '',
                        })
                      }
                      helpText="Main floor plan layout image"
                      disabled={disabled}
                    />

                    {/* Floor Plan PDF */}
                    <FileUploader
                      label="Floor Plan PDF"
                      accept="pdf"
                      folder={`projects/${projectSlug}/unit-plans`}
                      value={
                        unit.floorPlanPdfUrl && unit.floorPlanPdfPublicId
                          ? {
                              url: unit.floorPlanPdfUrl,
                              publicId: unit.floorPlanPdfPublicId,
                            }
                          : null
                      }
                      onChange={(file) =>
                        updateUnitPlan(index, {
                          floorPlanPdfUrl: file?.url || '',
                          floorPlanPdfPublicId: file?.publicId || '',
                        })
                      }
                      helpText="Detailed PDF floor plan"
                      disabled={disabled}
                    />
                  </div>

                  {/* Walkthrough Video URL */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Video className="w-4 h-4 inline mr-1" />
                      3D Walkthrough Video URL
                    </label>
                    <input
                      type="url"
                      value={unit.walkthroughVideoUrl || ''}
                      onChange={(e) =>
                        updateUnitPlan(index, {
                          walkthroughVideoUrl: e.target.value,
                        })
                      }
                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                      disabled={disabled}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste YouTube or Vimeo video URL
                    </p>
                  </div>

                  {/* Interior Images */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interior Images
                    </label>

                    {/* Existing Interior Images */}
                    {(unit.interiorImages || []).length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {(unit.interiorImages || []).map((img, imgIndex) => (
                          <div key={imgIndex} className="relative group">
                            <img
                              src={img.url}
                              alt={`Interior ${imgIndex + 1}`}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                            {!disabled && (
                              <button
                                type="button"
                                onClick={() => removeInteriorImage(index, imgIndex)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Interior Image */}
                    <FileUploader
                      label=""
                      accept="image"
                      folder={`projects/${projectSlug}/unit-interiors`}
                      value={null}
                      onChange={(file) => {
                        if (file) {
                          addInteriorImage(index, file);
                        }
                      }}
                      helpText="Add interior view images (multiple allowed)"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Unit Button */}
        {unitPlans.length > 0 && !disabled && (
          <button
            type="button"
            onClick={addUnitPlan}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#029bba] hover:text-[#029bba] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Another Unit Type
          </button>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Unit types:{' '}
            <span className="font-medium text-gray-700">{unitPlans.length}</span>
          </span>
          <span className="text-gray-400">
            {unitPlans.filter((u) => u.category === 'residential').length} Residential •{' '}
            {unitPlans.filter((u) => u.category === 'commercial').length} Commercial
          </span>
        </div>
      </div>
    </div>
  );
}
