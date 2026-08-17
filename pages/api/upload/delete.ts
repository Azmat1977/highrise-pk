// pages/api/upload/delete.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import cloudinary, { isHighrisePublicId, isHighriseFolderPublicId } from '@/lib/cloudinary';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApiWrite } from '@/lib/rateLimit';
import SecurityEvent from '@/models/SecurityEvent';
import { checkPermission } from '@/lib/permissions';
import dbConnect from '@/lib/dbConnect';

/**
 * 🗑️ ENTERPRISE FILE DELETE ENDPOINT
 * 
 * Security Features:
 * ├── Authentication required (requireAuth)
 * ├── Rate limiting (write operations tier)
 * ├── Ownership verification (via Cloudinary tags)
 * ├── Admin override capability
 * ├── Public ID validation & sanitization
 * ├── Resource type whitelist
 * ├── Cloudinary metadata verification
 * ├── CDN cache invalidation
 * ├── Comprehensive audit logging
 * ├── Unauthorized attempt tracking
 * └── Safe error handling (no info leakage)
 * 
 * @route DELETE/POST /api/upload/delete
 * @access Authenticated users only (own files) or Admin
 * @permission file_delete (for admin override)
 */

// ═══════════════════════════════════════════════════════════════
// 🔒 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface DeleteRequest {
  publicId: string;
  resourceType?: 'image' | 'raw' | 'video';
}

interface ApiResponse {
  success: boolean;
  message?: string;
  result?: any;
}

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ALLOWED_RESOURCE_TYPES = ['image', 'raw', 'video'] as const;
const MAX_PUBLIC_ID_LENGTH = 500;

// Public ID patterns to block (security)
const DANGEROUS_PUBLIC_ID_PATTERNS = [
  /\.\./,           // Path traversal
  /<script/i,       // XSS
  /javascript:/i,   // XSS
  /data:/i,         // Data URI
  /vbscript:/i,     // VBScript
  /%00/,            // Null byte
];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract client IP address
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Validate and sanitize public ID
 */
function validatePublicId(publicId: string): { valid: boolean; error?: string } {
  if (!publicId || typeof publicId !== 'string') {
    return { valid: false, error: 'Public ID must be a non-empty string' };
  }

  if (publicId.length > MAX_PUBLIC_ID_LENGTH) {
    return { valid: false, error: 'Public ID exceeds maximum length' };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PUBLIC_ID_PATTERNS) {
    if (pattern.test(publicId)) {
      return { valid: false, error: 'Public ID contains invalid characters' };
    }
  }

  // Must belong to one of the canonical Highrise-managed Cloudinary folders.
  if (!isHighrisePublicId(publicId)) {
    return { valid: false, error: 'Invalid public ID format' };
  }

  return { valid: true };
}

/**
 * Validate resource type
 */
function validateResourceType(type: any): type is 'image' | 'raw' | 'video' {
  return ALLOWED_RESOURCE_TYPES.includes(type);
}

/**
 * Log security event
 */
