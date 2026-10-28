// components/developer/DeveloperBadge.tsx
import React from 'react';
import {
  Shield,
  Star,
  Award,
  Zap,
  Crown,
  Diamond,
  BadgeCheck,
  TrendingUp,
  Clock,
  Handshake,
  Building2,
  Sparkles,
} from 'lucide-react';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

export type DeveloperBadgeType =
  | 'startup'
  | 'emerging'
  | 'established'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'highrise_verified'
  | 'top_developer'
  | 'trusted_builder'
  | 'on_time_delivery'
  | 'premium_partner';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type BadgeVariant = 'full' | 'icon-only' | 'pill' | 'minimal';

interface DeveloperBadgeProps {
  badge:       DeveloperBadgeType;
  size?:       BadgeSize;
  variant?:    BadgeVariant;
  showTooltip?: boolean;
  className?:  string;
}

interface BadgeConfig {
  label:       string;
  description: string;
  criteria:    string;
  icon:        React.ReactElement;
  colors: {
    bg:         string;
    text:       string;
    border:     string;
    iconBg:     string;
    gradient:   string;
  };
}

// ════════════════════════════════════════════════════
// BADGE CONFIG
// ════════════════════════════════════════════════════

const BADGE_CONFIG: Record<DeveloperBadgeType, BadgeConfig> = {
  startup: {
    label:       'Startup',
    description: 'New developer on Highrise.pk',
    criteria:    'Newly registered developer',
    icon:        <Building2 className="w-full h-full" />,
    colors: {
      bg:       'bg-gray-100',
      text:     'text-gray-600',
      border:   'border-gray-200',
      iconBg:   'bg-gray-200',
      gradient: 'from-gray-400 to-gray-500',
    },
  },

  emerging: {
    label:       'Emerging',
    description: 'Growing developer with verified projects',
    criteria:    '1–2 verified completed projects',
    icon:        <TrendingUp className="w-full h-full" />,
    colors: {
      bg:       'bg-green-50',
      text:     'text-green-700',
      border:   'border-green-200',
      iconBg:   'bg-green-100',
      gradient: 'from-green-400 to-emerald-500',
    },
  },

  established: {
    label:       'Established',
    description: 'Proven track record in real estate',
    criteria:    '3–5 verified completed projects',
    icon:        <Shield className="w-full h-full" />,
    colors: {
      bg:       'bg-blue-50',
      text:     'text-blue-700',
      border:   'border-blue-200',
      iconBg:   'bg-blue-100',
      gradient: 'from-blue-400 to-blue-600',
    },
  },

  silver: {
    label:       'Silver',
    description: 'Experienced developer with strong portfolio',
    criteria:    '6–10 verified completed projects',
    icon:        <Award className="w-full h-full" />,
    colors: {
      bg:       'bg-slate-100',
      text:     'text-slate-600',
      border:   'border-slate-300',
      iconBg:   'bg-slate-200',
      gradient: 'from-slate-400 to-slate-600',
    },
  },

  gold: {
    label:       'Gold',
    description: 'Top-tier developer with excellent portfolio',
    criteria:    '11–20 verified completed projects',
    icon:        <Star className="w-full h-full" />,
    colors: {
      bg:       'bg-yellow-50',
      text:     'text-yellow-700',
      border:   'border-yellow-300',
      iconBg:   'bg-yellow-100',
      gradient: 'from-yellow-400 to-amber-500',
    },
  },

  platinum: {
    label:       'Platinum',
    description: 'Elite developer with extensive portfolio',
    criteria:    '21–50 verified completed projects',
    icon:        <Zap className="w-full h-full" />,
    colors: {
      bg:       'bg-purple-50',
      text:     'text-purple-700',
      border:   'border-purple-200',
      iconBg:   'bg-purple-100',
      gradient: 'from-purple-500 to-violet-600',
    },
  },

  diamond: {
    label:       'Diamond',
    description: 'Pakistan\'s most prolific developers',
    criteria:    '51+ verified completed projects',
    icon:        <Diamond className="w-full h-full" />,
    colors: {
      bg:       'bg-cyan-50',
      text:     'text-cyan-700',
      border:   'border-cyan-200',
      iconBg:   'bg-cyan-100',
      gradient: 'from-cyan-400 to-blue-500',
    },
  },

  highrise_verified: {
    label:       'Highrise Verified',
    description: 'Physically verified by Highrise.pk team',
    criteria:    'Site verification + 10+ projects + KYC verified',
    icon:        <BadgeCheck className="w-full h-full" />,
    colors: {
      bg:       'bg-teal-50',
      text:     'text-teal-700',
      border:   'border-teal-200',
      iconBg:   'bg-teal-100',
      gradient: 'from-[#029bba] to-[#004063]',
    },
  },

  top_developer: {
    label:       'Top Developer',
    description: 'Top 10% performer in their city',
    criteria:    'Monthly ranking — top 10% in city',
    icon:        <Crown className="w-full h-full" />,
    colors: {
      bg:       'bg-orange-50',
      text:     'text-orange-700',
      border:   'border-orange-200',
      iconBg:   'bg-orange-100',
      gradient: 'from-orange-400 to-red-500',
    },
  },

  trusted_builder: {
    label:       'Trusted Builder',
    description: 'Highly rated by verified buyers',
    criteria:    '4.5+ rating with 50+ verified reviews',
    icon:        <Handshake className="w-full h-full" />,
    colors: {
      bg:       'bg-emerald-50',
      text:     'text-emerald-700',
      border:   'border-emerald-200',
      iconBg:   'bg-emerald-100',
      gradient: 'from-emerald-400 to-green-600',
    },
  },

  on_time_delivery: {
    label:       'On-Time Delivery',
    description: 'Consistently delivers projects on schedule',
    criteria:    '90%+ on-time delivery rate',
    icon:        <Clock className="w-full h-full" />,
    colors: {
      bg:       'bg-indigo-50',
      text:     'text-indigo-700',
      border:   'border-indigo-200',
      iconBg:   'bg-indigo-100',
      gradient: 'from-indigo-400 to-indigo-600',
    },
  },

  premium_partner: {
    label:       'Premium Partner',
    description: 'Official Highrise.pk premium partner',
    criteria:    'Active premium partnership subscription',
    icon:        <Sparkles className="w-full h-full" />,
    colors: {
      bg:       'bg-pink-50',
      text:     'text-pink-700',
      border:   'border-pink-200',
      iconBg:   'bg-pink-100',
      gradient: 'from-pink-400 to-rose-500',
    },
  },
};

