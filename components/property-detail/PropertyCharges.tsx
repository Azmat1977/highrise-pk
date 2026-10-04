// File: components/property-detail/PropertyCharges.tsx
// Charges, taxes, and hidden fees disclosure card

import React from "react";
import { CircleDollarSign } from "lucide-react";
import { formatPrice } from "./propertyDetailUtils";
import { TrueCostBreakdown } from "@/components/property/TrueCostCard";

interface PropertyChargesProps {
  loading: boolean;
  error: string;
  breakdown: TrueCostBreakdown | null;
}

export default function PropertyCharges({
  loading,
  error,
  breakdown,
}: PropertyChargesProps): React.ReactElement {
  return (
    <div
      id="charges"
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <h2 className="text-lg font-semibold text-[#004063] mb-1 flex items-center gap-2">
        <CircleDollarSign className="w-5 h-5 text-[#029bba]" />
        Charges &amp; Taxes
      </h2>
      <p className="text-xs text-[#666666] mb-4">
        Estimates only — final amounts depend on society/government rules at
        time of transfer.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[56, 72, 64].map((w) => (
            <div
              key={w}
              className={`h-4 w-${w} bg-gray-100 rounded animate-shimmer`}
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-3 bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700 text-sm rounded-lg">
          Unable to load charges: {error}
        </div>
      ) : breakdown?.items?.length ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-[#333333]">
            Breakdown (PKR)
          </div>
          <div className="divide-y divide-gray-100">
            {breakdown.items
              .filter((it) => it?.amount && Number(it.amount) > 0)
              .map((it) => (
                <div
                  key={it.key}
                  className="px-4 py-3 flex items-start justify-between gap-4"
                >
                  <div>
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
                    PKR {formatPrice(Number(it.amount))}
                  </p>
                </div>
              ))}
            <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
              <p className="text-sm font-semibold text-[#333333]">
                Total Estimated
              </p>
              <p className="text-sm font-bold text-[#004063]">
                PKR {formatPrice(Number(breakdown.total))}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#666666]">
          No detailed charges provided for this listing.
        </p>
      )}
    </div>
  );
}