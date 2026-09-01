// lib/cloudinary.ts
// 🔒 ENTERPRISE CLOUDINARY SYSTEM — Highrise.pk
// Signed server-side uploads only. No direct browser uploads.
// Fixes: console.error removed, catch unknown, as any removed,
//        userId removed from Cloudinary tags (PII),
//        folder mapping added for /api/upload route

import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CLOUD_NAME  = process.env.CLOUDINARY_CLOUD_NAME  ?? '';
const API_KEY     = process.env.CLOUDINARY_API_KEY     ?? '';
const API_SECRET  = process.env.CLOUDINARY_API_SECRET  ?? '';

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key:    API_KEY,
  api_secret: API_SECRET,
  secure:     true,
});

export default cloudinary;

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const FILE_SIZE_LIMITS = {
  image:             5   * 1024 * 1024,
  propertyImage:     8   * 1024 * 1024,
  propertyFloorplan: 10  * 1024 * 1024,
  document:          10  * 1024 * 1024,
  video:             100 * 1024 * 1024,
  avatar:            2   * 1024 * 1024,
  kyc:               5   * 1024 * 1024,
} as const;

export const IMAGE_DIMENSION_LIMITS = {
  maxWidth:  4096,
  maxHeight: 4096,
  minWidth:  100,
  minHeight: 100,
} as const;

// ✅ No SVG — XSS risk (SVG can contain JavaScript)
export const ALLOWED_MIME_TYPES = {
  image:             ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
  propertyImage:     ['image/jpeg', 'image/png', 'image/webp'] as const,
  propertyFloorplan: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/tiff'] as const,
  document:          ['application/pdf'] as const,
  video:             ['video/mp4', 'video/webm'] as const,
  avatar:            ['image/jpeg', 'image/png', 'image/webp'] as const,
  kyc:               ['image/jpeg', 'image/png', 'application/pdf'] as const,
} as const;

export const ALLOWED_EXTENSIONS = {
  image:             ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const,
  propertyImage:     ['.jpg', '.jpeg', '.png', '.webp'] as const,
  propertyFloorplan: ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.tiff', '.tif'] as const,
  document:          ['.pdf'] as const,
  video:             ['.mp4', '.webm'] as const,
  avatar:            ['.jpg', '.jpeg', '.png', '.webp'] as const,
  kyc:               ['.jpg', '.jpeg', '.png', '.pdf'] as const,
} as const;

// ✅ Internal Cloudinary folder paths
export const FOLDERS = {
  properties: 'highrise-pk/properties',
  propertyFloorplans: 'highrise-pk/properties/floorplans',
  projects:       'highrise-pk/projects',
  projectDocuments: 'highrise-pk/projects/documents',
  projectFloorplans: 'highrise-pk/projects/floorplans',
  unitImages:     'highrise-pk/units/images',
  unitFloorplans: 'highrise-pk/units/floorplans',
  unitLayouts:    'highrise-pk/units/layouts',
  developers:     'highrise-pk/developers',
  agents:     'highrise-pk/agents',
  avatars:    'highrise-pk/avatars',
  kyc:        'highrise-pk/kyc',
  blog:       'highrise-pk/blog',
  trustedPartners: 'highrise-pk/admin/trusted-partners',
  cities:          'highrise-pk/admin/cities',
  heroBannersDesktop: 'highrise-pk/admin/hero-banners/desktop',
  heroBannersMobile:  'highrise-pk/admin/hero-banners/mobile',
  general:    'highrise-pk/general',
  // ⚠️ temp: internal use only — NOT in UPLOAD_FOLDER_MAP (intentional)
  // /api/upload never routes here. Used only by internal batch jobs.
  temp:       'highrise-pk/temp',
} as const;
// ✅ API upload route folder param → internal Cloudinary folder mapping
// /api/upload receives: folder = "profiles" | "properties" | "documents" | "projects"
export const UPLOAD_FOLDER_MAP: Record<string, keyof typeof FOLDERS> = {
  profiles:   'developers',
  properties: 'properties',
  'property-floorplans': 'propertyFloorplans',
  documents:  'kyc',
  projects:   'projects',
  'project-floorplans': 'projectFloorplans',
  agents:     'agents',
  blog:       'blog',
  'trusted-partners': 'trustedPartners',
  cities:             'cities',
  'hero-banners-desktop': 'heroBannersDesktop',
  'hero-banners-mobile':  'heroBannersMobile',
  general:    'general',
} as const;

