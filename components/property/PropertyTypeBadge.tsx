// components/property/PropertyTypeBadge.tsx
//
// Shared component for Property Type badges (House, Apartment, etc.)
// Ensures consistent styling across the application (Home, Search, Details).

import React from 'react';
import { Building, Home, Maximize } from 'lucide-react';

interface PropertyTypeBadgeProps {
  propertyType: string | null | undefined;
  className?: string;
}

export default function PropertyTypeBadge({ propertyType, className = '' }: PropertyTypeBadgeProps) {
  if (!propertyType) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 ${className}`}
    >
      <Home className="h-3.5 w-3.5 text-[#029bba]" />
      {propertyType}
    </span>
  );
}