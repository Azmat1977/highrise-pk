// File: components/property/TrueCostCard.tsx
// COMPLETE REPLACEMENT
// Enterprise: exports types for downstream consumers
// Removes shadcn Card/Button — uses native Tailwind only

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Receipt,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

// ─── Exported types (single source of truth) ─────────────────────────────────

// All 8 listing types from Property model
export type ListingType =
  | "full_payment"
  | "installment"
  | "rent"
  | "pre_launch"
  | "joint_venture"
  | "lease"
  | "auction"
  | "rent_to_own";

export interface TrueCostLineItem {
  key: string;
  label: string;
  amount: number;
  note?: string;
  category?: string;
}

export interface TrueCostBreakdown {
  listingType: ListingType;
  currency: "PKR";
  baseLabel: string;
  baseAmount: number;
  items: TrueCostLineItem[];
  subtotal: number;
  total: number;
  disclaimer: string;
}

export interface TrueCostCardProps {
  loading: boolean;
  error?: string;
  breakdown?: TrueCostBreakdown | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPkrAmount(amount: number): string {
  const n = typeof amount === "number" && isFinite(amount) ? amount : 0;
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(2)} Crore`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(2)} Lac`;
  return n.toLocaleString("en-PK");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrueCostCard({
  loading,
  error,
  breakdown,
}: TrueCostCardProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  const isRent = breakdown?.listingType === "rent";
  const isLease = breakdown?.listingType === "lease";
  const isRecurring = isRent || isLease;

  const headline = useMemo(() => {
    if (!breakdown) return "";
    const base = `PKR ${formatPkrAmount(breakdown.total)}`;
    if (isRecurring) return `${base} (incl. deposit + charges)`;
    return `${base} (estimated total)`;
  }, [breakdown, isRecurring]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#029bba]" />
            <h2 className="text-lg font-semibold text-[#004063]">
              True Cost Calculator
            </h2>
          </div>
          <p className="text-xs text-[#666666] mt-1">
            Trust-first estimate: shows likely payable charges (not just listing price).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          disabled={loading || !breakdown}
          className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-[#333333] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Details
            </>
          )}
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {loading ? (
        // Loading skeleton
        <div className="mt-4 space-y-2">
          <div className="h-4 w-48 bg-gray-100 rounded animate-shimmer" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-shimmer" />
          <div className="h-4 w-56 bg-gray-100 rounded animate-shimmer" />
        </div>
      ) : error ? (
        // Error banner (inline — no toast)
        <div className="mt-4 flex items-start gap-2 p-3 bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              Unable to load true cost
            </p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      ) : !breakdown ? (
        // No breakdown
        <div className="mt-4 flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#333333]">
              True cost not available
            </p>
            <p className="text-xs text-[#666666]">
              This listing may be missing charge fields.
            </p>
          </div>
        </div>
      ) : (
        // Loaded breakdown
        <>
          <div className="mt-4">
            <p className="text-2xl font-bold text-[#029bba]">{headline}</p>
            <p className="text-xs text-[#666666] mt-1">
              Base: <span className="font-medium text-[#333333]">{breakdown.baseLabel}</span> — PKR{" "}
              <span className="font-semibold text-[#333333]">
                {formatPkrAmount(breakdown.baseAmount)}
              </span>
            </p>
          </div>

          {expanded && (
            <div className="mt-4">
              {/* Breakdown table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-[#333333]">
                  Cost Breakdown (PKR)
                </div>

                <div className="divide-y divide-gray-100">
                  {breakdown.items.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[#666666]">
                      No extra charges provided for this listing.
                    </div>
                  ) : (
                    breakdown.items.map((it) => (
                      <div
                        key={it.key}
                        className="px-4 py-3 flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#333333]">
                            {it.label}
                          </p>
                          {it.note && (
                            <p className="text-xs text-[#666666] mt-0.5">
                              {it.note}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-[#333333] whitespace-nowrap">
                          PKR {formatPkrAmount(it.amount)}
                        </p>
                      </div>
                    ))
                  )}

                  {/* Subtotal (if different from total) */}
                  {breakdown.subtotal !== breakdown.total && (
                    <div className="px-4 py-3 flex items-center justify-between bg-gray-50/50">
                      <p className="text-sm font-medium text-[#666666]">
                        Subtotal
                      </p>
                      <p className="text-sm font-semibold text-[#333333]">
                        PKR {formatPkrAmount(breakdown.subtotal)}
                      </p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
                    <p className="text-sm font-semibold text-[#333333]">
                      Total Estimated
                    </p>
                    <p className="text-base font-bold text-[#004063]">
                      PKR {formatPkrAmount(breakdown.total)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mt-4 flex items-start gap-2 p-3 bg-[#eff6ff] border-l-4 border-[#029bba] rounded-lg">
                <ShieldCheck className="w-4 h-4 text-[#029bba] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#004063]">{breakdown.disclaimer}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}