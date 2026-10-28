// pages/api/admin/security/events.ts
// 🔒 ENTERPRISE SECURITY EVENTS API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | Event Viewer
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET → Paginated security event list with filters:
//     • severity (low | medium | high | critical | all)
//     • type (specific SecurityEventType or "all")
//     • search (email / masked IP / metadata text)
//     • dateFrom / dateTo
//     • page + limit
//
// SECURITY:
//   ✅ requireAdmin() auth guard
//   ✅ rateLimitAdmin() rate limiting
//   ✅ Input validation + whitelisting
//   ✅ No raw IP exposure (ipRaw not selected)
//   ✅ No sensitive hashed values exposed
//   ✅ logSecurityEvent audit logging on suspicious usage
//   ✅ Security headers + request ID
//   ✅ Generic error messages
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect                                 from '@/lib/dbConnect';
import SecurityEvent                             from '@/models/SecurityEvent';
import type { SeverityLevel, SecurityEventType } from '@/models/SecurityEvent';
import { requireAdmin }                          from '@/lib/requireAdmin';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;
const MAX_SEARCH_LENGTH = 100;

const ALLOWED_SEVERITIES: (SeverityLevel | 'all')[] = [
  'all',
  'low',
  'medium',
  'high',
  'critical',
];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, must-revalidate, private');
}

function sanitizeSearch(input: unknown): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[<>'"]/g, '').trim().slice(0, MAX_SEARCH_LENGTH);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  // STEP 1: Method guard
  // ─────────────────────────────────────────────
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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
        action:   'security_events_rate_limited',
        endpoint: '/api/admin/security/events',
      },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 3: Admin auth
  // ─────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  await dbConnect();

  try {
    const {
      severity = 'all',
      type     = 'all',
      search   = '',
      dateFrom,
      dateTo,
      page     = '1',
      limit    = String(DEFAULT_LIMIT),
    } = req.query;

    // ── Validate severity ─────────────────────
    const severityStr = String(severity).toLowerCase();
    if (!ALLOWED_SEVERITIES.includes(severityStr as any)) {
      res.status(400).json({
        success: false,
        message: `Invalid severity filter`,
        requestId,
      });
      return;
    }

    // ── Validate pagination ───────────────────
    const pageNum  = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(String(limit), 10) || DEFAULT_LIMIT)
    );
    const skip = (pageNum - 1) * limitNum;

    // ── Build query ───────────────────────────
    const query: Record<string, any> = {};

    if (severityStr !== 'all') {
      query.severity = severityStr;
    }

    if (type && type !== 'all') {
      query.type = String(type);
    }

    // Date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        const from = new Date(String(dateFrom));
        if (!isNaN(from.getTime())) {
          query.createdAt.$gte = from;
        }
      }
      if (dateTo) {
        const to = new Date(String(dateTo));
        if (!isNaN(to.getTime())) {
          query.createdAt.$lte = to;
        }
      }
    }

    // Search (email, masked IP, metadata)
    const searchStr = sanitizeSearch(search);
    if (searchStr) {
      const escaped = escapeRegex(searchStr);
      query.$or = [
        { email: { $regex: escaped, $options: 'i' } },
        { ip:    { $regex: escaped, $options: 'i' } },
        { 'metadata.action': { $regex: escaped, $options: 'i' } },
      ];
    }

    // ── Fetch events ──────────────────────────
    const [events, total] = await Promise.all([
      SecurityEvent.find(query)
        .select('-ipRaw -emailHash -ipHash -__v') // hide sensitive fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SecurityEvent.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      events,
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
      userId:   auth.id,
      email:    auth.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        action: 'security_events_fetch_failed',
        error:  errMsg.slice(0, 200),
      },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch security events',
      requestId,
    });
    return;
  }
}