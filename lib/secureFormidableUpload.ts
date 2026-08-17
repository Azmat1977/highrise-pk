import { readFile } from 'node:fs/promises';
import {
  uploadBuffer,
  validateFile,
  type FolderType,
  type FileCategory,
} from '@/lib/cloudinary';

export interface TempUploadFile {
  filepath: string;
  originalFilename?: string | null;
  mimetype?: string | null;
  size: number;
}

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

/**
 * Validates multipart temp uploads before sending them to Cloudinary.
 * We validate claimed MIME + extension + size + magic bytes, then upload the
 * in-memory bytes through the central signed server-side Cloudinary helper.
 */
export async function uploadValidatedTempFile(
  file: TempUploadFile,
  folder: FolderType,
  category: FileCategory,
  options?: { tags?: string[] },
): Promise<{ url: string; publicId: string; format?: string; size?: number; resourceType?: 'image' | 'video' | 'raw' }> {
  const filename = file.originalFilename || `upload-${Date.now()}`;
  const buffer = await readFile(file.filepath);
  const validation = validateFile(
    {
      name: filename,
      type: file.mimetype || 'application/octet-stream',
      size: file.size || buffer.length,
      buffer,
    },
    category,
  );

  if (!validation.valid) {
    throw new UploadValidationError(validation.error || 'Invalid upload');
  }

  const result = await uploadBuffer(buffer, filename, folder, category, options);
  if (!result.success || !result.secureUrl || !result.publicId) {
    throw new Error(result.error || 'Upload failed');
  }

  return {
    url: result.secureUrl,
    publicId: result.publicId,
    format: result.format,
    size: result.size,
    resourceType: result.resourceType,
  };
}
