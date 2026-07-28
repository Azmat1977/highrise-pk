// pages/api/reviews/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '@/lib/db';
import Review, { ReviewEntityType, ReviewStatus } from '@/models/Review';
import User from '@/models/User';
import Property from '@/models/Property';
import SecurityEvent from '@/models/SecurityEvent';
import { checkPermission } from '@/lib/permissions';
import { rateLimitReview, rateLimitApi } from '@/lib/rateLimit';

/**
 * 🔐 ENTERPRISE REVIEW SYSTEM API
 * 
 * Security Features:
 * ├── GET: Public with rate limiting
 * │   ├── Entity type whitelist validation
 * │   ├── MongoDB injection prevention
 * │   ├── Pagination limits (max 50)
 * │   ├── Only approved reviews visible
 * │   └── NoSQL injection prevention
 * │
 * └── POST: Authenticated users only
 *     ├── Rate limiting (5 reviews/day per user)
 *     ├── Verified purchase check (for properties)
 *     ├── Duplicate review prevention
 *     ├── Profanity filter
 *     ├── XSS sanitization
 *     ├── Image upload validation
 *     ├── Admin auto-approval
 *     ├── User reviews pending moderation
 *     ├── Complete audit trail
 *     └── Spam detection
 * 
 * @route GET /api/reviews (Public - view reviews)
 * @route POST /api/reviews (Authenticated - submit review)
 */

// ═══════════════════════════════════════════════════════════════
// 🔒 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface ReviewSubmission {
  entityType: ReviewEntityType;
  entityId: string;
  rating: number;
  title?: string;
  content: string;
  pros?: string[];
  cons?: string[];
  detailedRatings?: Record<string, number>;
  media?: Array<{ url: string; type: 'image' | 'video' }>;
  isAnonymous?: boolean;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any[];
  meta?: {
    averageRating: number;
    reviewCount: number;
    breakdown: { [key: number]: number };
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ALLOWED_ENTITY_TYPES: ReviewEntityType[] = [
  'property',
  'project',
  'developer',
  'agent',
  'contractor',
  'architect',
  'vendor',
  'interior_designer',
];

const MAX_REVIEWS_PER_DAY = 5;
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 5000;
const MAX_TITLE_LENGTH = 200;
const MAX_PROS_CONS = 10;
const MAX_PROS_CONS_LENGTH = 200;
const MAX_MEDIA_ITEMS = 5;
const MAX_PAGINATION_LIMIT = 50;

// Profanity filter (basic - expand as needed)
const PROFANITY_PATTERNS = [
  /\b(fuck|shit|asshole|bitch|bastard|damn)\b/gi,
  /\b(chutiya|harami|gandu|madarchod|bhenchod)\b/gi, // Urdu profanity
];

// Spam patterns
const SPAM_PATTERNS = [
  /\b(call now|buy now|click here|visit website|www\.|http)/gi,
  /\b(\d{10,})\b/g, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
];

// XSS patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  return req.socket?.remoteAddress || 'unknown';
}

async function logSecurityEvent(data: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await SecurityEvent.create({ ...data, timestamp: new Date() });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Sanitize text input to prevent XSS
 */
function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  let sanitized = text.trim();
  
  // Remove XSS patterns
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized;
}

/**
 * Check for profanity
 */
