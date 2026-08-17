//C:\dev\highrise-pk\lib\property\propertyDeletion.ts
import Favorite from "@/models/Favorite";
import RecentlyViewed from "@/models/RecentlyViewed";
import Comparison from "@/models/Comparison";
import PriceHistory from "@/models/PriceHistory";
import { PropertyHelpers } from "@/models/Property";
import { deleteFile, isHighrisePublicId } from "@/lib/cloudinary";
import { enqueuePropertyCleanup, type CloudinaryCleanupPayload } from "@/lib/property/propertyCleanupQueue";

export const OWNER_PROPERTY_PURGE_GRACE_DAYS = 30;
export const OWNER_PROPERTY_PURGE_GRACE_MS = OWNER_PROPERTY_PURGE_GRACE_DAYS * 86_400_000;

export function ownerPurgeEligibility(deletedAt?: Date | string | null, now = new Date()) {
  if (!deletedAt) return { eligible: false, remainingMs: OWNER_PROPERTY_PURGE_GRACE_MS, eligibleAt: null as Date | null };
  const deleted = new Date(deletedAt);
  if (Number.isNaN(deleted.getTime())) return { eligible: false, remainingMs: OWNER_PROPERTY_PURGE_GRACE_MS, eligibleAt: null as Date | null };
  const eligibleAt = new Date(deleted.getTime() + OWNER_PROPERTY_PURGE_GRACE_MS);
  const remainingMs = Math.max(0, eligibleAt.getTime() - now.getTime());
  return { eligible: remainingMs === 0, remainingMs, eligibleAt };
}

export type PropertyCleanupAsset = CloudinaryCleanupPayload;

function pushAsset(
  out: PropertyCleanupAsset[],
  publicId: unknown,
  resourceType: "image" | "raw" | "video" = "image",
  deliveryType: "upload" | "authenticated" | "private" = "upload",
) {
  const id = typeof publicId === "string" ? publicId.trim() : "";
  if (id && isHighrisePublicId(id)) out.push({ publicId: id, resourceType, deliveryType });
}

export function collectPropertyCleanupAssets(property: Record<string, unknown>): PropertyCleanupAsset[] {
  const assets: PropertyCleanupAsset[] = [];
  const images = Array.isArray(property.images) ? property.images : [];
  const gallery = Array.isArray(property.gallery) ? property.gallery : [];
  for (const image of [...images, ...gallery]) pushAsset(assets, (image as Record<string, unknown>)?.public_id, "image", "upload");
  pushAsset(assets, property.featureImagePublicId, "image", "upload");

  const floorPlans = Array.isArray(property.floorPlans) ? property.floorPlans : [];
  for (const floor of floorPlans) {
    const fp = floor as Record<string, unknown>;
    pushAsset(assets, fp.imagePublicId, "image", "upload");
    pushAsset(assets, fp.pdfPublicId, "raw", "upload");
  }

  const unitPlans = Array.isArray(property.unitPlans) ? property.unitPlans : [];
  for (const plan of unitPlans) {
    const up = plan as Record<string, unknown>;
    pushAsset(assets, up.layoutImagePublicId, "image", "upload");
    pushAsset(assets, up.pdfPublicId, "raw", "upload");
    for (const interior of Array.isArray(up.interiorImages) ? up.interiorImages : []) {
      pushAsset(assets, (interior as Record<string, unknown>).publicId, "image", "upload");
    }
  }

  pushAsset(assets, property.brochurePublicId, "raw", "upload");
  pushAsset(assets, property.priceListPublicId, "raw", "upload");
  pushAsset(assets, property.paymentPlanPublicId, "raw", "upload");

  const proof = property.ownershipProof as Record<string, unknown> | undefined;
  if (proof) {
    const privateRefs: Array<[unknown, unknown]> = [
      [proof.titleDeedPublicIdEncrypted, proof.titleDeedResourceType],
      [proof.authorityLetterPublicIdEncrypted, proof.authorityLetterResourceType],
      [proof.cnicCopyPublicIdEncrypted, proof.cnicCopyResourceType],
    ];
    for (const [encrypted, resource] of privateRefs) {
      if (typeof encrypted !== "string" || !encrypted) continue;
      try {
        const publicId = PropertyHelpers.decryptData(encrypted);
        pushAsset(assets, publicId, resource === "raw" ? "raw" : "image", "authenticated");
      } catch {
        // Corrupt historical references are not exposed; queue/audit caller can
        // still preserve deletion history without leaking ciphertext.
      }
    }
  }

  const seen = new Set<string>();
  return assets.filter((asset) => {
    const key = `${asset.resourceType}:${asset.deliveryType}:${asset.publicId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function cleanupPropertyDecisionState(propertyId: string) {
  const [favorites, recent, comparisons, priceHistory] = await Promise.all([
    Favorite.deleteMany({ entityType: "property", entityId: propertyId }),
    RecentlyViewed.deleteMany({ propertyId }),
    Comparison.updateMany(
      {},
      {
        $pull: {
          properties: propertyId,
          items: { entityType: "property", entityId: propertyId },
        },
      },
    ),
    PriceHistory.deleteMany({ propertyId }),
  ]);
  return { favorites, recent, comparisons, priceHistory };
}

export async function cleanupOrQueuePropertyAssets(propertyId: string, assets: PropertyCleanupAsset[]) {
  let cleaned = 0;
  let queued = 0;
  for (const asset of assets) {
    const result = await deleteFile(asset.publicId, {
      resourceType: asset.resourceType,
      deliveryType: asset.deliveryType,
    });
    if (result.success) cleaned += 1;
    else {
      await enqueuePropertyCleanup(propertyId, "cloudinary", asset);
      queued += 1;
    }
  }
  return { attempted: assets.length, cleaned, queued };
}
