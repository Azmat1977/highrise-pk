// pages/api/upload/index.ts
// 🔒 ENTERPRISE v3.0 — Centralized File Upload (Serverless-Safe)
// Single file per request. Browser → Buffer → Cloudinary (no disk writes).
// Pattern: disable bodyParser → parse multipart in memory → uploadBuffer()
// ═══════════════════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import cloudinary, {
  UPLOAD_FOLDER_MAP,
  FOLDERS,
  uploadBuffer,
  validateFile,
  getResourceType,
  getMimeTypeFromExtension,
  isHighrisePublicId,
} from '@/lib/cloudinary';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApiWrite } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// 🔒 NEXT.JS CONFIG — disable body parser (we parse raw stream)
// ═══════════════════════════════════════════════════════════════

export const config = {
  api: { bodyParser: false },
};

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Max raw body size — formidable removed, we enforce this manually
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB hard ceiling

// Allowed folder query params — single source of truth: UPLOAD_FOLDER_MAP
type UploadFolderParam = keyof typeof UPLOAD_FOLDER_MAP;

// ═══════════════════════════════════════════════════════════════
// 🔒 TYPES
// ═══════════════════════════════════════════════════════════════

interface UploadResponseData {
  url:      string;
  publicId: string;
  format:   string;
  size:     number;
  width?:   number;
  height?:  number;
}

interface ApiResponse {
  success:   boolean;
  data?:     UploadResponseData;
  error?:    string;
  code?:     string;
  requestId: string;
}

// Parsed multipart result (in memory — no disk)
interface ParsedFile {
  buffer:   Buffer;
  filename: string;
  mimeType: string;
  size:     number;
}

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',              requestId);
  res.setHeader('Content-Type',              'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('Cache-Control',             'no-store');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains; preload');
  res.setHeader('Permissions-Policy',        'geolocation=(), microphone=(), camera=()');
}

// ═══════════════════════════════════════════════════════════════
// 🔒 HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? '').split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || '0.0.0.0';
}

function sanitizeFilename(raw: string): string {
  const name = (raw ?? '').split(/[\\/]/).pop() ?? 'file';
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\./, '_')
    .slice(0, 100)
    || 'unnamed_file';
}

// ═══════════════════════════════════════════════════════════════
// 🔒 IN-MEMORY MULTIPART PARSER
// Replaces formidable entirely. No disk writes. No temp files.
// Parses Content-Type: multipart/form-data directly from raw stream.
// ═══════════════════════════════════════════════════════════════

function parseMultipart(req: NextApiRequest): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] ?? '';

    // Extract boundary from Content-Type header
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch?.[1]) {
      reject(new Error('Missing multipart boundary'));
      return;
    }

    const boundary = boundaryMatch[1];
    const chunks: Buffer[] = [];
    let totalSize = 0;

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('FILE_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('error', reject);

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const parsed = parseMultipartBuffer(body, boundary);
        resolve(parsed);
      } catch (err: unknown) {
        reject(err instanceof Error ? err : new Error('Multipart parse failed'));
      }
    });
  });
}