function containsProfanity(text: string): boolean {
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * Check for spam patterns
 */
function containsSpam(text: string): boolean {
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * Validate media URLs
 */
function validateMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS and from trusted domains
    if (parsed.protocol !== 'https:') return false;
    
    const trustedDomains = [
      'res.cloudinary.com',
      'highrise.pk',
      'cloudinary.com'
    ];
    
    return trustedDomains.some(domain => parsed.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Check if user has verified purchase (for property reviews)
 */
async function hasVerifiedPurchase(userId: string, propertyId: string): Promise<boolean> {
  // TODO: Implement your purchase verification logic
  // For now, check if user has a successful inquiry/deal
  // This is a placeholder - adjust based on your business logic
  
  try {
    const Lead = mongoose.model('Lead');
    const verifiedDeal = await Lead.findOne({
      property: propertyId,
      email: { $exists: true },
      status: 'won',
      // Add your verification criteria
    });
    
    return !!verifiedDeal;
  } catch {
    return false;
  }
}

/**
 * Check for duplicate reviews
 */
async function checkDuplicateReview(
  userId: string,
  entityType: ReviewEntityType,
  entityId: string
): Promise<boolean> {
  const existing = await Review.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
    isDeleted: { $ne: true },
  });
  
  return !!existing;
}

/**
 * Check daily review limit
 */
async function checkDailyLimit(userId: string): Promise<{ exceeded: boolean; count: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const count = await Review.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    createdAt: { $gte: today },
  });
  
  return {
    exceeded: count >= MAX_REVIEWS_PER_DAY,
    count,
  };
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

  try {
    await dbConnect();

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, clientIP, userAgent);
      case 'POST':
        return handlePost(req, res, clientIP, userAgent);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} not allowed`,
        });
    }
  } catch (error: any) {
    console.error('❌ Review API Critical Error:', error);

    await logSecurityEvent({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/reviews',
        method: req.method,
        error: error.message,
      },
    });

    return res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// 📖 GET HANDLER: PUBLIC REVIEW LISTING
// ═══════════════════════════════════════════════════════════════

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  clientIP: string,
  userAgent: string
) {
  // ─────────────────────────────────────────────
  // STEP 1: RATE LIMITING
  // ─────────────────────────────────────────────
  const rateLimitResult = await rateLimitApi(req);
  if (!rateLimitResult.ok) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests',
    });
  }

  // ─────────────────────────────────────────────
  // STEP 2: VALIDATE QUERY PARAMETERS
  // ─────────────────────────────────────────────
  const { entityType, entityId, page = '1', limit = '10' } = req.query;

  // Required parameters
  if (!entityType || !entityId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: entityType, entityId',
    });
  }

  // Validate entity type
  if (!ALLOWED_ENTITY_TYPES.includes(entityType as ReviewEntityType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid entityType. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
    });
  }

  // Validate entity ID
  if (!mongoose.Types.ObjectId.isValid(entityId as string)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid entityId format',
    });
  }

  // ─────────────────────────────────────────────
  // STEP 3: PAGINATION SECURITY
  // ─────────────────────────────────────────────
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(
    MAX_PAGINATION_LIMIT,
    Math.max(1, parseInt(limit as string, 10) || 10)
  );
  const skip = (pageNum - 1) * limitNum;

  const entityObjectId = new mongoose.Types.ObjectId(entityId as string);

  // ─────────────────────────────────────────────
  // STEP 4: FETCH REVIEWS (ONLY APPROVED)
  // ─────────────────────────────────────────────
  const reviews = await Review.getEntityReviews(
    entityType as ReviewEntityType,
    entityObjectId,
    {
      limit: limitNum,
      skip,
      status: 'approved',
    }
  );

  // ─────────────────────────────────────────────
  // STEP 5: FETCH STATISTICS
  // ─────────────────────────────────────────────
  const stats = await Review.getAverageRating(
    entityType as ReviewEntityType,
    entityObjectId
  );

  // ─────────────────────────────────────────────
  // STEP 6: AUDIT LOG (Low priority)
  // ─────────────────────────────────────────────
  if (Math.random() < 0.01) { // Log 1% of reads for monitoring
    await logSecurityEvent({
      eventType: 'reviews_viewed',
      severity: 'low',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        entityType,
        entityId,
        reviewCount: stats.count,
      },
    });
  }

  // ─────────────────────────────────────────────
  // STEP 7: SUCCESS RESPONSE
  // ─────────────────────────────────────────────
  const totalPages = Math.ceil(stats.count / limitNum) || 1;

  return res.status(200).json({
    success: true,
    data: reviews,
    meta: {
      averageRating: stats.average,
      reviewCount: stats.count,
      breakdown: stats.breakdown,
    },
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: stats.count,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 📝 POST HANDLER: SUBMIT REVIEW
// ═══════════════════════════════════════════════════════════════

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  clientIP: string,
  userAgent: string
) {
  // ─────────────────────────────────────────────
  // STEP 1: RATE LIMITING (Strict)
  // ─────────────────────────────────────────────
  const rateLimitResult = await rateLimitReview(req);
  if (!rateLimitResult.ok) {
    await logSecurityEvent({
      eventType: 'rate_limit_exceeded',
      severity: 'medium',
      ipAddress: clientIP,
      userAgent,
      metadata: { endpoint: '/api/reviews', action: 'create' },
    });

    return res.status(429).json({
      success: false,
      message: 'Review submission limit exceeded. Please try again later.',
    });
  }

  // ─────────────────────────────────────────────
  // STEP 2: AUTHENTICATION
  // ─────────────────────────────────────────────
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    await logSecurityEvent({
      eventType: 'unauthorized_access_attempt',
      severity: 'medium',
      ipAddress: clientIP,
      userAgent,
      metadata: { endpoint: '/api/reviews', action: 'create' },
    });

    return res.status(401).json({
      success: false,
      message: 'Authentication required to submit a review',
    });
  }

  const userId = session.user.id!;
  const userRole = session.user.role || 'user';

  // ─────────────────────────────────────────────
  // STEP 3: PARSE & VALIDATE INPUT
  // ─────────────────────────────────────────────
  const {
    entityType,
    entityId,
    rating,
    title,
    content,
    pros,
    cons,
    detailedRatings,
    media,
    isAnonymous,
  }: ReviewSubmission = req.body;

  // Validate entity type
  if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid entityType. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
    });
  }

  // Validate entity ID
  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid entityId format',
    });
  }

  // Validate rating
  if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be an integer between 1 and 5',
    });
  }

  // Validate content
  const sanitizedContent = sanitizeText(content);
  if (sanitizedContent.length < MIN_CONTENT_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Review content must be at least ${MIN_CONTENT_LENGTH} characters`,
    });
  }
  if (sanitizedContent.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Review content must not exceed ${MAX_CONTENT_LENGTH} characters`,
    });
  }

  // Validate title (optional)
  let sanitizedTitle: string | undefined;
  if (title) {
    sanitizedTitle = sanitizeText(title);
    if (sanitizedTitle.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Title must not exceed ${MAX_TITLE_LENGTH} characters`,
      });
    }
  }

  // ─────────────────────────────────────────────
  // STEP 4: PROFANITY & SPAM DETECTION
  // ─────────────────────────────────────────────
  if (containsProfanity(sanitizedContent) || (sanitizedTitle && containsProfanity(sanitizedTitle))) {
    await logSecurityEvent({
      eventType: 'profanity_detected',
      severity: 'medium',
      userId,
      ipAddress: clientIP,
      userAgent,
      metadata: { entityType, entityId },
    });

    return res.status(400).json({
      success: false,
      message: 'Review contains inappropriate language',
    });
  }

  if (containsSpam(sanitizedContent)) {
    await logSecurityEvent({
      eventType: 'spam_detected',
      severity: 'high',
      userId,
      ipAddress: clientIP,
      userAgent,
      metadata: { entityType, entityId, content: sanitizedContent.substring(0, 100) },
    });

    return res.status(400).json({
      success: false,
      message: 'Review contains prohibited content (URLs, phone numbers, or spam)',
    });
  }

  // ─────────────────────────────────────────────
  // STEP 5: DUPLICATE CHECK
  // ─────────────────────────────────────────────
  const isDuplicate = await checkDuplicateReview(userId, entityType, entityId);
  if (isDuplicate) {
    return res.status(400).json({
      success: false,
      message: 'You have already reviewed this item',
    });
  }

  // ─────────────────────────────────────────────
  // STEP 6: DAILY LIMIT CHECK
  // ─────────────────────────────────────────────
  const dailyLimit = await checkDailyLimit(userId);
  if (dailyLimit.exceeded) {
    await logSecurityEvent({
      eventType: 'review_limit_exceeded',
      severity: 'medium',
      userId,
      ipAddress: clientIP,
      userAgent,
      metadata: { dailyCount: dailyLimit.count },
    });

    return res.status(429).json({
      success: false,
      message: `You have reached the daily limit of ${MAX_REVIEWS_PER_DAY} reviews`,
    });
  }

  // ─────────────────────────────────────────────
  // STEP 7: VALIDATE PROS/CONS
  // ─────────────────────────────────────────────
  let sanitizedPros: string[] = [];
  let sanitizedCons: string[] = [];

  if (Array.isArray(pros)) {
    sanitizedPros = pros
      .map(p => sanitizeText(p))
      .filter(p => p.length > 0 && p.length <= MAX_PROS_CONS_LENGTH)
      .slice(0, MAX_PROS_CONS);
  }

  if (Array.isArray(cons)) {
    sanitizedCons = cons
      .map(c => sanitizeText(c))
      .filter(c => c.length > 0 && c.length <= MAX_PROS_CONS_LENGTH)
      .slice(0, MAX_PROS_CONS);
  }

  // ─────────────────────────────────────────────
  // STEP 8: VALIDATE MEDIA
  // ─────────────────────────────────────────────
  let validatedMedia: Array<{ url: string; type: 'image' | 'video' }> = [];

  if (Array.isArray(media) && media.length > 0) {
    validatedMedia = media
      .slice(0, MAX_MEDIA_ITEMS)
      .filter(item => {
        if (!item || !item.url || !item.type) return false;
        if (!['image', 'video'].includes(item.type)) return false;
        return validateMediaUrl(item.url);
      });
  }

  // ─────────────────────────────────────────────
