import React from 'react';

export type StatusBadgeTone =
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'slate'
  | string;

export interface StatusBadgeProps {
  status?: string;
  tone?: StatusBadgeTone;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

const TONE_STYLES: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function StatusBadge({
  status,
  tone,
  icon,
  label,
  className = '',
}: StatusBadgeProps) {
  const effectiveTone = tone || status || 'neutral';
  const normalized = String(effectiveTone).toLowerCase();
  const style = TONE_STYLES[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const displayLabel = label || status || 'Unknown';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${style} ${className}`}
    >
      {icon}
      <span>{displayLabel}</span>
    </span>
  );
}