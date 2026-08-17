// lib/privateAsset.ts
// Short-lived URLs for sensitive Cloudinary assets.
// Sensitive/KYC documents must never rely on a permanently public delivery URL.

import { getSignedUrl, isHighriseFolderPublicId } from '@/lib/cloudinary';

export interface PrivateAssetLike {
  url?: string | null;
  public_id?: string | null;
  publicId?: string | null;
  uploadedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  verifiedAt?: Date | string | null;
  verifiedBy?: unknown;
  issuer?: string | null;
  title?: string | null;

}

export interface PrivateAssetView {
  url: string;
  uploadedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  verifiedAt?: Date | string | null;
  issuer?: string | null;
  title?: string | null;
  legacyMigrationRequired?: boolean;
}

/**
 * Build a short-lived KYC document view.
 *
 * - New assets: publicId/public_id is stored and URL is regenerated with
 *   authenticated Cloudinary delivery on every authorized read.
 * - Legacy assets that only stored a permanent public URL are NOT returned to
 *   normal users by default. Admin callers may opt in temporarily so records
 *   remain reviewable while those assets are migrated in Cloudinary.
 */
export function toPrivateKycAssetView(
  asset: PrivateAssetLike | null | undefined,
  options?: { expiresInSeconds?: number; allowLegacyAdminUrl?: boolean },
): PrivateAssetView | undefined {
  if (!asset) return undefined;

  const publicId = String(asset.public_id ?? asset.publicId ?? '').trim();
  if (publicId && isHighriseFolderPublicId(publicId, 'kyc')) {
    return {
      url: getSignedUrl(publicId, options?.expiresInSeconds ?? 600),
      uploadedAt: asset.uploadedAt,
      expiresAt: asset.expiresAt,
      verifiedAt: asset.verifiedAt,
      issuer: asset.issuer,
      title: asset.title,
    };
  }

  // Temporary compatibility path for authorized admin review of historical
  // records. This does NOT make a legacy public asset private; it only avoids
  // breaking admin verification before the Cloudinary migration is executed.
  const legacyUrl = typeof asset.url === 'string' ? asset.url.trim() : '';
  if (legacyUrl && options?.allowLegacyAdminUrl) {
    return {
      url: legacyUrl,
      uploadedAt: asset.uploadedAt,
      expiresAt: asset.expiresAt,
      verifiedAt: asset.verifiedAt,
      issuer: asset.issuer,
      title: asset.title,
      legacyMigrationRequired: true,
    };
  }

  return undefined;
}