async function logSecurityEvent(data: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await SecurityEvent.create({
      ...data,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // =========================================
  // 🔒 STEP 1: METHOD VALIDATION
  // =========================================
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    res.setHeader('Allow', ['DELETE', 'POST']);
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // =========================================
    // 💾 STEP 2: DATABASE CONNECTION
    // =========================================
    await dbConnect();

    // =========================================
    // 🛡️ STEP 3: RATE LIMITING
    // =========================================
    const rateLimitResult = await rateLimitApiWrite(req);
    
    if (!rateLimitResult.ok) {
      await logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        ipAddress: clientIP,
        userAgent,
        metadata: {
          endpoint: '/api/upload/delete',
          limit: rateLimitResult.limit,
          retryAfter: rateLimitResult.retryAfter
        }
      });

      return res.status(429).json({ 
        success: false, 
        message: 'Too many requests. Please slow down.' 
      });
    }

    // =========================================
    // 🔐 STEP 4: AUTHENTICATION
    // =========================================
    const auth = await requireAuth(req, res);
    if (!auth) return; // requireAuth already sent response

    // =========================================
    // 📝 STEP 5: VALIDATE REQUEST BODY
    // =========================================
    const { publicId, resourceType = 'image' }: DeleteRequest = req.body;
    const deliveryType = isHighriseFolderPublicId(publicId, 'kyc') ? 'authenticated' : 'upload';

    // Validate Public ID
    const publicIdValidation = validatePublicId(publicId);
    if (!publicIdValidation.valid) {
      await logSecurityEvent({
        eventType: 'invalid_input',
        severity: 'medium',
        userId: auth.id,
        ipAddress: clientIP,
        userAgent,
        metadata: {
          endpoint: '/api/upload/delete',
          error: publicIdValidation.error,
          publicId: publicId?.substring(0, 100) // Log partial for debugging
        }
      });

      return res.status(400).json({ 
        success: false, 
        message: publicIdValidation.error || 'Invalid public ID' 
      });
    }

    // Validate Resource Type
    if (!validateResourceType(resourceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource type. Must be: image, raw, or video'
      });
    }

    // =========================================
    // 🔍 STEP 6: FETCH CLOUDINARY METADATA
    // =========================================
    let resource: any = null;
    
    try {
      resource = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
        image_metadata: false,
        colors: false,
        phash: false,
        type: deliveryType,
      });
    } catch (cloudinaryError: any) {
      // File not found in Cloudinary
      if (cloudinaryError?.error?.http_code === 404) {
        // Return success for idempotency (file already deleted/doesn't exist)
        await logSecurityEvent({
          eventType: 'file_delete_not_found',
          severity: 'low',
          userId: auth.id,
          ipAddress: clientIP,
          userAgent,
          metadata: {
            publicId,
            resourceType
          }
        });

        return res.status(200).json({ 
          success: true, 
          message: 'File already deleted or does not exist' 
        });
      }

      // Other Cloudinary errors
      console.error('Cloudinary API error:', cloudinaryError);
      
      await logSecurityEvent({
        eventType: 'cloudinary_error',
        severity: 'high',
        userId: auth.id,
        ipAddress: clientIP,
        userAgent,
        metadata: {
          endpoint: '/api/upload/delete',
          publicId,
          error: cloudinaryError.message
        }
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to verify file ownership'
      });
    }

    // =========================================
    // 🛡️ STEP 7: OWNERSHIP VERIFICATION
    // =========================================
    const userTags = resource?.tags || [];
    const isOwner = userTags.includes(`user_${auth.id}`);

    // requireAuth already resolved the current DB-backed role.
    const userRole = String(auth.role || 'user').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'superadmin';

    // Determine if deletion is allowed
    let deleteAllowed = isOwner || isAdmin;
    let deleteReason = isOwner ? 'owner' : isAdmin ? 'admin_override' : 'unauthorized';

    if (!deleteAllowed) {
      // Log unauthorized deletion attempt
      await logSecurityEvent({
        eventType: 'unauthorized_access_attempt',
        severity: 'high',
        userId: auth.id,
        ipAddress: clientIP,
        userAgent,
        metadata: {
          endpoint: '/api/upload/delete',
          publicId,
          resourceType,
          reason: 'Ownership mismatch',
          userRole,
          resourceTags: userTags
        }
      });

      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: You do not have permission to delete this file' 
      });
    }

    // =========================================
    // 🔑 STEP 8: ADMIN PERMISSION CHECK (if admin override)
    // =========================================
    if (isAdmin && !isOwner) {
  const hasPermission = checkPermission(
    {
      id: auth.id,
      role: userRole,
    },
    'file_delete_any',
  );

  if (!hasPermission) {
        await logSecurityEvent({
          eventType: 'permission_denied',
          severity: 'high',
          userId: auth.id,
          ipAddress: clientIP,
          userAgent,
          metadata: {
            endpoint: '/api/upload/delete',
            publicId,
            permission: 'file_delete_any'
          }
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete other users files'
        });
      }
    }

    // =========================================
    // 🗑️ STEP 9: DELETE FROM CLOUDINARY
    // =========================================
    const deleteResult = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true, // Clear CDN cache
      type: deliveryType,
    });

    if (deleteResult.result === 'ok' || deleteResult.result === 'not found') {
      // =========================================
      // 📝 STEP 10: AUDIT LOGGING (SUCCESS)
      // =========================================
      await logSecurityEvent({
        eventType: 'file_deleted',
        severity: isAdmin && !isOwner ? 'medium' : 'low',
        userId: auth.id,
        ipAddress: clientIP,
        userAgent,
        metadata: {
          publicId,
          resourceType,
          deleteReason,
          cloudinaryResult: deleteResult.result,
          fileSize: resource?.bytes || 0,
          format: resource?.format || 'unknown'
        }
      });

      return res.status(200).json({ 
        success: true, 
        message: 'File deleted successfully' 
      });
    }

    // Unexpected Cloudinary response
    await logSecurityEvent({
      eventType: 'file_delete_failed',
      severity: 'medium',
      userId: auth.id,
      ipAddress: clientIP,
      userAgent,
      metadata: {
        publicId,
        resourceType,
        cloudinaryResult: deleteResult
      }
    });

    return res.status(400).json({ 
      success: false, 
      message: 'Failed to delete file',
      result: deleteResult 
    });

  } catch (error: any) {
    // =========================================
    // 🚨 ERROR HANDLING
    // =========================================
    console.error('❌ Delete API Error:', error);

    await logSecurityEvent({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/upload/delete',
        error: error.message,
        errorType: error.name
      }
    });

    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while deleting the file' 
    });
  }
}
