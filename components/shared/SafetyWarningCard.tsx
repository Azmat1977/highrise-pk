// components/shared/SafetyWarningCard.tsx
import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface SafetyWarningCardProps {
  onReport: () => void;
}

export default function SafetyWarningCard({ onReport }: SafetyWarningCardProps) {
  return (
    <div className="bg-[#fffdf0] rounded-2xl shadow-sm border border-[#fef08a] p-6">
      <h3 className="font-black text-yellow-800 flex items-center gap-2 mb-2 text-base">
        <ShieldAlert className="w-5 h-5 text-yellow-600" />
        Safety First
      </h3>
      <p className="text-xs font-medium text-yellow-700 leading-relaxed mb-5">
        Always visit the property before making any payment. Verify all documents independently. Verification on Highrise.pk does not constitute a legal guarantee.
      </p>
      <button
        type="button"
        onClick={onReport}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-yellow-200 text-yellow-700 text-sm font-bold hover:bg-yellow-50 transition-colors shadow-sm"
      >
        <AlertTriangle className="w-4 h-4" /> Report This Listing
      </button>
    </div>
  );
}