// ════════════════════════════════════════════════════
// SIZE CONFIG
// ════════════════════════════════════════════════════

const SIZE_CONFIG: Record<BadgeSize, {
  iconWrapper: string;
  icon:        string;
  text:        string;
  padding:     string;
  gap:         string;
  pill:        string;
}> = {
  xs: {
    iconWrapper: 'w-3.5 h-3.5',
    icon:        'w-2 h-2',
    text:        'text-[10px]',
    padding:     'px-1.5 py-0.5',
    gap:         'gap-1',
    pill:        'px-2 py-0.5 text-[10px]',
  },
  sm: {
    iconWrapper: 'w-4 h-4',
    icon:        'w-2.5 h-2.5',
    text:        'text-xs',
    padding:     'px-2 py-1',
    gap:         'gap-1.5',
    pill:        'px-2.5 py-0.5 text-xs',
  },
  md: {
    iconWrapper: 'w-5 h-5',
    icon:        'w-3 h-3',
    text:        'text-sm',
    padding:     'px-3 py-1.5',
    gap:         'gap-2',
    pill:        'px-3 py-1 text-sm',
  },
  lg: {
    iconWrapper: 'w-6 h-6',
    icon:        'w-3.5 h-3.5',
    text:        'text-base',
    padding:     'px-4 py-2',
    gap:         'gap-2.5',
    pill:        'px-4 py-1.5 text-base',
  },
  xl: {
    iconWrapper: 'w-8 h-8',
    icon:        'w-4 h-4',
    text:        'text-lg',
    padding:     'px-5 py-2.5',
    gap:         'gap-3',
    pill:        'px-5 py-2 text-lg',
  },
};

// ════════════════════════════════════════════════════
// TOOLTIP COMPONENT
// ════════════════════════════════════════════════════

