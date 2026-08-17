//C:\dev\highrise-pk\lib\property\publicProperty.ts
import type { FilterQuery } from 'mongoose';
import type { IProperty } from '@/models/Property';

export const PUBLIC_PROPERTY_FILTER: FilterQuery<IProperty> = Object.freeze({
  'verification.status': 'verified',
  isDeleted: { $ne: true },
  isFlagged: { $ne: true },
});

export type PublicPropertyLike = {
  verification?: { status?: string | null } | null;
  isDeleted?: boolean | null;
  deletedAt?: Date | string | null;
  isFlagged?: boolean | null;
};

export function isPublicProperty(property: PublicPropertyLike | null | undefined): boolean {
  if (!property) return false;
  return property.verification?.status === 'verified' &&
    property.isDeleted !== true &&
    !property.deletedAt &&
    property.isFlagged !== true;
}

export function withPublicPropertyFilter<T extends Record<string, unknown>>(
  extra?: T,
): FilterQuery<IProperty> {
  if (!extra || Object.keys(extra).length === 0) return { ...PUBLIC_PROPERTY_FILTER };
  return { $and: [{ ...PUBLIC_PROPERTY_FILTER }, extra] } as FilterQuery<IProperty>;
}
