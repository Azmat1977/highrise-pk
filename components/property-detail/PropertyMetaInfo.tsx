// File: components/property-detail/PropertyMetaInfo.tsx
// Listing metadata, views counter, and property ID badge

import React from "react";
import { Calendar, Eye } from "lucide-react";
import { formatDate } from "./propertyDetailUtils";

interface PropertyMetaInfoProps {
  createdAt: string;
  views: number;
  propertyId: string;
}

export default function PropertyMetaInfo({
  createdAt,
  views,
  propertyId,
}: PropertyMetaInfoProps): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#666666]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Listed: {formatDate(createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {views} views
          </span>
        </div>
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
          ID: {String(propertyId || "").slice(-8).toUpperCase()}
        </span>
      </div>
    </div>
  );
}