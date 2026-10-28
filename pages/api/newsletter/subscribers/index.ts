// ========== FILE: pages/api/newsletter/subscribers/index.ts ==========
// 🔒 ENTERPRISE-SECURED SUBSCRIBERS API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | List & Add
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET  → List all subscribers with search/filter/pagination
//   POST → Manually add a subscriber (admin action)
//
// SECURITY FIXES APPLIED (V6.9.0):
//   ✅ requireAdmin() auth guard (was: no auth — DATA LEAK!)
//   ✅ rateLimitAdmin() rate limit (was: no rate limit)
//   ✅ Search regex escaping (was: ReDoS attack vector)
//   ✅ Pagination limits (was: could dump entire DB)
//   ✅ Email validation & normalization (was: partial)
//   ✅ Name sanitization (was: raw stored)
//   ✅ Tag validation & limits (was: unlimited)
//   ✅ Source whitelist (was: any string)
//   ✅ Status filter whitelist (was: any string)
//   ✅ Security headers on all responses
//   ✅ Audit logging (view, add, reactivate)
//   ✅ Request ID tracking
//   ✅ Generic error messages
//   ✅ Excluded sensitive fields from GET responses
//   ✅ Disposable email blocking (matches subscribe.ts)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse }   from 'next';
import dbConnect                                   from '@/lib/dbConnect';
import NewsletterSubscriber                        from '@/models/NewsletterSubscriber';
import { requireAdmin }                            from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse }   from '@/lib/rateLimit';
import { logSecurityEvent }                        from '@/lib/security/logSecurityEvent';
import crypto                                      from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_NAME_LENGTH       = 100;
const MAX_TAGS_COUNT        = 10;
const MAX_TAG_LENGTH        = 50;
const MAX_SEARCH_LENGTH     = 100;
const MAX_PAGE_LIMIT        = 100;
const DEFAULT_PAGE_LIMIT    = 50;

const ALLOWED_STATUSES = ['all', 'active', 'unsubscribed', 'bounced', 'pending'];

const ALLOWED_SOURCES  = [
  'admin', 'website', 'landing_page', 'property_page',
  'blog', 'referral', 'import', 'api',
];

// Disposable email domains (spam prevention)
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'guerrillamail.com',
  'tempmail.com', 'temp-mail.org', 'yopmail.com', 'getnada.com',
  'throwaway.email', 'fakeinbox.com',
]);

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  return req.socket?.remoteAddress || 'unknown';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',            requestId);
  res.setHeader('X-Content-Type-Options',  'nosniff');
  res.setHeader('X-Frame-Options',         'DENY');
  res.setHeader('X-XSS-Protection',        '1; mode=block');
  res.setHeader('Referrer-Policy',         'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control',           'no-store, must-revalidate, private');
  res.setHeader('Pragma',                  'no-cache');
}

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isDisposableEmail(email: string): boolean {
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) return true;
  const domain = parts[1];
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  // Suspicious patterns
  return ['tempmail', 'temp-mail', 'throwaway', 'fakeinbox'].some((p) => domain.includes(p));
}

/**
 * Normalize email: lowercase + remove Gmail dots + strip +suffixes
 * Matches your NewsletterSubscriber model normalization.
 */
function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const [localPart, domain] = lower.split('@');
  if (!localPart || !domain) return lower;

  // Gmail: remove dots and +suffixes
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const cleaned = localPart.split('+')[0].replace(/\./g, '');
    return `${cleaned}@gmail.com`;
  }

  // Other providers: just strip +suffix
  const cleaned = localPart.split('+')[0];
  return `${cleaned}@${domain}`;
}

/**
 * Sanitize plain text — remove HTML, trim, limit length.
 */
function sanitizeText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';
  const stripped = text.replace(/<[^>]*>/g, '');
  return stripped.trim().slice(0, maxLength);
}

/**
 * Escape regex special characters — prevents ReDoS attacks.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate secure unsubscribe token.
 */
