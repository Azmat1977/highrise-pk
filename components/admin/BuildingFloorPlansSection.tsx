// components/admin/BuildingFloorPlansSection.tsx

import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Info,
  Layers,
} from 'lucide-react';
import FileUploader from './FileUploader';

// Type for a single floor plan
export interface BuildingFloorPlan {
  floorName: string;
  floorNumber?: number;
  floorType?: 'parking' | 'commercial' | 'residential' | 'amenity' | 'rooftop' | 'mixed';
  imageUrl?: string;
  imagePublicId?: string;
  pdfUrl?: string;
  pdfPublicId?: string;
  description?: string;
  unitsOnFloor?: string[];
}

interface BuildingFloorPlansSectionProps {
  floorPlans: BuildingFloorPlan[];
  onChange: (floorPlans: BuildingFloorPlan[]) => void;
  projectSlug?: string;
  disabled?: boolean;
}

// Predefined floor names for quick selection
const COMMON_FLOOR_NAMES = [
  'Basement 2',
  'Basement 1',
  'Ground Floor',
  'Mezzanine',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
  '6th Floor',
  '7th Floor',
  '8th Floor',
  '9th Floor',
  '10th Floor',
  '11th to 15th Floor (Typical)',
  '16th to 20th Floor (Typical)',
  '21st to 25th Floor (Typical)',
  '26th to 30th Floor (Typical)',
  'Penthouse Floor',
  'Rooftop',
];

const FLOOR_TYPES = [
  { value: 'parking', label: '🅿️ Parking' },
  { value: 'commercial', label: '🏪 Commercial' },
  { value: 'residential', label: '🏠 Residential' },
  { value: 'amenity', label: '✨ Amenity' },
  { value: 'rooftop', label: '🌆 Rooftop' },
  { value: 'mixed', label: '🔀 Mixed Use' },
];

