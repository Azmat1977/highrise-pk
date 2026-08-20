// pages/api/automation/sequences/index.ts
// ═══════════════════════════════════════════════════════════════
// AUTOMATION SEQUENCES API — LIST & CREATE
// Admin only — rate limited — full security
// ═══════════════════════════════════════════════════════════════
// GET  → List all sequences with stats + pagination
// POST → Create new automation sequence
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose                                  from 'mongoose';
import DOMPurify                                 from 'isomorphic-dompurify';
import dbConnect                                 from '@/lib/dbConnect';
import AutomationSequence                        from '@/models/AutomationSequence';
import AutomationEnrollment                      from '@/models/AutomationEnrollment';
import { requireAdmin }                          from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';

// ─── Constants ────────────────────────────────────────────────

const MAX_NAME_LENGTH        = 150;
const MAX_DESC_LENGTH        = 1000;
const MAX_SUBJECT_LENGTH     = 200;
const MAX_PREVIEW_LENGTH     = 300;
const MAX_CONTENT_LENGTH     = 500_000;
const MAX_FROM_NAME_LENGTH   = 150;
const MAX_FROM_EMAIL_LENGTH  = 200;
const MAX_STEPS              = 20;
const DEFAULT_PAGE_LIMIT     = 20;
const MAX_PAGE_LIMIT         = 100;

const ALLOWED_TRIGGERS = [
  'subscriber_joined',
  'lead_created',
  'lead_status_changed',
  'manual',
] as const;

const ALLOWED_STATUSES = ['draft', 'active', 'paused', 'archived'] as const;

const ALLOWED_RECIPIENT_TYPES = [
  'subscribers',
  'leads',
  'both',
] as const;

const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/;

// ─── Helpers ──────────────────────────────────────────────────

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
}

function sanitizeText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr', 'i', 'img', 'li', 'ol', 'p', 'span', 'strong', 'table',
      'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'blockquote', 'code',
      'pre', 'small', 'sub', 'sup', 'u',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
      'style', 'class', 'id', 'colspan', 'rowspan', 'align', 'valign',
      'bgcolor', 'border', 'cellpadding', 'cellspacing', 'title',
    ],
    ALLOW_DATA_ATTR:  false,
    FORBID_TAGS:      ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR:      ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
  });
}

