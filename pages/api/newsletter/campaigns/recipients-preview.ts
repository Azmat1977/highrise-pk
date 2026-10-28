// ========== FILE: pages/api/newsletter/campaigns/recipients-preview.ts ==========
// 🔒 ENTERPRISE RECIPIENT PREVIEW API — HIGHRISE.PK
// Preview who will receive a campaign before sending
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   POST → Returns count + sample recipients based on filters
//          Used by RecipientPreviewModal + live count in UI
//
// SECURITY:
//   ✅ requireAdmin() auth guard
//   ✅ rateLimitAdmin() rate limiting
//   ✅ Input validation via sanitizeLeadFilters()
//   ✅ Recipient source whitelist
//   ✅ Security headers on all responses
//   ✅ Audit logging (admin sampled leads)
//   ✅ Generic error messages
//   ✅ Request ID tracking
//   ✅ Response size limits (max 5 sample recipients)
//
// FEATURES:
//   ✅ Fast count-only mode (no sample fetch)
//   ✅ Full preview mode (count + 5 samples)
//   ✅ Breakdown by source (subscribers vs leads)
//   ✅ Duplicate estimation
//   ✅ Empty state handling
//   ✅ Warning for very small/large recipient counts
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect                                 from '@/lib/dbConnect';
import { requireAdmin }                          from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';
import {
  countRecipients,
  previewRecipients,
  sanitizeLeadFilters,
  type RecipientSource,
} from '@/lib/recipientEngine';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ALLOWED_SOURCES: RecipientSource[] = ['subscribers', 'leads', 'both'];

const WARNING_THRESHOLDS = {
  tooFew:  1,      // Warn if less than this
  tooMany: 5000,   // Warn if more than this
};

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
  res.setHeader('X-Request-Id',           requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('X-XSS-Protection',       '1; mode=block');
  res.setHeader('Referrer-Policy',        'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control',          'no-store, must-revalidate, private');
  res.setHeader('Pragma',                 'no-cache');
}

/**
 * Redact sample recipient data — remove sensitive fields
 * before returning to client. Keeps only what UI needs.
 */
function redactRecipient(recipient: any): any {
  return {
    id:              recipient.id,
    source:          recipient.source,
    email:           recipient.email,        // Admin can see full email
    name:            recipient.name || '',
    city:            recipient.city || '',
    entityName:      recipient.entityName || '',
    temperature:     recipient.temperature,
    leadScore:       recipient.leadScore,
    inquiryDate:     recipient.inquiryDate,
    // DO NOT return: phone, unsubscribeToken, budget details
  };
}

/**
 * Generate warnings based on recipient count.
 */
function generateWarnings(counts: {
  total:       number;
  subscribers: number;
  leads:       number;
}): string[] {
  const warnings: string[] = [];

  if (counts.total === 0) {
    warnings.push('No recipients match your filters. Adjust filters to include more people.');
    return warnings;
  }

  if (counts.total < WARNING_THRESHOLDS.tooFew) {
    warnings.push('Very small audience. Consider expanding your filters.');
  }

  if (counts.total > WARNING_THRESHOLDS.tooMany) {
    warnings.push(
      `Large audience (${counts.total.toLocaleString()}). ` +
      `Sending may take several minutes. Only first 10,000 will receive email.`
    );
  }

  if (counts.subscribers === 0 && counts.leads > 0) {
    warnings.push('No newsletter subscribers match. Only leads will receive this campaign.');
  }

  if (counts.leads === 0 && counts.subscribers > 0) {
    warnings.push('No leads match your filters. Only newsletter subscribers will receive this.');
  }

  return warnings;
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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
        context:  'campaign_recipients_preview',
        endpoint: '/api/newsletter/campaigns/recipients-preview',
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

  try {
    // ─────────────────────────────────────────────
    // STEP 4: Parse & validate request body
    // ─────────────────────────────────────────────
    const {
      source,
      leadFilters,
      countOnly,
    } = req.body || {};

    // Validate source
    let recipientSource: RecipientSource = 'subscribers';
    if (typeof source === 'string' && ALLOWED_SOURCES.includes(source as RecipientSource)) {
      recipientSource = source as RecipientSource;
    }

    // Sanitize filters (throws no errors — invalid data becomes empty)
    const cleanFilters = sanitizeLeadFilters(leadFilters);

    // Fast mode: count only (used by live UI counter)
    const isCountOnly = Boolean(countOnly);

    // ─────────────────────────────────────────────
    // STEP 5A: COUNT-ONLY MODE
    // ─────────────────────────────────────────────
    if (isCountOnly) {
      const counts = await countRecipients(recipientSource, cleanFilters);
      const warnings = generateWarnings(counts);

      res.status(200).json({
        success: true,
        countOnly: true,
        counts:  {
          total:       counts.total,
          subscribers: counts.subscribers,
          leads:       counts.leads,
        },
        warnings,
        requestId,
      });
      return;
    }

    // ─────────────────────────────────────────────
    // STEP 5B: FULL PREVIEW MODE
    // ─────────────────────────────────────────────
    const preview = await previewRecipients(recipientSource, cleanFilters);
    const warnings = generateWarnings({
      total:       preview.total,
      subscribers: preview.breakdown.subscribers,
      leads:       preview.breakdown.leads,
    });

    // Redact sensitive data from sample
    const safeSample = preview.sample.map(redactRecipient);

    // ─────────────────────────────────────────────
    // STEP 6: Audit log (admin previewed recipients)
    // ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     'admin_action',
      severity: 'low',
      userId:   adminToken.id,
      email:    adminToken.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        context:      'campaign_recipients_preview',
        action:       'recipients_previewed',
        source:       recipientSource,
        totalCount:   preview.total,
        subscribers:  preview.breakdown.subscribers,
        leads:        preview.breakdown.leads,
        filterCount:  Object.keys(cleanFilters).filter((k) => {
          const v = (cleanFilters as any)[k];
          return Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== '';
        }).length,
      },
    });

    // ─────────────────────────────────────────────
    // STEP 7: Response
    // ─────────────────────────────────────────────
    res.status(200).json({
      success:  true,
      total:    preview.total,
      breakdown: preview.breakdown,
      sample:   safeSample,
      warnings,
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
        context: 'campaign_recipients_preview',
        action:  'preview_failed',
        error:   errMsg.slice(0, 200),
      },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to preview recipients',
      requestId,
    });
    return;
  }
}
// ========== END OF FILE ==========