// pages/api/admin/media/upload.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN MEDIA UPLOAD API - Highrise.pk
// 🔒 ENTERPRISE-GRADE SECURITY
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Media from '@/models/Media';
import cloudinary, {
  uploadOptions,
  getResourceType,
  allowedTypes,
  maxFileSize,
} from '@/lib/cloudinary';

// ============================================
// API CONFIGURATION
// ============================================

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

// ============================================
// TYPE DEFINITIONS
// ============================================

type UploadResponse = {
  success: boolean;
  message: string;
  media?: {
    id: string;
    filename: string;
    url: string;
    publicId: string;
    mimeType: string;
    size: number;
    width?: number | null;
    height?: number | null;
    folder: string;
  };
  error?: string;
};

// ============================================
// HELPER: GET ALL ALLOWED TYPES
// ============================================

/**
 * Flatten all allowed MIME types into a single array
 * This handles the case where allowedTypes doesn't have an 'all' property
 */
function getAllAllowedTypes(): string[] {
  const allTypes: string[] = [];

  // Safely extract all MIME types from each category
  if (allowedTypes.image) {
    allTypes.push(...allowedTypes.image);
  }
  if (allowedTypes.document) {
    allTypes.push(...allowedTypes.document);
  }
  if (allowedTypes.video) {
    allTypes.push(...allowedTypes.video);
  }
  if (allowedTypes.avatar) {
    // Avatar types are likely duplicates of image types, but we'll add them for safety
    allowedTypes.avatar.forEach((type: string) => {
      if (!allTypes.includes(type)) {
        allTypes.push(type);
      }
    });
  }
  if (allowedTypes.kyc) {
    allowedTypes.kyc.forEach((type: string) => {
      if (!allTypes.includes(type)) {
        allTypes.push(type);
      }
    });
  }

  // Fallback if somehow empty
  if (allTypes.length === 0) {
    return [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'video/mp4',
      'video/webm',
    ];
  }

  return allTypes;
}

// ============================================
// VALID FOLDERS LIST
// ============================================

const VALID_FOLDERS = [
  'general',
  'properties',
  'projects',
  'blogs',
  'users',
  'developers',
  'agents',
  'kyc',
  'testimonials',
] as const;

type ValidFolder = (typeof VALID_FOLDERS)[number];

// ============================================
// HELPER: SANITIZE FILENAME
// ============================================

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single
    .replace(/^-|-$/g, '') // Remove leading/trailing dashes
    .toLowerCase()
    .substring(0, 50); // Limit length
}

// ============================================
// HELPER: VALIDATE BASE64 FILE
// ============================================

