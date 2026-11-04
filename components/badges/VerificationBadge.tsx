import React from 'react';
import {
  BadgeCheck,
  Clock,
  AlertTriangle,
  Shield,
  X,
} from 'lucide-react';
import { getVerificationBadgeProps, type VerificationLevel } from '@/lib/verification-badges';

interface VerificationBadgeProps {
  level: VerificationLevel;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export default function VerificationBadge({
  level,
  size = 'sm',
  showTooltip = true,
  className = '',
}: VerificationBadgeProps) {
  const badge = getVerificationBadgeProps(level);
  const Icon = badge.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-[11px] gap-1.5',
    lg: 'px-3 py-1.5 text-xs gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full ${badge.color.bg} ${badge.color.text} ${sizeClasses[size]} font-bold uppercase tracking-wider border ${badge.color.border || ''} ${badge.pulse ? 'animate-pulse' : ''} ${className}`}
      title={showTooltip ? badge.tooltip : undefined}
    >
      <Icon className={iconSizes[size]} />
      {badge.label}
    </span>
  );
}

export function VerifiedBadge({ level }: { level: VerificationLevel }) {
  return <VerificationBadge level={level} size="sm" />;
}

export function UnverifiedBadge({ level }: { level: VerificationLevel }) {
  return <VerificationBadge level={level} size="sm" />;
}

export function VerificationStatusBadge({ level }: { level: VerificationLevel }) {
  return <VerificationBadge level={level} size="md" />;
}