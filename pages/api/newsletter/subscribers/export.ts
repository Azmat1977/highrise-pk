// pages/api/newsletter/subscribers/export.ts
// 🔒 ENTERPRISE SUBSCRIBER EXPORT API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | CSV Stream Download
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET → Stream full subscriber list as downloadable CSV
//
// SECURITY FEATURES:
//   ✅ requireAdmin() auth guard
//   ✅ rateLimitAdmin() rate limiting
//   ✅ Status filter whitelist
//   ✅ CSV injection prevention (all cell values sanitized)
//   ✅ Cursor-based streaming (handles 100k+ subscribers)
//   ✅ logSecurityEvent (bulk_action_performed)
//   ✅ Security headers + request ID
//   ✅ No sensitive fields exported (no tokens, no IP, no userAgent)
//   ✅ Generic error messages
//
// COLUMNS EXPORTED:
//   email, name, status, source, subscribedAt,
//   verifiedAt, emailsSent, tags, utmSource,
//   utmMedium, utmCampaign
//
// QUERY PARAMS:
//   status → all | active | pending | unsubscribed | bounced
//            (default: all)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect                                 from '@/lib/db';
import NewsletterSubscriber                      from '@/models/NewsletterSubscriber';
import { requireAdmin }                          from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ALLOWED_STATUSES = ['all', 'active', 'pending', 'unsubscribed', 'bounced'] as const;
type StatusFilter = typeof ALLOWED_STATUSES[number];

// Cursor batch size — how many docs to fetch per DB round-trip
const CURSOR_BATCH_SIZE = 200;

// CSV column definitions
const CSV_HEADERS = [
  'email',
  'name',
  'status',
  'source',
  'subscribed_at',
  'verified_at',
  'emails_sent',
  'tags',
  'utm_source',
  'utm_medium',
  'utm_campaign',
] as const;

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

/**
 * Format a date for CSV — ISO string or empty string
 */
function formatDate(date: Date | undefined | null): string {
  if (!date) return '';
  try {
    return new Date(date).toISOString();
  } catch {
    return '';
  }
}

/**
 * Escape and quote a CSV cell value.
 *
 * Rules:
 * 1. Strip HTML tags
 * 2. Prevent CSV injection — strip leading = + - @ | chars
 * 3. If value contains comma, quote, or newline → wrap in double quotes
 * 4. Escape internal double quotes by doubling them
 */
function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '';

  let str = String(value);

  // Strip HTML tags
  str = str.replace(/<[^>]*>/g, '');

  // Prevent CSV injection (strip dangerous leading chars)
  str = str.replace(/^[=+\-@|]+/, '');

  // Trim whitespace
  str = str.trim();

  // Wrap in quotes if contains special characters
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape internal quotes by doubling
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }

  return str;
}

/**
 * Build a single CSV row string from an array of values.
 */
function buildCsvRow(values: (string | number | undefined | null)[]): string {
  return values.map(escapeCsvCell).join(',') + '\r\n';
}

/**
 * Generate the CSV filename with today's date.
 * Format: highrise-subscribers-YYYY-MM-DD.csv
 */