// Pure Buffer multipart parser — no external deps
function parseMultipartBuffer(body: Buffer, boundary: string): ParsedFile {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const CRLF        = Buffer.from('\r\n');
  const CRLFCRLF    = Buffer.from('\r\n\r\n');

  // Find all boundary positions
  const parts: { start: number; end: number }[] = [];
  let searchPos = 0;

  while (searchPos < body.length) {
    const boundaryPos = body.indexOf(boundaryBuf, searchPos);
    if (boundaryPos === -1) break;

    const afterBoundary = boundaryPos + boundaryBuf.length;

    // Check for final boundary (--)
    if (body[afterBoundary] === 0x2D && body[afterBoundary + 1] === 0x2D) break;

    // Skip CRLF after boundary
    const contentStart = afterBoundary + CRLF.length;

    // Find next boundary
    const nextBoundaryPos = body.indexOf(boundaryBuf, contentStart);
    if (nextBoundaryPos === -1) break;

    // End of this part (trim trailing CRLF before next boundary)
    const contentEnd = nextBoundaryPos - CRLF.length;

    parts.push({ start: contentStart, end: contentEnd });
    searchPos = nextBoundaryPos;
  }

  if (parts.length === 0) {
    throw new Error('No parts found in multipart body');
  }

  // Find the "file" field part
  for (const part of parts) {
    const partContent = body.slice(part.start, part.end);
    const headerEnd   = partContent.indexOf(CRLFCRLF);

    if (headerEnd === -1) continue;

    const headerSection = partContent.slice(0, headerEnd).toString('utf8');
    const fileData      = partContent.slice(headerEnd + CRLFCRLF.length);

    // Must be a file field (has filename=)
    if (!headerSection.includes('filename=')) continue;

    // Parse Content-Disposition
    // Fix: \b word boundary + non-greedy *? prevents matching "name=" inside "filename="
    const dispositionMatch = headerSection.match(
      /Content-Disposition:[^\r\n]*?\bname="([^"]+)"(?:[^\r\n]*?filename="([^"]*)")?/i
    );
    const fieldName = dispositionMatch?.[1] ?? '';
    const rawFilename = dispositionMatch?.[2] ?? 'upload';

    // Must be the "file" field
    if (fieldName !== 'file') continue;

    // Parse Content-Type
    const ctMatch   = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);
    const mimeType  = ctMatch?.[1]?.trim().toLowerCase() ?? 'application/octet-stream';

    const filename = sanitizeFilename(rawFilename);

    return {
      buffer:   fileData,
      filename,
      mimeType,
      size:     fileData.length,
    };
  }

  throw new Error('No file field found. Use field name "file".');
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {

  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 200);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      success: false,
      error:   'Method not allowed',
      code:    'METHOD_NOT_ALLOWED',
      requestId,
    });
    return;
  }

  // ── Validate folder query param ───────────────────────────────
  // Folder comes from query string — never from form body (security boundary)
  // Single source of truth: UPLOAD_FOLDER_MAP from lib/cloudinary.ts
  const folderParam = String(req.query['folder'] ?? 'general').toLowerCase().trim();

  if (!(folderParam in UPLOAD_FOLDER_MAP)) {
    res.status(400).json({
      success: false,
      error:   `Invalid folder. Allowed: ${Object.keys(UPLOAD_FOLDER_MAP).join(', ')}`,
      code:    'INVALID_FOLDER',
      requestId,
    });
    return;
  }

  // Resolve to internal Cloudinary folder path
  const folderKey    = UPLOAD_FOLDER_MAP[folderParam as UploadFolderParam];
  const folderPath   = FOLDERS[folderKey];

  // ── Rate limit ───────────────────────────────────────────────
  const rl = await rateLimitApiWrite(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({
      success: false,
      error:   'Too many uploads. Please slow down.',
      code:    'RATE_LIMITED',
      requestId,
    });
    return;
  }

  // ── Auth ─────────────────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── DB ───────────────────────────────────────────────────────
  await dbConnect();

  try {
    // ── Parse multipart (in memory — no disk, no formidable) ───
    let parsed: ParsedFile;
    try {
      parsed = await parseMultipart(req);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : 'Parse failed';

      if (msg === 'FILE_TOO_LARGE') {
        res.status(400).json({
          success: false,
          error:   `File too large. Maximum: ${MAX_BODY_SIZE / 1024 / 1024}MB`,
          code:    'FILE_TOO_LARGE',
          requestId,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error:   msg || 'Invalid form data. Use multipart/form-data with field name "file".',
        code:    'PARSE_ERROR',
        requestId,
      });
      return;
    }

    const { buffer, filename, mimeType, size } = parsed;

    // ── Determine file category from folder ───────────────────
    // 'documents' → kyc folder → category: 'kyc'
    // everything else → category: 'image'
    const fileCategory = folderParam === 'documents' ? 'kyc' : 'image';

    // ── Validate file (mime + extension + size + magic bytes) ─
    // validateFile() from lib/cloudinary.ts — single source of truth
    const validation = validateFile(
      { name: filename, type: mimeType, size, buffer },
      fileCategory,
    );

    if (!validation.valid) {
      await logSecurityEvent({
        type:      'property_flagged',   // closest valid SecurityEventType for suspicious upload
        severity:  'high',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:           'upload_invalid_file',
          reason:           validation.error,
          declaredMimeType: mimeType,
          filename,
          folder:           folderParam,
          requestId,
        },
      });

      res.status(400).json({
        success: false,
        error:   validation.error ?? 'Invalid file type or content',
        code:    'INVALID_FILE',
        requestId,
      });
      return;
    }

    // ── Determine resource type for Cloudinary ────────────────
    const resourceType = getResourceType(mimeType);

    // ── Build Cloudinary upload options ───────────────────────
    // We call cloudinary.uploader.upload_stream directly here
    // because uploadBuffer() from lib/cloudinary.ts applies
    // folder-specific transformations (avatar crop, property resize, etc.)
    // but we need folderKey-aware options from getUploadOptions().
    // Using uploadBuffer() is the correct pattern:

    const uploadResult = await uploadBuffer(
      buffer,
      filename,
      folderKey,
      fileCategory,
      { tags: [folderParam] },
    );

    if (!uploadResult.success || !uploadResult.publicId) {
      res.status(500).json({
        success: false,
        error:   uploadResult.error ?? 'Upload to Cloudinary failed',
        code:    'CLOUDINARY_ERROR',
        requestId,
      });
      return;
    }

    // ── Defense: verify returned publicId belongs to our folders
    if (!isHighrisePublicId(uploadResult.publicId)) {
      res.status(500).json({
        success: false,
        error:   'Upload routing error',
        code:    'ROUTING_ERROR',
        requestId,
      });
      return;
    }

    // ── Audit log ─────────────────────────────────────────────
    await logSecurityEvent({
      type:      'property_updated',  // valid SecurityEventType for file operations
      severity:  'low',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:    'file_uploaded',
        folder:    folderParam,
        folderPath,
        format:    uploadResult.format,
        size:      uploadResult.size,
        publicId:  uploadResult.publicId,
        requestId,
      },
    });

    // ── Success ───────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        url:      uploadResult.secureUrl ?? uploadResult.url ?? '',
        publicId: uploadResult.publicId,
        format:   uploadResult.format   ?? '',
        size:     uploadResult.size     ?? 0,
        width:    uploadResult.width,
        height:   uploadResult.height,
      },
      requestId,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';

    await logSecurityEvent({
      type:      'property_flagged',
      severity:  'high',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:    'upload_error',
        folder:    folderParam,
        error:     message,
        requestId,
      },
    });

    res.status(500).json({
      success: false,
      error:   'Upload failed. Please try again.',
      code:    'SERVER_ERROR',
      requestId,
    });
  }
}