function BadgeTooltip({
  config,
}: {
  config: BadgeConfig;
}): React.ReactElement {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                    w-52 bg-[#004063] text-white rounded-xl p-3 shadow-xl
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-200">
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2
                      border-4 border-transparent border-t-[#004063]" />

      <p className="font-bold text-sm mb-1">{config.label}</p>
      <p className="text-xs text-blue-200 mb-2">{config.description}</p>
      <div className="border-t border-blue-700 pt-2">
        <p className="text-[10px] text-blue-300 font-semibold uppercase tracking-wide mb-0.5">
          Criteria
        </p>
        <p className="text-xs text-blue-100">{config.criteria}</p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════

export default function DeveloperBadge({
  badge,
  size        = 'md',
  variant     = 'full',
  showTooltip = true,
  className   = '',
}: DeveloperBadgeProps): React.ReactElement {
  const config = BADGE_CONFIG[badge];
  const sizes  = SIZE_CONFIG[size];

  if (!config) {
    return <></>;
  }

  // ── Icon Only ──────────────────────────────────────
  if (variant === 'icon-only') {
    return (
      <div className={`relative group inline-flex ${className}`}>
        <div
          className={`
            ${sizes.iconWrapper}
            rounded-full bg-gradient-to-br ${config.colors.gradient}
            flex items-center justify-center text-white
            shadow-sm flex-shrink-0
          `}
          aria-label={config.label}
        >
          <div className={sizes.icon}>
            {config.icon}
          </div>
        </div>
        {showTooltip && <BadgeTooltip config={config} />}
      </div>
    );
  }

  // ── Pill ──────────────────────────────────────────
  if (variant === 'pill') {
    return (
      <div className={`relative group inline-flex ${className}`}>
        <span
          className={`
            inline-flex items-center ${sizes.gap} ${sizes.pill}
            rounded-full font-semibold
            ${config.colors.bg} ${config.colors.text} ${config.colors.border}
            border
          `}
        >
          <span
            className={`
              ${sizes.iconWrapper} rounded-full
              bg-gradient-to-br ${config.colors.gradient}
              flex items-center justify-center text-white flex-shrink-0
            `}
          >
            <div className={sizes.icon}>
              {config.icon}
            </div>
          </span>
          {config.label}
        </span>
        {showTooltip && <BadgeTooltip config={config} />}
      </div>
    );
  }

  // ── Minimal ───────────────────────────────────────
  if (variant === 'minimal') {
    return (
      <div className={`relative group inline-flex ${className}`}>
        <span
          className={`
            inline-flex items-center ${sizes.gap}
            ${sizes.text} font-semibold ${config.colors.text}
          `}
        >
          <span
            className={`
              ${sizes.iconWrapper}
              bg-gradient-to-br ${config.colors.gradient}
              rounded-full flex items-center justify-center
              text-white flex-shrink-0
            `}
          >
            <div className={sizes.icon}>
              {config.icon}
            </div>
          </span>
          {config.label}
        </span>
        {showTooltip && <BadgeTooltip config={config} />}
      </div>
    );
  }

  // ── Full (default) ────────────────────────────────
  return (
    <div className={`relative group inline-flex ${className}`}>
      <div
        className={`
          inline-flex items-center ${sizes.gap} ${sizes.padding}
          rounded-xl border font-semibold
          ${config.colors.bg} ${config.colors.text} ${config.colors.border}
          transition-all duration-200 hover:shadow-md
        `}
      >
        {/* Icon */}
        <span
          className={`
            ${sizes.iconWrapper} rounded-lg
            bg-gradient-to-br ${config.colors.gradient}
            flex items-center justify-center text-white flex-shrink-0
          `}
        >
          <div className={sizes.icon}>
            {config.icon}
          </div>
        </span>

        {/* Label */}
        <span className={sizes.text}>{config.label}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && <BadgeTooltip config={config} />}
    </div>
  );
}

// ════════════════════════════════════════════════════
// BADGE LIST COMPONENT
// ════════════════════════════════════════════════════

interface DeveloperBadgeListProps {
  badges:      DeveloperBadgeType[];
  size?:       BadgeSize;
  variant?:    BadgeVariant;
  maxVisible?: number;
  className?:  string;
}

export function DeveloperBadgeList({
  badges,
  size        = 'sm',
  variant     = 'pill',
  maxVisible  = 3,
  className   = '',
}: DeveloperBadgeListProps): React.ReactElement {
  if (!badges || badges.length === 0) {
    return <></>;
  }

  const visible  = badges.slice(0, maxVisible);
  const overflow = badges.length - maxVisible;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {visible.map((badge) => (
        <DeveloperBadge
          key={badge}
          badge={badge}
          size={size}
          variant={variant}
        />
      ))}

      {overflow > 0 && (
        <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500
                         text-xs font-semibold border border-gray-200">
          +{overflow} more
        </span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// BADGE GRID COMPONENT (for profile pages)
// ════════════════════════════════════════════════════

interface DeveloperBadgeGridProps {
  badges:    DeveloperBadgeType[];
  className?: string;
}

export function DeveloperBadgeGrid({
  badges,
  className = '',
}: DeveloperBadgeGridProps): React.ReactElement {
  if (!badges || badges.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <Award className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No badges earned yet</p>
        <p className="text-xs text-gray-300 mt-1">
          Complete your profile and add verified projects to earn badges
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {badges.map((badge) => {
        const config = BADGE_CONFIG[badge];
        if (!config) return null;

        return (
          <div
            key={badge}
            className={`
              relative group p-3 rounded-xl border
              ${config.colors.bg} ${config.colors.border}
              hover:shadow-md transition-all duration-200
            `}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={`
                  w-10 h-10 rounded-xl flex-shrink-0
                  bg-gradient-to-br ${config.colors.gradient}
                  flex items-center justify-center text-white
                  shadow-sm
                `}
              >
                <div className="w-5 h-5">
                  {config.icon}
                </div>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className={`font-bold text-sm ${config.colors.text} leading-tight`}>
                  {config.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                  {config.description}
                </p>
              </div>
            </div>

            {/* Criteria tooltip on hover */}
            <div className="absolute bottom-full left-0 right-0 mb-1 z-50
                            bg-[#004063] text-white rounded-lg p-2.5 shadow-xl
                            opacity-0 group-hover:opacity-100 pointer-events-none
                            transition-opacity duration-200 text-xs">
              <p className="font-semibold mb-0.5">Criteria:</p>
              <p className="text-blue-200">{config.criteria}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════

export { BADGE_CONFIG };
export type { BadgeConfig };