// STEP 9: FETCH ENTITY SNAPSHOT
// ─────────────────────────────────────────────
let entitySnapshot: {
  name: string;
  slug?: string;
  imageUrl?: string;
  city?: string;
} = { name: 'Unknown Entity' };

try {
  if (entityType === 'property') {
    const property = await Property.findById(entityId)
      .select('title slug location images')
      .lean() as {
        title?: string;
        slug?: string;
        location?: { city?: string };
        images?: Array<{ url?: string }>;
      } | null;
    
    if (property) {
      entitySnapshot = {
        name: property.title || 'Unknown Property',
        slug: property.slug,
        imageUrl: property.images?.[0]?.url,
        city: property.location?.city,
      };
    }
  }
  // Add other entity types as needed (project, developer, agent, etc.)
} catch (error) {
  console.error('Failed to fetch entity snapshot:', error);
}

  // ─────────────────────────────────────────────
  // STEP 10: VERIFIED PURCHASE CHECK
  // ─────────────────────────────────────────────
  let isVerifiedPurchase = false;
  if (entityType === 'property') {
    isVerifiedPurchase = await hasVerifiedPurchase(userId, entityId);
  }

  // ─────────────────────────────────────────────
  // STEP 11: FETCH USER DETAILS
  // ─────────────────────────────────────────────
  const user = await User.findById(userId)
    .select('name email phone')
    .lean();

  // ─────────────────────────────────────────────
  // STEP 12: DETERMINE STATUS (Admin auto-approve)
  // ─────────────────────────────────────────────
  const status: ReviewStatus = userRole === 'admin' ? 'approved' : 'pending';
  const moderationNotes = userRole === 'admin' 
    ? `Curated review created by admin: ${session.user.email}`
    : undefined;

  // ─────────────────────────────────────────────
  // STEP 13: CREATE REVIEW
  // ─────────────────────────────────────────────
  const review = await Review.create({
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
    entitySnapshot,

    userId: new mongoose.Types.ObjectId(userId),
    reviewerName: isAnonymous ? 'Anonymous' : (user?.name || 'User'),
    reviewerEmail: user?.email || '',
    reviewerPhone: user?.phone || '',
    isVerifiedPurchase,
    isAnonymous: !!isAnonymous,

    rating,
    title: sanitizedTitle,
    content: sanitizedContent,
    pros: sanitizedPros,
    cons: sanitizedCons,
    detailedRatings: detailedRatings || undefined,
    media: validatedMedia,

    status,
    moderationNotes,
    moderatedBy: userRole === 'admin' ? new mongoose.Types.ObjectId(userId) : undefined,
    moderatedAt: userRole === 'admin' ? new Date() : undefined,

    verificationDetails: isVerifiedPurchase ? {
      method: 'verified_purchase',
      verifiedAt: new Date(),
    } : undefined,

    submissionMetadata: {
      ipAddress: clientIP,
      userAgent,
      source: 'web',
    },

    isFeatured: false,
    isDeleted: false,
  });

  // ─────────────────────────────────────────────
  // STEP 14: AUDIT LOG
  // ─────────────────────────────────────────────
  await logSecurityEvent({
    eventType: 'review_created',
    severity: 'low',
    userId,
    ipAddress: clientIP,
    userAgent,
    metadata: {
      reviewId: review._id.toString(),
      entityType,
      entityId,
      rating,
      status,
      isVerifiedPurchase,
    },
  });

  // ─────────────────────────────────────────────
  // STEP 15: SUCCESS RESPONSE
  // ─────────────────────────────────────────────
  return res.status(201).json({
    success: true,
    message: status === 'approved' 
      ? 'Review published successfully' 
      : 'Review submitted for moderation. It will be visible after approval.',
    data: [review],
    meta: {
      averageRating: rating,
      reviewCount: 1,
      breakdown: { [rating]: 1 },
    },
    pagination: {
      page: 1,
      limit: 1,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  });
}
