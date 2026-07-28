// pages/api/comments/[id]/upload-media.ts
// 🔒 ENTERPRISE v2.0 - Comment Media Upload (Images/Videos) with Security & Validation

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import SecurityEvent from '@/models/SecurityEvent';
import { rateLimitUploadImage } from '@/lib/rateLimit';
import { z } from 'zod';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ATTACHMENTS_PER_COMMENT = 5;

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']; // .mov
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// File extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov'];

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY HEADERS + REQUEST ID
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function setSecurityHeaders(res: NextApiResponse, requestId: string) {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

// ═══════════════════════════════════════════════════════════════
// 🔒 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip || '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

function getUserAgent(req: NextApiRequest): string {
  return String(req.headers['user-agent'] || '').slice(0, 200);
}

/**
 * Generate safe filename
 */
function generateSafeFilename(originalName: string, commentId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const ext = path.extname(originalName).toLowerCase();
  
  // Validate extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('Invalid file extension');
  }
  
  return `comment_${commentId}_${timestamp}_${random}${ext}`;
}

/**
 * Validate file type by magic bytes (more secure than MIME type)
 */
async function validateFileType(filePath: string): Promise<{ isValid: boolean; type: 'image' | 'video' | null }> {
  try {
    const buffer = await fs.readFile(filePath);
    const magicBytes = buffer.slice(0, 12).toString('hex');

    // JPEG: ffd8ff
    if (magicBytes.startsWith('ffd8ff')) {
      return { isValid: true, type: 'image' };
    }

    // PNG: 89504e47
    if (magicBytes.startsWith('89504e47')) {
      return { isValid: true, type: 'image' };
    }

    // GIF: 474946
    if (magicBytes.startsWith('474946')) {
      return { isValid: true, type: 'image' };
    }

    // WebP: 52494646....57454250
    if (magicBytes.includes('52494646') && magicBytes.includes('57454250')) {
      return { isValid: true, type: 'image' };
    }

    // MP4: 66747970 or 00000020667479706d703432
    if (magicBytes.includes('66747970') || magicBytes.includes('6d703432')) {
      return { isValid: true, type: 'video' };
    }

    // WebM: 1a45dfa3
    if (magicBytes.startsWith('1a45dfa3')) {
      return { isValid: true, type: 'video' };
    }

    // MOV/QuickTime: 6d6f6f76 or 66747970717420
    if (magicBytes.includes('6d6f6f76') || magicBytes.includes('667479707174')) {
      return { isValid: true, type: 'video' };
    }

    return { isValid: false, type: null };
  } catch (error) {
    return { isValid: false, type: null };
  }
}

/**
 * Parse multipart form data
 */
function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'comments');
    
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: MAX_ATTACHMENTS_PER_COMMENT,
      filter: (part) => {
        // Filter by MIME type first (basic check)
        return ALLOWED_TYPES.includes(part.mimetype || '');
      },
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔒 DISABLE NEXT.JS BODY PARSER (Required for file uploads)
// ═══════════════════════════════════════════════════════════════