function generateFileName(status: StatusFilter): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const suffix = status === 'all' ? '' : `-${status}`;
  return `highrise-subscribers${suffix}-${date}.csv`;
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = makeRequestId();

  // Security headers — note: no Cache-Control here yet,
  // we set it after validating the request
  res.setHeader('X-Request-Id',           requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('X-XSS-Protection',       '1; mode=block');
  res.setHeader('Referrer-Policy',        'strict-origin-when-cross-origin');

  const clientIP  = getClientIP(req);
  const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 500);

  // ─────────────────────────────────────────────
  // STEP 1: Method guard
  // ─────────────────────────────────────────────
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.setHeader('Cache-Control', 'no-store, must-revalidate, private');
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
        action:   'subscriber_export_rate_limited',
        endpoint: '/api/newsletter/subscribers/export',
      },
    });
    res.setHeader('Cache-Control', 'no-store, must-revalidate, private');
    sendRateLimitResponse(res, rl);
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 3: Admin auth
  // ─────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ─────────────────────────────────────────────
  // STEP 4: Validate query params
  // ─────────────────────────────────────────────
  const rawStatus = String(req.query.status || 'all').toLowerCase().trim();

  if (!ALLOWED_STATUSES.includes(rawStatus as StatusFilter)) {
    res.setHeader('Cache-Control', 'no-store, must-revalidate, private');
    res.status(400).json({
      success: false,
      message: `Invalid status filter. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
      requestId,
    });
    return;
  }

  const status = rawStatus as StatusFilter;

  await dbConnect();

  try {
    // ─────────────────────────────────────────────
    // STEP 5: Build DB query
    // ─────────────────────────────────────────────
    const query: Record<string, unknown> =
      status === 'all' ? {} : { status };

    // Count for audit log
    const totalCount = await NewsletterSubscriber.countDocuments(query);

    // ─────────────────────────────────────────────
    // STEP 6: Audit log BEFORE streaming
    // (log intent — in case stream is interrupted)
    // ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     'bulk_action_performed',
      severity: 'high',
      userId:   auth.id,
      email:    auth.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        action:       'subscriber_csv_export',
        statusFilter: status,
        totalCount,
        fileName:     generateFileName(status),
      },
    });

    // ─────────────────────────────────────────────
    // STEP 7: Set CSV download headers
    // ─────────────────────────────────────────────
    const fileName = generateFileName(status);

    res.setHeader('Content-Type',        'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control',       'no-store, must-revalidate, private');
    res.setHeader('X-Total-Count',       String(totalCount));

    // ─────────────────────────────────────────────
    // STEP 8: Write CSV header row
    // ─────────────────────────────────────────────

    // UTF-8 BOM — ensures Excel opens CSV correctly (especially
    // important for international chars in Pakistani names)
    res.write('\uFEFF');

    // Header row
    res.write(buildCsvRow([...CSV_HEADERS]));

    // ─────────────────────────────────────────────
    // STEP 9: Stream data rows via cursor
    // Cursor prevents loading entire collection into memory
    // ─────────────────────────────────────────────
    const cursor = NewsletterSubscriber.find(query)
      .select(
        'email name status source subscribedAt verifiedAt ' +
        'emailsSent tags utmSource utmMedium utmCampaign'
      )
      .sort({ subscribedAt: -1 })
      .lean()
      .cursor({ batchSize: CURSOR_BATCH_SIZE });

    let rowsWritten = 0;

    for await (const doc of cursor) {
      const sub = doc as {
        email:        string;
        name?:        string;
        status:       string;
        source:       string;
        subscribedAt?: Date;
        verifiedAt?:   Date;
        emailsSent:    number;
        tags:          string[];
        utmSource?:    string;
        utmMedium?:    string;
        utmCampaign?:  string;
      };

      // Join tags as pipe-separated string
      const tagsStr = Array.isArray(sub.tags) ? sub.tags.join('|') : '';

      const row = buildCsvRow([
        sub.email,
        sub.name            || '',
        sub.status,
        sub.source          || '',
        formatDate(sub.subscribedAt),
        formatDate(sub.verifiedAt),
        sub.emailsSent      ?? 0,
        tagsStr,
        sub.utmSource       || '',
        sub.utmMedium       || '',
        sub.utmCampaign     || '',
      ]);

      res.write(row);
      rowsWritten++;
    }

    // ─────────────────────────────────────────────
    // STEP 10: End stream
    // ─────────────────────────────────────────────
    res.end();

    // Log actual rows written (may differ from count
    // if docs were deleted during streaming)
    if (rowsWritten !== totalCount) {
      console.warn(
        `[Export] Count mismatch: expected ${totalCount}, wrote ${rowsWritten}`
      );
    }

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
        action: 'subscriber_export_failed',
        error:  errMsg.slice(0, 200),
      },
    });

    // If headers already sent (streaming started),
    // we cannot send a JSON error — just end the response
    if (res.headersSent) {
      res.end();
      return;
    }

    res.setHeader('Cache-Control', 'no-store, must-revalidate, private');
    res.status(500).json({
      success: false,
      message: 'Export failed. Please try again.',
      requestId,
    });
    return;
  }
}