export type FolderType    = keyof typeof FOLDERS;
export type FileCategory  = keyof typeof ALLOWED_MIME_TYPES;

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface UploadResult {
  success:    boolean;
  url?:       string;
  secureUrl?: string;
  publicId?:  string;
  format?:    string;
  width?:     number;
  height?:    number;
  size?:      number;
  resourceType?: 'image' | 'video' | 'raw';
  error?:     string;
}

export interface ValidationResult {
  valid:   boolean;
  error?:  string;
}

export interface SignedUploadParams {
  signature:    string;
  timestamp:    number;
  cloudName:    string;
  apiKey:       string;
  folder:       string;
  uploadPreset?: string;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 VALIDATION
// ═══════════════════════════════════════════════════════════════

export function validateMimeType(
  mimeType: string,
  category: FileCategory,
): ValidationResult {
  const allowed = ALLOWED_MIME_TYPES[category] as readonly string[];
  if (!allowed.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowed.join(', ')}`,
    };
  }
  return { valid: true };
}

export function validateExtension(
  filename: string,
  category: FileCategory,
): ValidationResult {
  const ext     = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const allowed = ALLOWED_EXTENSIONS[category] as readonly string[];
  if (!allowed.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${allowed.join(', ')}`,
    };
  }
  return { valid: true };
}

export function validateFileSize(
  size:     number,
  category: FileCategory,
): ValidationResult {
  const limit = FILE_SIZE_LIMITS[category] ?? FILE_SIZE_LIMITS.image;
  if (size === 0) return { valid: false, error: 'File is empty' };
  if (size > limit) {
    const limitMB = Math.round(limit / (1024 * 1024));
    return { valid: false, error: `File too large. Maximum: ${limitMB}MB` };
  }
  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  const name = filename.split(/[\\/]/).pop() ?? 'file';
  const sanitized = name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\./, '_')
    .slice(0, 100);
  return sanitized || `file_${Date.now()}`;
}

export function validateMagicBytes(
  buffer:           Buffer,
  expectedCategory: FileCategory,
): ValidationResult {
  if (buffer.length < 4) {
    return { valid: false, error: 'File too small to validate' };
  }

  const magicBytes = buffer.slice(0, 4).toString('hex').toUpperCase();

  const signatures: Record<string, string[]> = {
    jpeg: ['FFD8FFE0', 'FFD8FFE1', 'FFD8FFE2', 'FFD8FFE8', 'FFD8FFDB'],
    png:  ['89504E47'],
    gif:  ['47494638'],
    webp: ['52494646'],
    pdf:  ['25504446'],
    tiff: ['49492A00', '4D4D002A'], // II* (LE) + MM (BE) headers
    mp4:  ['00000018', '00000020', '66747970'],
  };

  const categorySignatures: Record<FileCategory, string[]> = {
    image:             [...signatures.jpeg, ...signatures.png, ...signatures.gif, ...signatures.webp],
    propertyImage:     [...signatures.jpeg, ...signatures.png, ...signatures.webp],
    propertyFloorplan: [...signatures.jpeg, ...signatures.png, ...signatures.webp, ...signatures.pdf, ...signatures.tiff],
    document:          [...signatures.pdf],
    video:             [...signatures.mp4],
    avatar:            [...signatures.jpeg, ...signatures.png, ...signatures.webp],
    kyc:               [...signatures.jpeg, ...signatures.png, ...signatures.pdf],
  };

  const allowed  = categorySignatures[expectedCategory] ?? [];
  const isValid  = allowed.some((sig) => magicBytes.startsWith(sig.slice(0, 8)));

  if (!isValid) {
    return { valid: false, error: 'File content does not match expected type' };
  }
  return { valid: true };
}