function validateEmail(email: string): boolean {
  if (!email) return true; // empty is allowed (optional field)
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Validate and sanitize a single step object from request body.
 * Returns cleaned step or null if invalid.
 */
function sanitizeStep(raw: any, stepIndex: number): {
  stepNumber:  number;
  delayDays:   number;
  subject:     string;
  previewText: string;
  content:     string;
  fromName:    string;
  fromEmail:   string;
  replyTo:     string;
} | null {
  if (!raw || typeof raw !== 'object') return null;

  const subject = sanitizeText(String(raw.subject || ''), MAX_SUBJECT_LENGTH);
  // Subject is required
  if (!subject) return null;

  const content = sanitizeHtml(String(raw.content || ''));
  // Content is required
  if (!content.trim()) return null;

  const delayDays = Math.max(
    0,
    Math.min(365, parseInt(String(raw.delayDays ?? 0), 10) || 0)
  );

  const fromEmail = String(raw.fromEmail || '').trim().toLowerCase();
  if (fromEmail && !validateEmail(fromEmail)) return null;

  return {
    stepNumber:  stepIndex + 1,
    delayDays,
    subject,
    previewText: sanitizeText(String(raw.previewText || ''), MAX_PREVIEW_LENGTH),
    content,
    fromName:    sanitizeText(String(raw.fromName   || ''), MAX_FROM_NAME_LENGTH),
    fromEmail,
    replyTo:     sanitizeText(String(raw.replyTo    || ''), MAX_FROM_EMAIL_LENGTH),
  };
}

// ─── Main Handler ─────────────────────────────────────────────

export default async function handler(
  req:  NextApiRequest,
  res:  NextApiResponse
): Promise<void> {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP  = getClientIP(req);
  const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 500);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
    return;
  }

  // ── Rate limit ───────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    await logSecurityEvent({
      type:      'rate_limit_exceeded',
      severity:  'medium',
      ip:        clientIP,
      userAgent,
      metadata:  { requestId, action: 'automation_sequences_index' },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ── Auth guard ───────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  await dbConnect();

  // ════════════════════════════════════════════════════════════
  // GET — List all sequences
  // ════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const {
        status,
        trigger,
        page  = '1',
        limit = String(DEFAULT_PAGE_LIMIT),
      } = req.query;

      // Pagination
      const pageNum  = Math.max(1, parseInt(String(page),  10) || 1);
      const limitNum = Math.min(
        MAX_PAGE_LIMIT,
        Math.max(1, parseInt(String(limit), 10) || DEFAULT_PAGE_LIMIT)
      );
      const skip = (pageNum - 1) * limitNum;

      // Build filter
      const filter: Record<string, unknown> = {};

      if (status && status !== 'all') {
        const statusStr = String(status);
        if (!ALLOWED_STATUSES.includes(statusStr as any)) {
          res.status(400).json({
            success: false,
            message: 'Invalid status filter',
            requestId,
          });
          return;
        }
        filter.status = statusStr;
      }

      if (trigger && trigger !== 'all') {
        const triggerStr = String(trigger);
        if (!ALLOWED_TRIGGERS.includes(triggerStr as any)) {
          res.status(400).json({
            success: false,
            message: 'Invalid trigger filter',
            requestId,
          });
          return;
        }
        filter.trigger = triggerStr;
      }

      // Fetch sequences + total
      const [sequences, total] = await Promise.all([
        AutomationSequence.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .select('-steps.content') // Exclude heavy content from list
          .lean(),
        AutomationSequence.countDocuments(filter),
      ]);

      // Aggregate summary stats across all sequences
      const [draft, active, paused, archived] = await Promise.all([
        AutomationSequence.countDocuments({ status: 'draft'    }),
        AutomationSequence.countDocuments({ status: 'active'   }),
        AutomationSequence.countDocuments({ status: 'paused'   }),
        AutomationSequence.countDocuments({ status: 'archived' }),
      ]);

      // Total active enrollments across all sequences
      const totalActiveEnrollments = await AutomationEnrollment.countDocuments({
        status: 'active',
      });

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        ip:       clientIP,
        userAgent,
        metadata: {
          requestId,
          action: 'automation_sequences_listed',
          count:  sequences.length,
        },
      });

      res.status(200).json({
        success: true,
        sequences,
        stats: {
          total:   draft + active + paused + archived,
          draft,
          active,
          paused,
          archived,
          totalActiveEnrollments,
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

    } catch (err) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        ip:       clientIP,
        userAgent,
        metadata: {
          requestId,
          action: 'automation_sequences_list_error',
          error:  err instanceof Error ? err.message : 'unknown',
        },
      });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sequences',
        requestId,
      });
      return;
    }
  }

  // ════════════════════════════════════════════════════════════
  // POST — Create new sequence
  // ════════════════════════════════════════════════════════════
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      // ── Required field: name ──────────────────────────────
      const name = sanitizeText(String(body.name || ''), MAX_NAME_LENGTH);
      if (!name || name.length < 3) {
        res.status(400).json({
          success: false,
          message: 'Sequence name is required (minimum 3 characters)',
          requestId,
        });
        return;
      }

      // ── Required field: trigger ───────────────────────────
      const trigger = String(body.trigger || '');
      if (!ALLOWED_TRIGGERS.includes(trigger as any)) {
        res.status(400).json({
          success: false,
          message: `Invalid trigger. Must be one of: ${ALLOWED_TRIGGERS.join(', ')}`,
          requestId,
        });
        return;
      }

      // ── Optional: status (default draft) ─────────────────
      const status = String(body.status || 'draft');
      if (!ALLOWED_STATUSES.includes(status as any)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
          requestId,
        });
        return;
      }

      // ── Optional: recipientType ───────────────────────────
      const recipientType = String(body.recipientType || 'subscribers');
      if (!ALLOWED_RECIPIENT_TYPES.includes(recipientType as any)) {
        res.status(400).json({
          success: false,
          message: `Invalid recipientType. Must be: ${ALLOWED_RECIPIENT_TYPES.join(', ')}`,
          requestId,
        });
        return;
      }

      // ── Optional: description ─────────────────────────────
      const description = sanitizeText(
        String(body.description || ''),
        MAX_DESC_LENGTH
      );

      // ── Optional: steps ───────────────────────────────────
      let cleanSteps: ReturnType<typeof sanitizeStep>[] = [];

      if (Array.isArray(body.steps) && body.steps.length > 0) {
        if (body.steps.length > MAX_STEPS) {
          res.status(400).json({
            success: false,
            message: `Maximum ${MAX_STEPS} steps allowed per sequence`,
            requestId,
          });
          return;
        }

        const sanitized = body.steps
          .map((s: any, i: number) => sanitizeStep(s, i))
          .filter(Boolean);

        cleanSteps = sanitized;
      }

      // ── Validate: cannot activate with empty steps ────────
      if (status === 'active' && cleanSteps.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot activate a sequence with no steps. Add at least one step.',
          requestId,
        });
        return;
      }

      // ── Optional: triggerFilters ──────────────────────────
      const rawFilters = body.triggerFilters || {};
      const triggerFilters = {
        leadStatuses:
          Array.isArray(rawFilters.leadStatuses)
            ? rawFilters.leadStatuses
                .filter((s: unknown) => typeof s === 'string')
                .slice(0, 20)
            : [],
        leadCities:
          Array.isArray(rawFilters.leadCities)
            ? rawFilters.leadCities
                .filter((s: unknown) => typeof s === 'string')
                .slice(0, 30)
            : [],
        leadSources:
          Array.isArray(rawFilters.leadSources)
            ? rawFilters.leadSources
                .filter((s: unknown) => typeof s === 'string')
                .slice(0, 20)
            : [],
        leadTypes:
          Array.isArray(rawFilters.leadTypes)
            ? rawFilters.leadTypes
                .filter((s: unknown) => typeof s === 'string')
                .slice(0, 20)
            : [],
        fromStatus:
          typeof rawFilters.fromStatus === 'string'
            ? sanitizeText(rawFilters.fromStatus, 60)
            : '',
        toStatus:
          typeof rawFilters.toStatus === 'string'
            ? sanitizeText(rawFilters.toStatus, 60)
            : '',
        subscriberSources:
          Array.isArray(rawFilters.subscriberSources)
            ? rawFilters.subscriberSources
                .filter((s: unknown) => typeof s === 'string')
                .slice(0, 20)
            : [],
      };

      // ── Optional: default sender ──────────────────────────
      const defaultFromName  = sanitizeText(
        String(body.defaultFromName  || 'Highrise.pk'),
        MAX_FROM_NAME_LENGTH
      );
      const defaultFromEmail = String(body.defaultFromEmail || '').trim().toLowerCase();
      const defaultReplyTo   = String(body.defaultReplyTo   || '').trim().toLowerCase();

      if (defaultFromEmail && !validateEmail(defaultFromEmail)) {
        res.status(400).json({
          success: false,
          message: 'Invalid default sender email address',
          requestId,
        });
        return;
      }
      if (defaultReplyTo && !validateEmail(defaultReplyTo)) {
        res.status(400).json({
          success: false,
          message: 'Invalid default reply-to email address',
          requestId,
        });
        return;
      }

      // ── Optional: safety settings ─────────────────────────
      const maxEnrollmentsPerDay = Math.max(
        1,
        Math.min(10_000, parseInt(String(body.maxEnrollmentsPerDay || 500), 10) || 500)
      );
      const skipIfAlreadyActive = body.skipIfAlreadyActive !== false;
      const stopOnUnsubscribe   = body.stopOnUnsubscribe   !== false;

      // ── Create sequence ───────────────────────────────────
      const sequence = await AutomationSequence.create({
        name,
        description,
        status,
        trigger,
        recipientType,
        triggerFilters,
        steps:              cleanSteps,
        defaultFromName,
        defaultFromEmail,
        defaultReplyTo,
        maxEnrollmentsPerDay,
        skipIfAlreadyActive,
        stopOnUnsubscribe,
        createdBy:          new mongoose.Types.ObjectId(auth.id),
        stats: {
          totalEnrolled:  0,
          activeCount:    0,
          completedCount: 0,
          cancelledCount: 0,
          failedCount:    0,
          emailsSent:     0,
          totalOpens:     0,
          totalClicks:    0,
        },
      });

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        ip:       clientIP,
        userAgent,
        metadata: {
          requestId,
          action:     'automation_sequence_created',
          sequenceId: String(sequence._id),
          trigger,
          status,
          stepCount:  cleanSteps.length,
        },
      });

      res.status(201).json({
        success:  true,
        message:  'Automation sequence created successfully',
        sequence,
        requestId,
      });
      return;

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'unknown';

      // Handle Mongoose validation errors cleanly
      if (errMsg.includes('Cannot activate') || errMsg.includes('All steps')) {
        res.status(400).json({
          success: false,
          message: errMsg,
          requestId,
        });
        return;
      }

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        ip:       clientIP,
        userAgent,
        metadata: {
          requestId,
          action: 'automation_sequence_create_error',
          error:  errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create sequence',
        requestId,
      });
      return;
    }
  }
}