function validateBase64File(file: string): {
  isValid: boolean;
  error?: string;
  data?: string;
  size?: number;
} {
  if (!file || typeof file !== 'string') {
    return { isValid: false, error: 'File data is required' };
  }

  // Handle data URL format (data:image/jpeg;base64,/9j/4AAQ...)
  let base64Data = file;
  if (file.includes(',')) {
    const parts = file.split(',');
    if (parts.length !== 2) {
      return { isValid: false, error: 'Invalid file format' };
    }
    base64Data = parts[1];
  }

  // Validate base64 characters
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    return { isValid: false, error: 'Invalid base64 encoding' };
  }

  // Calculate actual file size
  try {
    const size = Buffer.from(base64Data, 'base64').length;
    return { isValid: true, data: base64Data, size };
  } catch {
    return { isValid: false, error: 'Failed to decode file data' };
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  // ══════════════════════════════════════
  // METHOD CHECK
  // ══════════════════════════════════════
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    // ══════════════════════════════════════
    // DATABASE CONNECTION
    // ══════════════════════════════════════
    await dbConnect();

    // ══════════════════════════════════════
    // EXTRACT REQUEST BODY
    // ══════════════════════════════════════
    const {
      file,
      filename,
      mimeType,
      folder = 'general',
      alt = '',
      caption = '',
      uploadedBy,
    } = req.body;

    // ══════════════════════════════════════
    // VALIDATE REQUIRED FIELDS
    // ══════════════════════════════════════
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File data is required',
      });
    }

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Filename is required',
      });
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'MIME type is required',
      });
    }

    // ══════════════════════════════════════
    // VALIDATE FILE TYPE
    // ══════════════════════════════════════
    const allAllowedTypes = getAllAllowedTypes();

    if (!allAllowedTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: `File type "${mimeType}" not allowed. Allowed types: ${allAllowedTypes.join(', ')}`,
      });
    }

    // ══════════════════════════════════════
    // VALIDATE BASE64 FILE DATA
    // ══════════════════════════════════════
    const fileValidation = validateBase64File(file);

    if (!fileValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: fileValidation.error || 'Invalid file data',
      });
    }

    // ══════════════════════════════════════
    // CHECK FILE SIZE
    // ══════════════════════════════════════
    const fileSize = fileValidation.size || 0;
    const maxSize = maxFileSize || 10 * 1024 * 1024; // Default 10MB

    if (fileSize > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB. Your file is ${Math.round(fileSize / (1024 * 1024))}MB.`,
      });
    }

    // ══════════════════════════════════════
    // VALIDATE FOLDER
    // ══════════════════════════════════════
    const safeFolder: ValidFolder = VALID_FOLDERS.includes(folder as ValidFolder)
      ? (folder as ValidFolder)
      : 'general';

    // ══════════════════════════════════════
    // GET RESOURCE TYPE
    // ══════════════════════════════════════
    const resourceType = getResourceType(mimeType);

    // ══════════════════════════════════════
    // GET UPLOAD OPTIONS
    // ══════════════════════════════════════
    const options =
      uploadOptions[safeFolder as keyof typeof uploadOptions] || uploadOptions.general;

    // ══════════════════════════════════════
    // GENERATE UNIQUE PUBLIC ID
    // ══════════════════════════════════════
    const sanitizedFilename = sanitizeFilename(filename);
    const uniqueId = `${Date.now()}-${sanitizedFilename}`;

    // ══════════════════════════════════════
    // UPLOAD TO CLOUDINARY
    // ══════════════════════════════════════
    const uploadResult = await cloudinary.uploader.upload(file, {
      ...options,
      resource_type: resourceType,
      public_id: uniqueId,
    });

    // ══════════════════════════════════════
    // EXTRACT FILE FORMAT
    // ══════════════════════════════════════
    const format = filename.split('.').pop()?.toLowerCase() || uploadResult.format || '';

    // ══════════════════════════════════════
    // BUILD MEDIA DATA OBJECT
    // ══════════════════════════════════════
    const mediaData: Record<string, unknown> = {
      filename: uploadResult.public_id.split('/').pop() || filename,
      originalName: filename,
      mimeType,
      format,
      size: uploadResult.bytes,
      width: uploadResult.width || null,
      height: uploadResult.height || null,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      resourceType,
      folder: safeFolder,
      alt: alt || filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      caption: caption || '',
    };

    // ══════════════════════════════════════
    // VALIDATE AND ADD UPLOADED BY
    // ══════════════════════════════════════
    if (
      uploadedBy &&
      typeof uploadedBy === 'string' &&
      /^[0-9a-fA-F]{24}$/.test(uploadedBy)
    ) {
      mediaData.uploadedBy = uploadedBy;
    }

    // ══════════════════════════════════════
    // SAVE TO DATABASE
    // ══════════════════════════════════════
    const media = await Media.create(mediaData);

    // ══════════════════════════════════════
    // SUCCESS RESPONSE
    // ══════════════════════════════════════
    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      media: {
        id: media._id.toString(),
        filename: media.filename,
        url: media.url,
        publicId: media.publicId,
        mimeType: media.mimeType,
        size: media.size,
        width: media.width,
        height: media.height,
        folder: media.folder,
      },
    });
  } catch (error: unknown) {
    // ══════════════════════════════════════
    // ERROR HANDLING
    // ══════════════════════════════════════
    console.error('[ADMIN_MEDIA_UPLOAD] Error:', error);

    // Handle Cloudinary-specific errors
    if (error && typeof error === 'object' && 'http_code' in error) {
      const cloudinaryError = error as { http_code: number; message?: string };
      return res.status(cloudinaryError.http_code || 500).json({
        success: false,
        message: 'Cloudinary upload failed',
        error:
          process.env.NODE_ENV === 'development'
            ? cloudinaryError.message
            : 'Upload service error',
      });
    }

    // Handle MongoDB duplicate key errors
    if (error && typeof error === 'object' && 'code' in error) {
      const mongoError = error as { code: number };
      if (mongoError.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'A file with this identifier already exists',
        });
      }
    }

    // Generic error
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    return res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
}
