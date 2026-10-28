// File: components/property-detail/PropertyDescription.tsx
// Expandable rich-text description card

import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { sanitizeRichHtml } from "./propertyDetailUtils";

interface PropertyDescriptionProps {
  description?: string;
}

export default function PropertyDescription({
  description = "",
}: PropertyDescriptionProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = description.length > 300;

  return (
    <div
      id="description"
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3"
    >
      <h2 className="text-lg font-bold text-[#004063] flex items-center gap-2">
        <FileText className="w-5 h-5 text-[#029bba]" />
        Property Description
      </h2>

      <div className="relative">
        <div
          className={`prose prose-sm max-w-none text-gray-700 leading-relaxed transition-all duration-300 overflow-hidden ${
            !isExpanded ? "max-h-36" : "max-h-none"
          }`}
          dangerouslySetInnerHTML={{
            __html: sanitizeRichHtml(description),
          }}
        />
        {!isExpanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba] hover:text-[#004063] transition-colors pt-2"
        >
          <span>{isExpanded ? "Show Less" : "Read Full Description"}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}