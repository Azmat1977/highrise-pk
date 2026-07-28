//C:\dev\highrise-pk\utils\cloudinaryTransform.ts
export function getOptimizedImageUrl(url: string, options?: {
  width?: number;
  height?: number;
  watermark?: boolean;
}) {
  if (!url) return "";

  try {
    const parts = url.split("/upload/");
    if (parts.length !== 2) return url;

    const base = parts[0] + "/upload/";
    const path = parts[1];

    const transformations = [];

    // Auto optimization
    transformations.push("f_auto,q_auto");

    // Resize if provided
    if (options?.width) {
      transformations.push(`w_${options.width}`);
    }
    if (options?.height) {
      transformations.push(`h_${options.height}`);
    }

    // Watermark
    if (options?.watermark) {
      transformations.push(
        "l_highrise_logo,o_40,w_0.18,fl_relative,g_south_east,x_20,y_20"
      );
    }

    return `${base}${transformations.join(",")}/${path}`;
  } catch {
    return url;
  }
}
