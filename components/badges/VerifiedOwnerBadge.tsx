// components/badges/VerifiedOwnerBadge.tsx
// Highrise.pk — Verified Owner Badge Component
// V6.6.0 — 3 sizes, tooltip support, accessible
// Used on: property cards, property detail page,
//          owner dashboard, admin owner list

import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerifiedOwnerBadgeProps {
  /** sm: inline chip | md: standard | lg: celebration banner */
  size?: "sm" | "md" | "lg";
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Extra Tailwind classes on wrapper */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifiedOwnerBadge({
  size = "md",
  showTooltip = false,
  className = "",
}: VerifiedOwnerBadgeProps): React.ReactElement {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // ── Size variants ──────────────────────────────────────────────────────────

  if (size === "sm") {
    return (
      <span
        className={`relative inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full ${className}`}
        onMouseEnter={() => showTooltip && setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
        <span className="text-[10px] font-bold text-emerald-700 whitespace-nowrap">
          Verified Owner
        </span>

        {/* Tooltip */}
        {showTooltip && tooltipVisible && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
            <span className="block bg-gray-900 text-white text-[11px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
              Identity verified by Highrise.pk admin team
            </span>
            {/* Arrow */}
            <span className="block w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
          </span>
        )}
      </span>
    );
  }

  if (size === "lg") {
    return (
      <div
        className={`inline-flex items-center gap-3 px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl ${className}`}
        onMouseEnter={() => showTooltip && setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-black text-emerald-800 leading-tight">
            🛡️ Verified Owner
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-0.5">
            Identity confirmed by Highrise.pk
          </p>
        </div>
      </div>
    );
  }

  // ── Default: md ────────────────────────────────────────────────────────────
  return (
    <span
      className={`relative inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl ${className}`}
      onMouseEnter={() => showTooltip && setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
      <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">
        Verified Owner
      </span>

      {/* Tooltip */}
      {showTooltip && tooltipVisible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <span className="block bg-gray-900 text-white text-[11px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            Identity verified by Highrise.pk admin team
          </span>
          <span className="block w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}