function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP  = getClientIP(req);
  const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 500);

  // ─────────────────────────────────────────────
  // STEP 1: Method validation
  // ─────────────────────────────────────────────
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 2: Rate limit
  // ─────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    await logSecurityEvent({
      type:     'rate_limit_exceeded',
      severity: 'medium',
      ip:       clientIP,
      userAgent,
      metadata: {
        context:  'newsletter_subscribers_index',
        endpoint: '/api/newsletter/subscribers',
        method:   req.method,
      },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 3: Admin authentication
  // ─────────────────────────────────────────────
  const adminToken = await requireAdmin(req, res);
  if (!adminToken) return;

  await dbConnect();

  // ═══════════════════════════════════════════════════════════
  // GET → List subscribers
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const {
        status = 'all',
        page   = '1',
        limit  = String(DEFAULT_PAGE_LIMIT),
        search = '',
      } = req.query;

      // ─────────────────────────────────────────────
      // Validate & sanitize pagination
      // ─────────────────────────────────────────────
      const pageNum  = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(
        MAX_PAGE_LIMIT,
        Math.max(1, parseInt(String(limit), 10) || DEFAULT_PAGE_LIMIT)
      );
      const skip = (pageNum - 1) * limitNum;

      // ─────────────────────────────────────────────
      // Validate status filter
      // ─────────────────────────────────────────────
      const statusStr = String(status);
      if (!ALLOWED_STATUSES.includes(statusStr)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status filter',
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Validate & sanitize search query
      // ─────────────────────────────────────────────
      const searchStr = sanitizeText(String(search), MAX_SEARCH_LENGTH);

      // Build query
      const query: Record<string, unknown> = {};

      if (statusStr !== 'all') {
        query.status = statusStr;
      }

      if (searchStr) {
        // Escape regex special chars to prevent ReDoS
        const escaped = escapeRegex(searchStr);
        query.$or = [
          { email:           { $regex: escaped, $options: 'i' } },
          { normalizedEmail: { $regex: escaped, $options: 'i' } },
          { name:            { $regex: escaped, $options: 'i' } },
        ];
      }

      // ─────────────────────────────────────────────
      // Fetch subscribers (exclude sensitive fields)
      // ─────────────────────────────────────────────
      const [subscribers, total, activeCount, unsubscribedCount, bouncedCount, pendingCount] = await Promise.all([
        NewsletterSubscriber.find(query)
          .select('-verificationToken -unsubscribeToken -__v')
          .sort({ subscribedAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        NewsletterSubscriber.countDocuments(query),
        NewsletterSubscriber.countDocuments({ status: 'active' }),
        NewsletterSubscriber.countDocuments({ status: 'unsubscribed' }),
        NewsletterSubscriber.countDocuments({ status: 'bounced' }),
        NewsletterSubscriber.countDocuments({ status: 'pending' }),
      ]);

      // ─────────────────────────────────────────────
      // Audit log (viewing subscriber list is sensitive)
      // ─────────────────────────────────────────────
      // Only log if search was used (targeted lookup) or bulk fetch
      if (searchStr || limitNum >= 50) {
        await logSecurityEvent({
          type:     'admin_action',
          severity: 'low',
          userId:   adminToken.id,
          email:    adminToken.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            context:      'newsletter_subscribers_index',
            action:       'subscribers_listed',
            statusFilter: statusStr,
            searchUsed:   !!searchStr,
            resultCount:  subscribers.length,
          },
        });
      }

      res.status(200).json({
        success: true,
        subscribers,
        stats: {
          total:        activeCount + unsubscribedCount + bouncedCount + pendingCount,
          active:       activeCount,
          unsubscribed: unsubscribedCount,
          bounced:      bouncedCount,
          pending:      pendingCount,
        },
        pagination: {
          page:       pageNum,
          limit:      limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
        requestId,
      });
      return;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context: 'newsletter_subscribers_index',
          action:  'list_failed',
          error:   errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscribers',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // POST → Add new subscriber
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'POST') {
    try {
      const { email, name, source = 'admin', tags = [] } = req.body || {};

      // ─────────────────────────────────────────────
      // Validate email
      // ─────────────────────────────────────────────
      if (!email || typeof email !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          requestId,
        });
        return;
      }

      const emailClean = email.toLowerCase().trim();

      if (!isValidEmail(emailClean)) {
        res.status(400).json({
          success: false,
          message: 'Please enter a valid email address',
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Block disposable emails
      // ─────────────────────────────────────────────
      if (isDisposableEmail(emailClean)) {
        await logSecurityEvent({
          type:     'suspicious_activity',
          severity: 'medium',
          userId:   adminToken.id,
          email:    adminToken.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            context: 'newsletter_subscribers_index',
            reason:  'disposable_email_blocked',
            attemptedEmail: emailClean.slice(0, 100),
          },
        });
        res.status(400).json({
          success: false,
          message: 'Disposable email addresses are not allowed',
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Sanitize name
      // ─────────────────────────────────────────────
      const nameClean = name ? sanitizeText(String(name), MAX_NAME_LENGTH) : '';

      // ─────────────────────────────────────────────
      // Validate source
      // ─────────────────────────────────────────────
      const sourceStr = String(source);
      if (!ALLOWED_SOURCES.includes(sourceStr)) {
        res.status(400).json({
          success: false,
          message: 'Invalid source',
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Validate tags
      // ─────────────────────────────────────────────
      let cleanTags: string[] = [];
      if (Array.isArray(tags)) {
        cleanTags = tags
          .filter((t: unknown): t is string => typeof t === 'string')
          .map((t) => sanitizeText(t, MAX_TAG_LENGTH))
          .filter((t) => t.length > 0)
          .slice(0, MAX_TAGS_COUNT);
      }

      // ─────────────────────────────────────────────
      // Check for existing subscriber
      // ─────────────────────────────────────────────
      const normalizedEmail = normalizeEmail(emailClean);

      const existingSubscriber = await NewsletterSubscriber.findOne({
        $or: [
          { email:           emailClean },
          { normalizedEmail: normalizedEmail },
        ],
      });

      if (existingSubscriber) {
        // Reactivate if unsubscribed
        if (existingSubscriber.status === 'unsubscribed') {
          existingSubscriber.status         = 'active';
          existingSubscriber.subscribedAt   = new Date();
          existingSubscriber.unsubscribedAt = undefined;

          if (nameClean) {
            existingSubscriber.name = nameClean;
          }

          // Generate new unsubscribe token for security
          existingSubscriber.unsubscribeToken = generateUnsubscribeToken();

          await existingSubscriber.save();

          await logSecurityEvent({
            type:     'admin_action',
            severity: 'low',
            userId:   adminToken.id,
            email:    adminToken.email,
            ip:       clientIP,
            userAgent,
            metadata: {
              context:       'newsletter_subscribers_index',
              action:        'subscriber_reactivated',
              subscriberId:  String(existingSubscriber._id),
              subscriberEmail: emailClean,
            },
          });

          res.status(200).json({
            success: true,
            message: 'Subscriber reactivated successfully',
            subscriber: {
              _id:          existingSubscriber._id,
              email:        existingSubscriber.email,
              name:         existingSubscriber.name,
              status:       existingSubscriber.status,
              subscribedAt: existingSubscriber.subscribedAt,
            },
            requestId,
          });
          return;
        }

        // Already active or pending
        res.status(409).json({
          success: false,
          message: existingSubscriber.status === 'pending'
            ? 'This email is pending verification'
            : 'This email is already subscribed',
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Create new subscriber (active by default for admin adds)
      // ─────────────────────────────────────────────
      const unsubscribeToken = generateUnsubscribeToken();

      const subscriber = await NewsletterSubscriber.create({
        email:            emailClean,
        normalizedEmail,
        name:             nameClean,
        source:           sourceStr,
        status:           'active', // Admin-added = pre-verified
        subscribedAt:     new Date(),
        verifiedAt:       new Date(),
        unsubscribeToken,
        tags:             cleanTags,
        ipAddress:        clientIP,
        userAgent:        userAgent.slice(0, 500),
      });

      // ─────────────────────────────────────────────
      // Audit log
      // ─────────────────────────────────────────────
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context:         'newsletter_subscribers_index',
          action:          'subscriber_manually_added',
          subscriberId:    String(subscriber._id),
          subscriberEmail: emailClean,
          source:          sourceStr,
          tagCount:        cleanTags.length,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Subscriber added successfully',
        subscriber: {
          _id:          subscriber._id,
          email:        subscriber.email,
          name:         subscriber.name,
          status:       subscriber.status,
          subscribedAt: subscriber.subscribedAt,
        },
        requestId,
      });
      return;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';

      // Handle MongoDB duplicate key error
      if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 11000) {
        res.status(409).json({
          success: false,
          message: 'This email is already in the system',
          requestId,
        });
        return;
      }

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context: 'newsletter_subscribers_index',
          action:  'add_failed',
          error:   errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to add subscriber',
        requestId,
      });
      return;
    }
  }
}
// ========== END OF FILE ==========