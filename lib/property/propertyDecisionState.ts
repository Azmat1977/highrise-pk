// FILE: lib/property/propertyDecisionState.ts
// COMPLETE FILE REPLACEMENT

import type { FilterQuery } from 'mongoose';
import type { IProperty } from '@/models/Property';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';

export function publicDecisionPropertyFilter(
  extra: Record<string, unknown> = {},
): FilterQuery<IProperty> {
  return { ...PUBLIC_PROPERTY_FILTER, ...extra } as FilterQuery<IProperty>;
}

export function propertyDecisionProjection(): string {
  return '_id slug title price city society locality area unit images featureImageUrl propertyType propertySubtype listingType bedrooms bathrooms previousPrice priceDropPercent verification.status isDeleted isFlagged';
}

export function desiredFavoriteState(value: unknown): 'add' | 'remove' | null {
  return value === 'add' || value === true
    ? 'add'
    : value === 'remove' || value === false
      ? 'remove'
      : null;
}