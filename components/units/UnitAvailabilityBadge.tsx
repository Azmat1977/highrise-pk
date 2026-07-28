// components/units/UnitAvailabilityBadge.tsx
import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Pause,
  Ban,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

export type UnitStatus =
  | 'available'
  | 'reserved'
  | 'sold'
  | 'on_hold'
  | 'cancelled';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';
export type BadgeVariant = 'full' | 'pill' | 'dot' | 'minimal' | 'outline';

interface UnitAvailabilityBadgeProps {
  status:     UnitStatus;
  size?:      BadgeSize;
  variant?:   BadgeVariant;
  showIcon?:  boolean;
  animate?:   boolean;
  className?: string;
}

// ════════════════════════════════════════════════════
// STATUS CONFIG
// ════════════════════════════════════════════════════

interface StatusConfig {
  label:       string;
  urduLabel:   string;
  icon:        React.ReactElement;
  dotColor:    string;
  bgColor:     string;
  textColor:   string;
  borderColor: string;
  ringColor:   string;
  pulse:       boolean;
}

const STATUS_CONFIG: Record<UnitStatus, StatusConfig> = {
  available: {
    label:       'Available',
    urduLabel:   'Dastiyaab',
    icon:        <CheckCircle2 className="w-full h-full" />,
    dotColor:    'bg-emerald-500',
    bgColor:     'bg-emerald-50',
    textColor:   'text-emerald-700',
    borderColor: 'border-emerald-200',
    ringColor:   'ring-emerald-500/20',
    pulse:       false,
  },
  reserved: {
    label:       'Reserved',
    urduLabel:   'Reserved',
    icon:        <Clock className="w-full h-full" />,
    dotColor:    'bg-amber-500',
    bgColor:     'bg-amber-50',
    textColor:   'text-amber-700',
    borderColor: 'border-amber-200',
    ringColor:   'ring-amber-500/20',
    pulse:       true,
  },
  sold: {
    label:       'Sold',
    urduLabel:   'Bik Gaya',
    icon:        <XCircle className="w-full h-full" />,
    dotColor:    'bg-red-500',
    bgColor:     'bg-red-50',
    textColor:   'text-red-700',
    borderColor: 'border-red-200',
    ringColor:   'ring-red-500/20',
    pulse:       false,
  },
  on_hold: {
    label:       'On Hold',
    urduLabel:   'Ruka Hua',
    icon:        <Pause className="w-full h-full" />,
    dotColor:    'bg-gray-500',
    bgColor:     'bg-gray-100',
    textColor:   'text-gray-600',
    borderColor: 'border-gray-300',
    ringColor:   'ring-gray-500/20',
    pulse:       false,
  },
  cancelled: {
    label:       'Cancelled',
    urduLabel:   'Mansookh',
    icon:        <Ban className="w-full h-full" />,
    dotColor:    'bg-gray-400',
    bgColor:     'bg-gray-50',
    textColor:   'text-gray-400',
    borderColor: 'border-gray-200',
    ringColor:   'ring-gray-400/20',
    pulse:       false,
  },
};

// ════════════════════════════════════════════════════
// SIZE CONFIG
// ════════════════════════════════════════════════════

const SIZE_CONFIG: Record<BadgeSize, {
  dot:       string;
  icon:      string;
  text:      string;
  padding:   string;
  gap:       string;
  dotOuter:  string;
}> = {
  xs: {
    dot:      'w-2 h-2',
    icon:     'w-2.5 h-2.5',
    text:     'text-[9px]',
    padding:  'px-1.5 py-0.5',
    gap:      'gap-1',
    dotOuter: 'w-4 h-4',
  },
  sm: {
    dot:      'w-2.5 h-2.5',
    icon:     'w-3 h-3',
    text:     'text-[10px]',
    padding:  'px-2 py-0.5',
    gap:      'gap-1',
    dotOuter: 'w-5 h-5',
  },
  md: {
    dot:      'w-3 h-3',
    icon:     'w-3.5 h-3.5',
    text:     'text-xs',
    padding:  'px-2.5 py-1',
    gap:      'gap-1.5',
    dotOuter: 'w-6 h-6',
  },
  lg: {
    dot:      'w-3.5 h-3.5',
    icon:     'w-4 h-4',
    text:     'text-sm',
    padding:  'px-3 py-1.5',
    gap:      'gap-2',
    dotOuter: 'w-7 h-7',
  },
};

