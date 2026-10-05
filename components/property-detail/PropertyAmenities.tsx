// File: components/property-detail/PropertyAmenities.tsx
// Amenities and Features card with categorized icon chips from universal registry

import React from "react";
import { icons, amenityIcons, AmenityGroup } from "@/lib/design-system/icons";

interface PropertyAmenitiesProps {
  amenities?: string[];
}

export default function PropertyAmenities({
  amenities = [],
}: PropertyAmenitiesProps): React.ReactElement | null {
  if (!amenities.length) return null;

  const grouped: Record<
    AmenityGroup,
    { id: string; Icon: React.ComponentType<{ className?: string }>; label: string }[]
  > = {
    interior: [],
    exterior: [],
    building: [],
    society: [],
    security: [],
    other: [],
  };

  const humanize = (id: string) => {
    const s = id.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  amenities.forEach((id) => {
    const def = amenityIcons[id];
    if (def) {
      grouped[def.group].push({ id, Icon: def.icon, label: def.label });
    } else {
      grouped.other.push({ id, Icon: icons.CheckCircle, label: humanize(id) });
    }
  });

  const renderGroup = (key: AmenityGroup, title: string) => {
    const items = grouped[key];
    if (!items.length) return null;
    return (
      <div className="mb-4" key={key}>
        <h3 className="text-sm font-semibold text-[#333333] mb-2">{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {items.map((item) => (
            <div
              key={`${key}-${item.id}`}
              className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl"
            >
              <item.Icon className="w-4 h-4 text-[#029bba] flex-shrink-0" />
              <span className="text-xs text-[#333333]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      id="amenities"
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#004063] flex items-center gap-2">
          <icons.CheckCircle className="w-5 h-5 text-[#029bba]" />
          Amenities &amp; Features
        </h2>
        <span className="text-xs font-semibold text-gray-500">
          {amenities.length} {amenities.length === 1 ? 'Feature' : 'Features'}
        </span>
      </div>

      <div className="p-6">
        {renderGroup("interior", "Interior")}
        {renderGroup("exterior", "Exterior")}
        {renderGroup("building", "Building")}
        {renderGroup("society", "Society")}
        {renderGroup("security", "Security")}
        {renderGroup("other", "Other")}
      </div>
    </div>
  );
}