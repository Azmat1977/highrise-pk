// components/property/ListingTypeBadge.tsx
//
// Single source of truth for the "For Sale / For Rent / Installments" badge.
//
// Every page that shows a property card (home, properties list, property detail,
// similar listings, other listings) renders this exact component so the colors,
// sizes, and text are identical everywhere. If a color needs to change, change
// it here once.
//
// Color contract (kept stable across the product):
//   full_payment / sale / pre_launch  -> #029bba (Highrise teal)
//   rent                               -> #f59e0b (amber)
//   installment                        -> #7c3aed (violet)
//
// Size contract:
//   sm  -> px-2 py-0.5 text-[10px]   (card overlay badges)
//   md  -> px-2.5 py-1 text-[11px]   (detail page header)
//   lg  -> px-3 py-1.5 text-xs       (prominent header usage)

import React from 'react';
import { icons } from '@/lib/design-system/icons';

export type ListingTypeLike =
  | 'full_payment'
  | 'sale'
  | 'buy'
  | 'pre_launch'
  | 'rent'
  | 'rental'
  | 'installment'
  | 'installments'
  | string;

interface ListingTypeBadgeProps {
  listingType: ListingTypeLike | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function getListingTypeMeta(listingType: ListingTypeLike | null | undefined): {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  const p = String(listingType ?? '').toLowerCase().trim();

  if (p === 'rent' || p === 'rental') {
    return { label: 'For Rent', color: 'bg-[#f59e0b]', icon: icons.Tag };
  }
  if (p === 'installment' || p === 'installments') {
    return { label: 'Installments', color: 'bg-[#7c3aed]', icon: icons.TrendingUp };
  }
  // full_payment, sale, buy, pre_launch, or anything else → For Sale
  return { label: 'For Sale', color: 'bg-[#029bba]', icon: icons.Home };
}

export default function ListingTypeBadge({
  listingType,
  size = 'sm',
  className = '',
}: ListingTypeBadgeProps) {
  const meta = getListingTypeMeta(listingType);
  const Icon = meta.icon;

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
      className={`inline-flex items-center rounded-md ${meta.color} text-white font-semibold uppercase tracking-wider shadow-sm ${sizeClasses[size]} ${className}`}
    >
      <Icon className={iconSizes[size]} />
      {meta.label}
    </span>
  );
}