// ════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════

export default function UnitAvailabilityBadge({
  status,
  size      = 'md',
  variant   = 'pill',
  showIcon  = true,
  animate   = true,
  className = '',
}: UnitAvailabilityBadgeProps): React.ReactElement {
  const config = STATUS_CONFIG[status];
  const sizes  = SIZE_CONFIG[size];

  if (!config) return <></>;

  const shouldPulse = animate && config.pulse;

  // ── Dot variant ──────────────────────────────────
  if (variant === 'dot') {
    return (
      <div
        className={`inline-flex items-center ${sizes.gap} ${className}`}
        title={config.label}
      >
        <div className="relative">
          <div className={`${sizes.dot} rounded-full ${config.dotColor}`} />
          {shouldPulse && (
            <div
              className={`absolute inset-0 ${sizes.dot} rounded-full
                          ${config.dotColor} animate-ping opacity-40`}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Minimal variant ──────────────────────────────
  if (variant === 'minimal') {
    return (
      <div
        className={`inline-flex items-center ${sizes.gap} ${className}`}
        title={config.label}
      >
        <div className="relative">
          <div className={`${sizes.dot} rounded-full ${config.dotColor}`} />
          {shouldPulse && (
            <div
              className={`absolute inset-0 ${sizes.dot} rounded-full
                          ${config.dotColor} animate-ping opacity-40`}
            />
          )}
        </div>
        <span className={`${sizes.text} font-semibold ${config.textColor}`}>
          {config.label}
        </span>
      </div>
    );
  }

  // ── Outline variant ──────────────────────────────
  if (variant === 'outline') {
    return (
      <span
        className={`
          inline-flex items-center ${sizes.gap} ${sizes.padding}
          rounded-full border-2 ${config.borderColor} bg-white
          ${sizes.text} font-bold ${config.textColor}
          ${className}
        `}
      >
        {showIcon && (
          <span className={sizes.icon}>{config.icon}</span>
        )}
        {config.label}
      </span>
    );
  }

  // ── Full variant ─────────────────────────────────
  if (variant === 'full') {
    return (
      <div
        className={`
          inline-flex items-center ${sizes.gap} ${sizes.padding}
          rounded-xl border ${config.borderColor} ${config.bgColor}
          ${sizes.text} font-bold ${config.textColor}
          ${shouldPulse ? `ring-2 ${config.ringColor}` : ''}
          ${className}
        `}
      >
        {showIcon && (
          <span className={sizes.icon}>{config.icon}</span>
        )}
        <span>{config.label}</span>
        {shouldPulse && (
          <span className="relative flex h-2 w-2 ml-0.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full
                          rounded-full ${config.dotColor} opacity-75`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`}
            />
          </span>
        )}
      </div>
    );
  }

  // ── Pill variant (default) ───────────────────────
  return (
    <span
      className={`
        inline-flex items-center ${sizes.gap} ${sizes.padding}
        rounded-full ${config.bgColor} ${config.textColor}
        ${sizes.text} font-bold
        ${shouldPulse ? `ring-2 ${config.ringColor}` : ''}
        ${className}
      `}
    >
      {showIcon && (
        <span className={sizes.icon}>{config.icon}</span>
      )}
      {config.label}
    </span>
  );
}

// ════════════════════════════════════════════════════
// STATUS LEGEND COMPONENT
// ════════════════════════════════════════════════════

interface StatusLegendProps {
  statuses?:  UnitStatus[];
  size?:      BadgeSize;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function UnitStatusLegend({
  statuses  = ['available', 'reserved', 'sold', 'on_hold'],
  size      = 'sm',
  direction = 'horizontal',
  className = '',
}: StatusLegendProps): React.ReactElement {
  const sizes = SIZE_CONFIG[size];

  return (
    <div
      className={`
        flex ${direction === 'vertical' ? 'flex-col' : 'flex-wrap items-center'}
        gap-3 ${className}
      `}
    >
      {statuses.map((status) => {
        const config = STATUS_CONFIG[status];
        if (!config) return null;

        return (
          <div
            key={status}
            className={`flex items-center ${sizes.gap}`}
          >
            <div className={`${sizes.dot} rounded-full ${config.dotColor}`} />
            <span className={`${sizes.text} font-medium text-gray-600`}>
              {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════
// STATUS SUMMARY COMPONENT
// ════════════════════════════════════════════════════

interface StatusSummaryProps {
  counts: Partial<Record<UnitStatus, number>>;
  total:  number;
  size?:  BadgeSize;
  className?: string;
}

export function UnitStatusSummary({
  counts,
  total,
  size      = 'sm',
  className = '',
}: StatusSummaryProps): React.ReactElement {
  const sizes = SIZE_CONFIG[size];

  if (total <= 0) {
    return (
      <p className={`${sizes.text} text-gray-400 ${className}`}>
        No units added yet
      </p>
    );
  }

  const entries = Object.entries(counts)
    .filter(([, count]) => (count ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0)) as Array<[UnitStatus, number]>;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {entries.map(([status, count]) => {
        const config = STATUS_CONFIG[status];
        if (!config) return null;

        const percentage = Math.round((count / total) * 100);

        return (
          <div
            key={status}
            className={`flex items-center ${sizes.gap} ${sizes.padding}
                        rounded-full ${config.bgColor} ${config.textColor}
                        ${sizes.text} font-semibold`}
          >
            <div className={`${sizes.dot} rounded-full ${config.dotColor}`} />
            <span>{count}</span>
            <span className="opacity-60">({percentage}%)</span>
          </div>
        );
      })}

      {/* Total */}
      <span className={`${sizes.text} text-gray-400 font-medium`}>
        of {total} total
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════
// STACKED BAR COMPONENT
// ════════════════════════════════════════════════════

interface StatusBarProps {
  counts:     Partial<Record<UnitStatus, number>>;
  total:      number;
  height?:    string;
  showLabels?: boolean;
  className?: string;
}

export function UnitStatusBar({
  counts,
  total,
  height     = 'h-2.5',
  showLabels = true,
  className  = '',
}: StatusBarProps): React.ReactElement {
  if (total <= 0) return <></>;

  const soldCount      = counts.sold ?? 0;
  const reservedCount  = counts.reserved ?? 0;
  const availableCount = counts.available ?? 0;
  const onHoldCount    = counts.on_hold ?? 0;

  const soldPct     = Math.round((soldCount / total) * 100);
  const reservedPct = Math.round((reservedCount / total) * 100);
  const availPct    = Math.round((availableCount / total) * 100);
  const holdPct     = Math.round((onHoldCount / total) * 100);

  const barColors: Record<string, string> = {
    sold:      'bg-red-400',
    reserved:  'bg-amber-400',
    available: 'bg-emerald-400',
    on_hold:   'bg-gray-400',
  };

  const segments = [
    { key: 'sold',      pct: soldPct,     count: soldCount },
    { key: 'reserved',  pct: reservedPct, count: reservedCount },
    { key: 'available', pct: availPct,    count: availableCount },
    { key: 'on_hold',   pct: holdPct,     count: onHoldCount },
  ].filter((s) => s.pct > 0);

  return (
    <div className={className}>
      {/* Bar */}
      <div className={`${height} rounded-full bg-gray-100 overflow-hidden flex`}>
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={`${height} ${barColors[seg.key]} transition-all duration-500`}
            style={{ width: `${seg.pct}%` }}
            title={`${STATUS_CONFIG[seg.key as UnitStatus]?.label}: ${seg.count} (${seg.pct}%)`}
          />
        ))}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex items-center gap-4 mt-2">
          {segments.map((seg) => {
            const config = STATUS_CONFIG[seg.key as UnitStatus];
            return (
              <div key={seg.key} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${barColors[seg.key]}`} />
                <span className="text-[10px] text-gray-500 font-medium">
                  {config?.label} ({seg.count})
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}