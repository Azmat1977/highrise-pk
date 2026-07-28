// components/property/property-filter.tsx

import React, { useState, ChangeEvent } from 'react';
import { Button } from '../ui/button';
import { Filter, RotateCcw, ChevronDown, Search } from 'lucide-react';
import { Card } from '../ui/card';

// ============================================
// Types
// ============================================

interface PropertyFiltersProps {
  onFilter: (filters: FilterState) => void;
  developers: string[];
  cities: string[];
}

interface FilterState {
  developer: string;
  city: string;
  minPrice: string;
  maxPrice: string;
  propertyType: string;
  areaUnit: string;
}

// ============================================
// Design System
// ============================================

const PRIMARY_COLOR = "#029bba";

// ============================================
// Custom Select Component
// ============================================

interface CustomSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
}) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full px-4 py-3 pr-10 rounded-xl border border-gray-300 
            bg-white text-sm text-gray-900 
            appearance-none cursor-pointer
            focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] 
            outline-none transition-all
            hover:border-gray-400
          "
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
};

// ============================================
// Custom Input Component
// ============================================

interface CustomInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  icon?: React.ReactNode;
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 rounded-xl border border-gray-300 
            bg-white text-sm text-gray-900 
            placeholder:text-gray-400
            focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] 
            outline-none transition-all
            hover:border-gray-400
            ${icon ? 'pl-10' : ''}
          `}
        />
      </div>
    </div>
  );
};

// ============================================
// Main PropertyFilters Component
// ============================================

export const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  onFilter,
  developers,
  cities,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    developer: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    propertyType: '',
    areaUnit: '',
  });

  const [isExpanded, setIsExpanded] = useState(true);

  const propertyTypes = [
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'plot', label: 'Plot' },
    { value: 'shop', label: 'Shop' },
    { value: 'office', label: 'Office' },
    { value: 'warehouse', label: 'Warehouse' },
  ];

  const areaUnits = [
    { value: 'sqft', label: 'Sq. Ft.' },
    { value: 'sqyard', label: 'Sq. Yards' },
    { value: 'marla', label: 'Marla' },
    { value: 'kanal', label: 'Kanal' },
  ];

  const handleFilterChange = (key: keyof FilterState, value: string): void => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleApplyFilters = (): void => {
    onFilter(filters);
  };

  const handleResetFilters = (): void => {
    const resetFilters: FilterState = {
      developer: '',
      city: '',
      minPrice: '',
      maxPrice: '',
      propertyType: '',
      areaUnit: '',
    };
    setFilters(resetFilters);
    onFilter(resetFilters);
  };

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-20">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
          >
            <Filter className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Filters</h3>
            {activeFiltersCount > 0 && (
              <p className="text-xs text-gray-500">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResetFilters();
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          />
        </div>
      </div>

      {/* Filters Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          
          {/* Property Type */}
          <CustomSelect
            label="Property Type"
            value={filters.propertyType}
            onChange={(value) => handleFilterChange('propertyType', value)}
            placeholder="All Types"
            options={propertyTypes}
          />

          {/* City */}
          <CustomSelect
            label="City"
            value={filters.city}
            onChange={(value) => handleFilterChange('city', value)}
            placeholder="All Cities"
            options={cities.map((c) => ({ value: c, label: c }))}
          />

          {/* Developer */}
          {developers.length > 0 && (
            <CustomSelect
              label="Developer"
              value={filters.developer}
              onChange={(value) => handleFilterChange('developer', value)}
              placeholder="All Developers"
              options={developers.map((d) => ({ value: d, label: d }))}
            />
          )}

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Price Range (PKR)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="Min"
                  className="
                    w-full px-3 py-2.5 rounded-xl border border-gray-300 
                    bg-white text-sm text-gray-900 
                    placeholder:text-gray-400
                    focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] 
                    outline-none transition-all
                    hover:border-gray-400
                  "
                />
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="Max"
                  className="
                    w-full px-3 py-2.5 rounded-xl border border-gray-300 
                    bg-white text-sm text-gray-900 
                    placeholder:text-gray-400
                    focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] 
                    outline-none transition-all
                    hover:border-gray-400
                  "
                />
              </div>
            </div>
          </div>

          {/* Area Unit */}
          <CustomSelect
            label="Area Unit"
            value={filters.areaUnit}
            onChange={(value) => handleFilterChange('areaUnit', value)}
            placeholder="All Units"
            options={areaUnits}
          />

          {/* Apply Button */}
          <button
            onClick={handleApplyFilters}
            className="
              w-full flex items-center justify-center gap-2 
              px-4 py-3 rounded-xl 
              text-white font-semibold text-sm
              shadow-lg transition-all
              hover:shadow-xl hover:scale-[1.02]
              active:scale-[0.98]
            "
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            <Search className="w-4 h-4" />
            Apply Filters
          </button>

          {/* Quick Reset Link */}
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyFilters;
