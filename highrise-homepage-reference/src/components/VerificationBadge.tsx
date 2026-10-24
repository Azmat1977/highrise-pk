import React from 'react';
import { ShieldCheck, Clock, FileText } from 'lucide-react';
import { PropertyVerificationStatus } from '../types/index.ts';

interface VerificationBadgeProps {
  status: PropertyVerificationStatus;
  label?: string;
  showTooltip?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  label,
  showTooltip = false,
}) => {
  if (status === 'verified-sample') {
    return (
      <span
        title={showTooltip ? 'Verified against sample title and layout criteria' : undefined}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#029bba]/10 text-[#007196] border border-[#029bba]/20"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-[#029bba]" />
        <span>{label || 'Sample Verified'}</span>
      </span>
    );
  }

  if (status === 'under-review') {
    return (
      <span
        title={showTooltip ? 'Title documents under review in sample database' : undefined}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
      >
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        <span>{label || 'Sample Under Review'}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
    >
      <FileText className="w-3.5 h-3.5 text-slate-400" />
      <span>{label || 'Sample Listing'}</span>
    </span>
  );
};
