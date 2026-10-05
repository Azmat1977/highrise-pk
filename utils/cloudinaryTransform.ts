// File: utils/cloudinaryTransform.ts
// Enterprise-grade Cloudinary transformation & watermarking pipeline for Highrise.pk

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'scale' | 'thumb';
  gravity?: 'auto' | 'center' | 'south_east' | 'north';
  watermark?: boolean;        // default: true
  watermarkScale?: number;    // default: 0.16 (16% relative width)
  watermarkOpacity?: number;  // default: 85
  watermarkOffsetX?: number;  // default: 24 (exact px padding)
  watermarkOffsetY?: number;  // default: 24 (exact px padding)
}

/**
 * Universal Cloudinary URL Optimizer & Watermarker
 */
export function getOptimizedImageUrl(
  url: string,
  options?: number | CloudinaryTransformOptions
): string {
  if (!url) return "";

  // Return raw if not a Cloudinary upload URL
  if (!url.includes("cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  try {
    const parts = url.split("/upload/");
    if (parts.length !== 2) return url;

    const prefix = parts[0] + "/upload/";
    let path = parts[1];

    // Strip any existing inline transformations to prevent duplicated URL paths
    path = path.replace(/^(?:(?:[a-z]_[a-z0-9_.-]+,?)+|\/)+/i, "");
    if (path.startsWith("/")) path = path.slice(1);

    const opts: CloudinaryTransformOptions =
      typeof options === "number" ? { width: options } : options || {};

    const baseTransforms: string[] = ["f_auto", "q_auto"];

    const width = opts.width || 800;
    const height = opts.height;
    const crop = opts.crop || (height ? "fill" : undefined);
    const gravity = opts.gravity || "auto";

    if (crop) {
      baseTransforms.push(`c_${crop}`);
    }
    baseTransforms.push(`w_${width}`);
    if (height) {
      baseTransforms.push(`h_${height}`);
    }
    if (crop === "fill" || crop === "thumb") {
      baseTransforms.push(`g_${gravity}`);
    }

    // Build watermark overlay as a separate slash-separated Cloudinary component
    const showWatermark = opts.watermark !== false;
    let watermarkSegment = "";

    if (showWatermark) {
      const opacity = opts.watermarkOpacity ?? 75; // Optimal enterprise transparency
      
      // Calculate absolute pixels to avoid fl_relative calculation bugs
      const scaleRatio = opts.watermarkScale ?? (width <= 400 ? 0.24 : 0.16);
      const wmWidth = Math.round(width * scaleRatio);
      // Right padding slightly larger than bottom so logo never clips on object-cover crops
      const offsetX = opts.watermarkOffsetX ?? (width <= 400 ? 18 : 36);
      const offsetY = opts.watermarkOffsetY ?? (width <= 400 ? 14 : 28);

      // 1. e_replace_color:ffffff:90:003d5b -> High tolerance (90) turns dark navy text into solid pure white
      // 2. e_grayscale -> Turns the teal 3D spires into sleek grey
      // 3. Absolute pixels (w_XXX, x_24, y_24) guarantee zero truncation
      watermarkSegment = `l_highrise_logo,e_replace_color:ffffff:90:003d5b,e_grayscale,o_${opacity},w_${wmWidth},g_south_east,x_${offsetX},y_${offsetY}`;
    }

    const baseStr = baseTransforms.join(",");
    return watermarkSegment
      ? `${prefix}${baseStr}/${watermarkSegment}/${path}`
      : `${prefix}${baseStr}/${path}`;
  } catch {
    return url;
  }
}

/**
 * Standardized Thumbnail Helper
 */
export function getThumbnailUrl(url: string, width = 240, height = 160): string {
  return getOptimizedImageUrl(url, {
    width,
    height,
    crop: "fill",
    watermarkScale: 0.20,
    watermarkOffsetX: 12,
    watermarkOffsetY: 12,
  });
}