export const config = {
  api: {
    bodyParser: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  // ═══════════════════════════════════════════════════════════════
  // ✅ METHOD CHECK
  // ═══════════════════════════════════════════════════════════════

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ VALIDATE COMMENT ID
  // ═══════════════════════════════════════════════════════════════

  const { id } = req.query;
  const idResult = ObjectIdSchema.safeParse(id);

  if (!idResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid comment ID format',
      code: 'INVALID_ID',
      requestId,
    });
  }

  const commentId = idResult.data;

  try {
    await dbConnect();

    // ═══════════════════════════════════════════════════════════════
    // ✅ RATE LIMITING (Strict for uploads)
    // ═══════════════════════════════════════════════════════════════

    const rl = await rateLimitUploadImage(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter || 60));
      return res.status(429).json({
        success: false,
        message: 'Too many upload requests. Please slow down.',
        code: 'RATE_LIMITED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ FETCH COMMENT
    // ═══════════════════════════════════════════════════════════════

    const comment: any = await Comment.findById(commentId).maxTimeMS(MAX_TIME_MS);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
        code: 'NOT_FOUND',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CHECK IF COMMENT IS DELETED
    // ═══════════════════════════════════════════════════════════════

    if (comment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot upload media to a deleted comment',
        code: 'COMMENT_DELETED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CHECK ATTACHMENT LIMIT
    // ═══════════════════════════════════════════════════════════════

    const currentAttachments = comment.attachments?.length || 0;
    if (currentAttachments >= MAX_ATTACHMENTS_PER_COMMENT) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_ATTACHMENTS_PER_COMMENT} attachments per comment`,
        code: 'MAX_ATTACHMENTS_REACHED',
        maxAllowed: MAX_ATTACHMENTS_PER_COMMENT,
        current: currentAttachments,
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CREATE UPLOAD DIRECTORY
    // ═══════════════════════════════════════════════════════════════

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'comments');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ PARSE FORM DATA
    // ═══════════════════════════════════════════════════════════════

    let fields: formidable.Fields;
    let files: formidable.Files;

    try {
      const parsed = await parseForm(req);
      fields = parsed.fields;
      files = parsed.files;
    } catch (error: any) {
      // Clean up any uploaded files on error
      SecurityEvent.create({
        eventType: 'upload_failed',
        severity: 'medium',
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          commentId,
          error: error?.message || 'Unknown error',
        },
      }).catch(console.error);

      return res.status(400).json({
        success: false,
        message: 'File upload failed',
        error: error?.message || 'Unknown error',
        code: 'UPLOAD_FAILED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ VALIDATE & PROCESS FILES
    // ═══════════════════════════════════════════════════════════════

    const uploadedFiles = Array.isArray(files.media) ? files.media : files.media ? [files.media] : [];

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
        code: 'NO_FILES',
        requestId,
      });
    }

    const attachments: any[] = [];
    const errors: string[] = [];

    for (const file of uploadedFiles) {
      try {
        // Validate file type by magic bytes
        const validation = await validateFileType(file.filepath);

        if (!validation.isValid) {
          errors.push(`${file.originalFilename}: Invalid or suspicious file type`);
          await fs.unlink(file.filepath).catch(() => {}); // Clean up
          continue;
        }

        // Generate safe filename
        const safeFilename = generateSafeFilename(file.originalFilename || 'upload', commentId);
        const newPath = path.join(uploadDir, safeFilename);

        // Move file to permanent location
        await fs.rename(file.filepath, newPath);

        // Create attachment object
        const attachment = {
          type: validation.type,
          url: `/uploads/comments/${safeFilename}`,
          thumbnailUrl: validation.type === 'image' ? `/uploads/comments/${safeFilename}` : undefined,
          fileSize: file.size,
          mimeType: file.mimetype || 'application/octet-stream',
          uploadedAt: new Date(),
        };

        attachments.push(attachment);
      } catch (error: any) {
        errors.push(`${file.originalFilename}: ${error.message}`);
        await fs.unlink(file.filepath).catch(() => {});
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CHECK IF ANY FILES WERE PROCESSED
    // ═══════════════════════════════════════════════════════════════

    if (attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid files were uploaded',
        errors,
        code: 'NO_VALID_FILES',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ UPDATE COMMENT WITH ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════

    if (!comment.attachments) {
      comment.attachments = [];
    }

    comment.attachments.push(...attachments);
    comment.updatedAt = new Date();

    await comment.save();

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUDIT LOG
    // ═══════════════════════════════════════════════════════════════

    SecurityEvent.create({
      eventType: 'comment_media_uploaded',
      severity: 'low',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        commentId,
        filesUploaded: attachments.length,
        totalSize: attachments.reduce((sum, a) => sum + a.fileSize, 0),
        types: attachments.map((a) => a.type),
      },
    }).catch(console.error);

    // ═══════════════════════════════════════════════════════════════
    // ✅ SUCCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════

    return res.status(200).json({
      success: true,
      message: `${attachments.length} file(s) uploaded successfully`,
      attachments: attachments.map((a) => ({
        type: a.type,
        url: a.url,
        thumbnailUrl: a.thumbnailUrl,
        fileSize: a.fileSize,
      })),
      errors: errors.length > 0 ? errors : undefined,
      stats: {
        uploaded: attachments.length,
        failed: errors.length,
        totalAttachments: comment.attachments.length,
        remaining: MAX_ATTACHMENTS_PER_COMMENT - comment.attachments.length,
      },
      requestId,
    });
  } catch (error: any) {
    console.error('Media upload error:', { requestId, error: error?.message });

    SecurityEvent.create({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        endpoint: `/api/comments/${commentId}/upload-media`,
        errorCode: error?.code || 'UNKNOWN',
      },
    }).catch(console.error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      requestId,
    });
  }
}