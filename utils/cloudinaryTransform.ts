// File: utils/cloudinaryTransform.ts
// Enterprise-grade Cloudinary transformation & watermarking pipeline for Highrise.pk

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'scale' | 'thumb';
  gravity?: 'auto' | 'center' | 'south_east' | 'north';
  watermark?: boolean;        // default: true
  watermarkScale?: number;    // default: 0.15 (15% relative width)
  watermarkOpacity?: number;  // default: 40
  watermarkOffsetX?: number;  // default: 0.03 (3% relative padding)
  watermarkOffsetY?: number;  // default: 0.03 (3% relative padding)
}

/**
 * Universal Cloudinary URL Optimizer & Watermarker
 * Supports options as either a width number OR a CloudinaryTransformOptions object
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
      const opacity = opts.watermarkOpacity ?? 40;
      const scale = opts.watermarkScale ?? 0.15;
      const offsetX = opts.watermarkOffsetX ?? 0.03; // 3% relative padding
      const offsetY = opts.watermarkOffsetY ?? 0.03; // 3% relative padding

      watermarkSegment = `l_highrise_logo,o_${opacity},w_${scale},fl_relative,g_south_east,x_${offsetX},y_${offsetY}`;
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
    watermarkScale: 0.18,
    watermarkOffsetX: 0.04,
    watermarkOffsetY: 0.04,
  });
}