export default function BuildingFloorPlansSection({
  floorPlans,
  onChange,
  projectSlug = 'general',
  disabled = false,
}: BuildingFloorPlansSectionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Add new floor plan
  const addFloorPlan = () => {
    const newFloor: BuildingFloorPlan = {
      floorName: '',
      floorNumber: floorPlans.length,
      floorType: 'residential',
      description: '',
    };
    onChange([...floorPlans, newFloor]);
    setExpandedIndex(floorPlans.length); // Expand new floor
  };

  // Remove floor plan
  const removeFloorPlan = (index: number) => {
    const updated = floorPlans.filter((_, i) => i !== index);
    onChange(updated);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  // Update a specific floor plan
  const updateFloorPlan = (index: number, updates: Partial<BuildingFloorPlan>) => {
    const updated = floorPlans.map((floor, i) =>
      i === index ? { ...floor, ...updates } : floor
    );
    onChange(updated);
  };

  // Move floor up
  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...floorPlans];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
    setExpandedIndex(index - 1);
  };

  // Move floor down
  const moveDown = (index: number) => {
    if (index === floorPlans.length - 1) return;
    const updated = [...floorPlans];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
    setExpandedIndex(index + 1);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Building Floor Plans
              </h3>
              <p className="text-sm text-gray-500">
                Add floor plans for each level of the building
              </p>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={addFloorPlan}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Floor
            </button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      {floorPlans.length === 0 && (
        <div className="mx-6 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-3">
          <Layers className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-700">No floor plans added yet</p>
            <p className="mt-1">
              Click "Add Floor" to add floor plans for Ground Floor, 1st Floor, 2nd Floor, etc.
              You can upload an image or PDF for each floor.
            </p>
          </div>
        </div>
      )}

      {/* Floor Plans List */}
      <div className="p-6 space-y-4">
        {floorPlans.map((floor, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50"
          >
            {/* Floor Header (Clickable) */}
            <div
              onClick={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              className="px-4 py-3 bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-emerald-600">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {floor.floorName || `Floor ${index + 1}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {floor.floorType
                      ? FLOOR_TYPES.find((t) => t.value === floor.floorType)?.label
                      : 'No type selected'}
                    {(floor.imageUrl || floor.pdfUrl) && (
                      <span className="ml-2 text-emerald-600">
                        • {floor.imageUrl && floor.pdfUrl ? 'Image + PDF' : floor.imageUrl ? 'Image' : 'PDF'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Move Up/Down */}
                {!disabled && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveUp(index);
                      }}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveDown(index);
                      }}
                      disabled={index === floorPlans.length - 1}
                      className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>
                  </>
                )}

                {/* Delete */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFloorPlan(index);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-500"
                    title="Delete floor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Expand/Collapse Icon */}
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {/* Floor Details (Expandable) */}
            {expandedIndex === index && (
              <div className="px-4 py-4 border-t border-gray-200 space-y-4">
                {/* Floor Name & Type Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Floor Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Floor Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={floor.floorName}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '__custom__') {
                          updateFloorPlan(index, { floorName: '' });
                        } else {
                          updateFloorPlan(index, { floorName: value });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      disabled={disabled}
                    >
                      <option value="">Select floor name</option>
                      {COMMON_FLOOR_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      <option value="__custom__">-- Custom Name --</option>
                    </select>

                    {/* Custom Floor Name Input */}
                    {floor.floorName !== '' &&
                      !COMMON_FLOOR_NAMES.includes(floor.floorName) && (
                        <input
                          type="text"
                          value={floor.floorName}
                          onChange={(e) =>
                            updateFloorPlan(index, { floorName: e.target.value })
                          }
                          placeholder="Enter custom floor name"
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          disabled={disabled}
                        />
                      )}
                  </div>

                  {/* Floor Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Floor Type
                    </label>
                    <select
                      value={floor.floorType || ''}
                      onChange={(e) =>
                        updateFloorPlan(index, {
                          floorType: e.target.value as BuildingFloorPlan['floorType'],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      disabled={disabled}
                    >
                      <option value="">Select type</option>
                      {FLOOR_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={floor.description || ''}
                    onChange={(e) =>
                      updateFloorPlan(index, { description: e.target.value })
                    }
                    placeholder="E.g., Contains 4 apartments, lobby, and service area..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                    disabled={disabled}
                  />
                </div>

                {/* File Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Floor Plan Image */}
                  <FileUploader
                    label="Floor Plan Image"
                    accept="image"
                    folder={`projects/${projectSlug}/floor-plans`}
                    value={
                      floor.imageUrl && floor.imagePublicId
                        ? { url: floor.imageUrl, publicId: floor.imagePublicId }
                        : null
                    }
                    onChange={(file) =>
                      updateFloorPlan(index, {
                        imageUrl: file?.url || '',
                        imagePublicId: file?.publicId || '',
                      })
                    }
                    helpText="Upload floor plan image (JPG, PNG)"
                    disabled={disabled}
                  />

                  {/* Floor Plan PDF */}
                  <FileUploader
                    label="Floor Plan PDF"
                    accept="pdf"
                    folder={`projects/${projectSlug}/floor-plans`}
                    value={
                      floor.pdfUrl && floor.pdfPublicId
                        ? { url: floor.pdfUrl, publicId: floor.pdfPublicId }
                        : null
                    }
                    onChange={(file) =>
                      updateFloorPlan(index, {
                        pdfUrl: file?.url || '',
                        pdfPublicId: file?.publicId || '',
                      })
                    }
                    helpText="Upload detailed PDF (optional)"
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Floor Button (when list is not empty) */}
        {floorPlans.length > 0 && !disabled && (
          <button
            type="button"
            onClick={addFloorPlan}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Another Floor
          </button>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Total floors:{' '}
            <span className="font-medium text-gray-700">{floorPlans.length}</span>
          </span>
          <span className="text-gray-400">
            {floorPlans.filter((f) => f.imageUrl || f.pdfUrl).length} with media
          </span>
        </div>
      </div>
    </div>
  );
}