export function validateFile(
  file: { name: string; type: string; size: number; buffer?: Buffer },
  category: FileCategory,
): ValidationResult {
  const mimeResult = validateMimeType(file.type, category);
  if (!mimeResult.valid) return mimeResult;

  const extResult = validateExtension(file.name, category);
  if (!extResult.valid) return extResult;

  const sizeResult = validateFileSize(file.size, category);
  if (!sizeResult.valid) return sizeResult;

  if (file.buffer) {
    const magicResult = validateMagicBytes(file.buffer, category);
    if (!magicResult.valid) return magicResult;
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// 🔐 SIGNED UPLOAD PARAMS (for future client-side flows)
// ═══════════════════════════════════════════════════════════════

export function generateSignedUploadParams(
  folder:   FolderType,
  options?: { publicId?: string; tags?: string[]; transformation?: string },
): SignedUploadParams {
  if (!API_SECRET) throw new Error('Cloudinary API secret not configured');

  const timestamp  = Math.round(Date.now() / 1000);
  const folderPath = FOLDERS[folder];

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: folderPath,
  };

  if (options?.publicId)      paramsToSign.public_id      = options.publicId;
  if (options?.tags?.length)  paramsToSign.tags            = options.tags.join(',');
  if (options?.transformation) paramsToSign.transformation = options.transformation;

  const sortedParams = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(sortedParams + API_SECRET)
    .digest('hex');

  return {
    signature,
    timestamp,
    cloudName: CLOUD_NAME,
    apiKey:    API_KEY,
    folder:    folderPath,
  };
}

// ═══════════════════════════════════════════════════════════════
// 🔐 UPLOAD OPTIONS
// ═══════════════════════════════════════════════════════════════

// ✅ Transformation type — no as any
type CloudinaryTransformation = {
  width?: number;
  height?: number;
  crop?: string;
  gravity?: string;
  quality?: string;
  fetch_format?: string;
};

export function getUploadOptions(
  folder:   FolderType,
  options?: {
    publicId?: string;
    tags?:     string[];
  },
): UploadApiOptions {
  const folderPath = FOLDERS[folder];

  const tags: string[] = ['highrise-pk'];
  if (options?.tags) {
    tags.push(...options.tags.map((t) => t.slice(0, 50)));
  }

  const baseTransformation: CloudinaryTransformation[] = [
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ];

  const baseOptions: UploadApiOptions = {
    folder: folderPath,  // ← FIX: use full path, not folder key
    resource_type:    'auto',
    unique_filename:  true,
    overwrite:        false,
    invalidate:       true,
    // KYC must use an authenticated delivery type; public assets keep the default upload type.
    ...(['kyc', 'projectDocuments'].includes(folder) ? { type: 'authenticated' as const } : {}),
    exif:             false,
    colors:           false,
    faces:            false,
    image_metadata:   false,
    transformation:   baseTransformation,
    tags,
  };

  if (options?.publicId) {
    baseOptions.public_id = sanitizeFilename(options.publicId);
  }

  // Folder-specific transformations
  const propertyTransform: CloudinaryTransformation[] = [
    { width: 1200, height: 800, crop: 'fill', gravity: 'auto' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ];

  const avatarTransform: CloudinaryTransformation[] = [
    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ];

  const blogTransform: CloudinaryTransformation[] = [
    { width: 1200, height: 630, crop: 'fill', gravity: 'auto' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ];

  const trustedPartnerTransform: CloudinaryTransformation[] = [
    { width: 1200, height: 600, crop: 'limit' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ];

  const cityTransform: CloudinaryTransformation[] = [
    { width: 900, height: 1600, crop: 'fill', gravity: 'auto' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ];

  const heroDesktopTransform: CloudinaryTransformation[] = [
    { width: 1920, height: 1080, crop: 'fill', gravity: 'auto' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ];

  const heroMobileTransform: CloudinaryTransformation[] = [
    { width: 1080, height: 1920, crop: 'fill', gravity: 'auto' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ];

  switch (folder) {
    case 'properties':
    case 'projects':
      baseOptions.transformation = propertyTransform;
      break;
    case 'avatars':
    case 'developers':
    case 'agents':
      baseOptions.transformation = avatarTransform;
      break;
    case 'propertyFloorplans':
    case 'projectFloorplans':
      // Floor plans need full detail — no resize/crop transformations.
      baseOptions.transformation = [];
      break;
    case 'kyc':
    case 'projectDocuments':
      baseOptions.transformation = [];
      baseOptions.type           = 'authenticated';
      break;
    case 'blog':
      baseOptions.transformation = blogTransform;
      break;
    case 'trustedPartners':
      baseOptions.transformation = trustedPartnerTransform;
      break;
    case 'cities':
      baseOptions.transformation = cityTransform;
      break;
    case 'heroBannersDesktop':
      baseOptions.transformation = heroDesktopTransform;
      break;
    case 'heroBannersMobile':
      baseOptions.transformation = heroMobileTransform;
      break;
    default:
      break;
  }

  return baseOptions;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 UPLOAD FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export async function uploadBuffer(
  buffer:   Buffer,
  filename: string,
  folder:   FolderType,
  category: FileCategory,
  options?: { tags?: string[] },
): Promise<UploadResult> {
  try {
    const mimeType  = getMimeTypeFromExtension(filename);
    const validation = validateFile(
      { name: filename, type: mimeType, size: buffer.length, buffer },
      category,
    );
    if (!validation.valid) return { success: false, error: validation.error };

    const uploadOptions = getUploadOptions(folder, { tags: options?.tags });

    // PDFs upload as IMAGE resources (Cloudinary supports PDF as an image
    // format). This unlocks f_jpg,pg_1 page previews on delivery AND the
    // browser receives application/pdf (inline rendering) instead of
    // octet-stream (forced Save As). Image transformations are raster
    // crop/resize ops — strip them so multi-page documents stay intact.
    if (mimeType === 'application/pdf') {
      uploadOptions.resource_type = 'image';
      uploadOptions.transformation = [];
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, res) => {
          if (error) reject(error);
          else if (res) resolve(res);
          else reject(new Error('No result from Cloudinary'));
        },
      );
      stream.end(buffer);
    });

    return {
      success:   true,
      url:       result.url,
      secureUrl: result.secure_url,
      publicId:  result.public_id,
      format:    result.format,
      width:     result.width,
      height:    result.height,
      size:      result.bytes,
      resourceType: result.resource_type as 'image' | 'video' | 'raw',
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:   error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

export async function uploadFromUrl(
  url:      string,
  folder:   FolderType,
  options?: { tags?: string[]; publicId?: string },
): Promise<UploadResult> {
  try {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { success: false, error: 'Invalid URL' };
    }

    const uploadOptions = getUploadOptions(folder, options);
    const result        = await cloudinary.uploader.upload(url, uploadOptions);

    return {
      success:   true,
      url:       result.url,
      secureUrl: result.secure_url,
      publicId:  result.public_id,
      format:    result.format,
      width:     result.width,
      height:    result.height,
      size:      result.bytes,
      resourceType: result.resource_type as 'image' | 'video' | 'raw',
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:   error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// ⚠️ uploadFromPath() REMOVED — filesystem paths do not exist in serverless (Vercel).
// All uploads must use uploadBuffer() (server-side streaming from memory).
// Browser → POST /api/upload (multipart) → uploadBuffer() → Cloudinary → JSON publicId

// ═══════════════════════════════════════════════════════════════
// 🔐 DELETE
// ═══════════════════════════════════════════════════════════════

export async function deleteFile(
  publicId: string,
  options?: { resourceType?: 'image' | 'video' | 'raw'; deliveryType?: 'upload' | 'authenticated' | 'private' },
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!publicId || !/^[a-zA-Z0-9/_-]+$/.test(publicId)) {
      return { success: false, error: 'Invalid public ID' };
    }
    // ✅ Use isHighrisePublicId() — single source of truth for folder ownership
    // Prevents deletion of Cloudinary assets outside our managed folders
    // even if FOLDERS root path changes in the future
    if (!isHighrisePublicId(publicId)) {
      return { success: false, error: 'Cannot delete files outside Highrise managed folders' };
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: options?.resourceType ?? 'image',
      type:           options?.deliveryType ?? 'upload',
      invalidate:    true,
    });

    return result.result === 'ok' || result.result === 'not found'
      ? { success: true }
      : { success: false, error: result.result as string };

  } catch (error: unknown) {
    return {
      success: false,
      error:   error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

export async function deleteFiles(
  publicIds: string[],
  options?:  { resourceType?: 'image' | 'video' | 'raw' },
): Promise<{ success: boolean; deleted: number; errors: number }> {
  let deleted = 0;
  let errors  = 0;

  for (const publicId of publicIds) {
    const result = await deleteFile(publicId, options);
    result.success ? deleted++ : errors++;
  }

  return { success: errors === 0, deleted, errors };
}

// ═══════════════════════════════════════════════════════════════
// 🔐 URL GENERATION
// ═══════════════════════════════════════════════════════════════

export function getSecureUrl(
  publicId: string,
  options?: {
    width?:   number;
    height?:  number;
    crop?:    string;
    quality?: string;
    format?:  string;
  },
): string {
  const transformations: CloudinaryTransformation[] = [];

  if (options?.width ?? options?.height) {
    transformations.push({
      width:   options?.width,
      height:  options?.height,
      crop:    options?.crop ?? 'fill',
    });
  }

  transformations.push({
    quality:      options?.quality ?? 'auto:good',
    fetch_format: options?.format  ?? 'auto',
  });

  return cloudinary.url(publicId, {
    secure:         true,
    transformation: transformations,
  });
}

export function getSignedUrl(
  publicId:         string,
  expiresInSeconds: number = 3600,
  options?: { resourceType?: 'image' | 'video' | 'raw'; deliveryType?: 'authenticated' | 'private' },
): string {
  const timestamp = Math.round(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.url(publicId, {
    secure:     true,
    sign_url:   true,
    type:       options?.deliveryType ?? 'authenticated',
    resource_type: options?.resourceType ?? 'image',
    expires_at: timestamp,
  });
}

export function getThumbnailUrl(publicId: string, size = 200): string {
  return cloudinary.url(publicId, {
    secure:         true,
    transformation: [
      { width: size, height: size, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:low' },
      { fetch_format: 'auto' },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔐 UTILITY
// ═══════════════════════════════════════════════════════════════

export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const map: Record<string, string> = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.pdf':  'application/pdf',
    '.tiff': 'image/tiff',
    '.tif':  'image/tiff',
    '.mp4':  'video/mp4',
    '.webm': 'video/webm',
  };
  return map[ext] ?? 'application/octet-stream';
}

export function getResourceType(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'raw';
}

export function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}

// ═══════════════════════════════════════════════════════════════
// ℹ️ CLIENT-SAFE DOWNLOAD HELPERS
// Moved to lib/cloudinaryClient.ts to avoid importing the
// 'cloudinary' npm package (which uses Node.js `fs`) into
// client-side React components.
//
// Client components must import from:
//   import { downloadFile } from '@/lib/cloudinaryClient';
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 🔐 PUBLIC ID VALIDATION
// Defense: only allow operations on OUR Cloudinary assets
// ═══════════════════════════════════════════════════════════════

/**
 * Returns true if a publicId belongs to ANY Highrise-managed folder.
 * Used by permanent-delete endpoints to prevent deletion of
 * non-Highrise Cloudinary assets.
 */
export function isHighrisePublicId(publicId: string): boolean {
  const pid = String(publicId ?? '').trim();
  if (!pid) return false;

  // Must start with one of our managed folder paths
  return Object.values(FOLDERS).some((folder) => pid.startsWith(folder + '/'));
}

/**
 * Returns true if a publicId belongs to a specific Highrise folder.
 * Used for stricter validation (e.g., property delete should only
 * touch property uploads).
 */
export function isHighriseFolderPublicId(
  publicId: string,
  folder:   FolderType,
): boolean {
  const pid = String(publicId ?? '').trim();
  if (!pid) return false;
  return pid.startsWith(FOLDERS[folder] + '/');
}

// ═══════════════════════════════════════════════════════════════
// 🔐 ENVIRONMENT VALIDATION (called at runtime, not module load)
// ═══════════════════════════════════════════════════════════════

export function assertCloudinaryConfig(): void {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error(
      'Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, ' +
      'CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in environment.',
    );
  }
}