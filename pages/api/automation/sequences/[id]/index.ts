// pages/api/automation/sequences/[id]/index.ts
// ═══════════════════════════════════════════════════════════════
// AUTOMATION SEQUENCE SINGLE — GET / PUT / DELETE
// Admin only — rate limited — full security
// ═══════════════════════════════════════════════════════════════
// GET    → Fetch single sequence with full steps + enrollment stats
// PUT    → Update sequence (draft/paused only for most fields)
//          Status transitions: draft→active, active→paused, etc.
// DELETE → Soft archive (status → archived)
//          Cannot delete active sequences with live enrollments
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

const MAX_NAME_LENGTH       = 150;
const MAX_DESC_LENGTH       = 1000;
const MAX_SUBJECT_LENGTH    = 200;
const MAX_PREVIEW_LENGTH    = 300;
const MAX_CONTENT_LENGTH    = 500_000;
const MAX_FROM_NAME_LENGTH  = 150;
const MAX_FROM_EMAIL_LENGTH = 200;
const MAX_STEPS             = 20;

const ALLOWED_TRIGGERS = [
  'subscriber_joined',
  'lead_created',
  'lead_status_changed',
  'manual',
] as const;

const ALLOWED_STATUSES = [
  'draft',
  'active',
  'paused',
  'archived',
] as const;

const ALLOWED_RECIPIENT_TYPES = [
  'subscribers',
  'leads',
  'both',
] as const;

// Valid status transitions
// archived is a terminal state — cannot transition out
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:    ['active', 'archived'],
  active:   ['paused', 'archived'],
  paused:   ['active', 'archived'],
  archived: [],  // terminal — no transitions allowed
};

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
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS:     ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR:     ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
  });
}

function validateEmail(email: string): boolean {
  if (!email) return true;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

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
  if (!subject) return null;

  const content = sanitizeHtml(String(raw.content || ''));
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
  if (!['GET', 'PUT', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
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
      type:     'rate_limit_exceeded',
      severity: 'medium',
      ip:       clientIP,
      userAgent,
      metadata: { requestId, action: 'automation_sequence_single' },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ── Auth guard ───────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── Validate ID ───────────────────────────────────────────────
  const { id } = req.query;

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    await logSecurityEvent({
      type:     'suspicious_activity',
      severity: 'medium',
      userId:   auth.id,
      ip:       clientIP,
      userAgent,
      metadata: {
        requestId,
        action:     'automation_invalid_id',
        providedId: String(id).slice(0, 50),
      },
    });
    res.status(400).json({
      success: false,
      message: 'Invalid sequence ID',
      requestId,
    });
    return;
  }

  await dbConnect();

  // ════════════════════════════════════════════════════════════
  // GET — Fetch single sequence
  // ════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const sequence: any = await AutomationSequence.findById(id).lean();

      if (!sequence) {
        res.status(404).json({
          success: false,
          message: 'Sequence not found',
          requestId,
        });
        return;
      }

      // Fetch live enrollment breakdown for this sequence
      const [
        activeEnrollments,
        completedEnrollments,
        cancelledEnrollments,
        failedEnrollments,
      ] = await Promise.all([
        AutomationEnrollment.countDocuments({ sequenceId: id, status: 'active'    }),
        AutomationEnrollment.countDocuments({ sequenceId: id, status: 'completed' }),
        AutomationEnrollment.countDocuments({ sequenceId: id, status: 'cancelled' }),
        AutomationEnrollment.countDocuments({ sequenceId: id, status: 'failed'    }),
      ]);

      // Recent enrollments (last 10) for preview
      const recentEnrollments: any[] = await AutomationEnrollment.find({
        sequenceId: id,
      })
        .sort({ enrolledAt: -1 })
        .limit(10)
        .select('email name status currentStep enrolledAt nextSendAt recipientType')
        .lean();

      res.status(200).json({
        success: true,
        sequence,
        enrollmentStats: {
          active:    activeEnrollments,
          completed: completedEnrollments,
          cancelled: cancelledEnrollments,
          failed:    failedEnrollments,
          total:
            activeEnrollments +
            completedEnrollments +
            cancelledEnrollments +
            failedEnrollments,
        },
        recentEnrollments,
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
          action: 'automation_sequence_fetch_error',
          error:  err instanceof Error ? err.message : 'unknown',
        },
      });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sequence',
        requestId,
      });
      return;
    }
  }

  // ════════════════════════════════════════════════════════════
  // PUT — Update sequence
  // ════════════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      const sequence: any = await AutomationSequence.findById(id);

      if (!sequence) {
        res.status(404).json({
          success: false,
          message: 'Sequence not found',
          requestId,
        });
        return;
      }

      // Cannot edit archived sequences
      if (sequence.status === 'archived') {
        res.status(400).json({
          success: false,
          message: 'Cannot edit an archived sequence. Create a new one instead.',
          requestId,
        });
        return;
      }

      const body = req.body || {};

      // ── Name ────────────────────────────────────────────────
      if (body.name !== undefined) {
        const name = sanitizeText(String(body.name), MAX_NAME_LENGTH);
        if (!name || name.length < 3) {
          res.status(400).json({
            success: false,
            message: 'Sequence name must be at least 3 characters',
            requestId,
          });
          return;
        }
        sequence.name = name;
      }

      // ── Description ─────────────────────────────────────────
      if (body.description !== undefined) {
        sequence.description = sanitizeText(
          String(body.description),
          MAX_DESC_LENGTH
        );
      }

      // ── Trigger (only changeable on draft) ──────────────────
      if (body.trigger !== undefined) {
        if (sequence.status !== 'draft') {
          res.status(400).json({
            success: false,
            message: 'Trigger can only be changed while sequence is in draft status',
            requestId,
          });
          return;
        }
        const trigger = String(body.trigger);
        if (!ALLOWED_TRIGGERS.includes(trigger as any)) {
          res.status(400).json({
            success: false,
            message: `Invalid trigger. Must be one of: ${ALLOWED_TRIGGERS.join(', ')}`,
            requestId,
          });
          return;
        }
        sequence.trigger = trigger;
      }

      // ── Recipient type (only changeable on draft) ────────────
      if (body.recipientType !== undefined) {
        if (sequence.status !== 'draft') {
          res.status(400).json({
            success: false,
            message: 'Recipient type can only be changed while sequence is in draft status',
            requestId,
          });
          return;
        }
        const recipientType = String(body.recipientType);
        if (!ALLOWED_RECIPIENT_TYPES.includes(recipientType as any)) {
          res.status(400).json({
            success: false,
            message: `Invalid recipientType. Must be: ${ALLOWED_RECIPIENT_TYPES.join(', ')}`,
            requestId,
          });
          return;
        }
        sequence.recipientType = recipientType;
      }

      // ── Status transition ────────────────────────────────────
      if (body.status !== undefined) {
        const newStatus = String(body.status);

        if (!ALLOWED_STATUSES.includes(newStatus as any)) {
          res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
            requestId,
          });
          return;
        }

        const allowedNext = STATUS_TRANSITIONS[sequence.status] || [];
        if (!allowedNext.includes(newStatus)) {
          res.status(400).json({
            success: false,
            message: `Cannot transition from "${sequence.status}" to "${newStatus}"`,
            requestId,
          });
          return;
        }

        // Cannot activate with no steps
        if (newStatus === 'active' && sequence.steps.length === 0) {
          res.status(400).json({
            success: false,
            message: 'Cannot activate a sequence with no steps',
            requestId,
          });
          return;
        }

        sequence.status = newStatus;
      }

      // ── Steps ────────────────────────────────────────────────
      if (body.steps !== undefined) {
        if (!Array.isArray(body.steps)) {
          res.status(400).json({
            success: false,
            message: 'Steps must be an array',
            requestId,
          });
          return;
        }

        if (body.steps.length > MAX_STEPS) {
          res.status(400).json({
            success: false,
            message: `Maximum ${MAX_STEPS} steps allowed`,
            requestId,
          });
          return;
        }

        const cleanSteps = body.steps
          .map((s: any, i: number) => sanitizeStep(s, i))
          .filter(Boolean);

        // If currently active, must have at least 1 step
        if (sequence.status === 'active' && cleanSteps.length === 0) {
          res.status(400).json({
            success: false,
            message: 'An active sequence must have at least one step',
            requestId,
          });
          return;
        }

        sequence.steps = cleanSteps;
      }

      // ── Trigger filters ──────────────────────────────────────
      if (body.triggerFilters !== undefined) {
        const rawFilters = body.triggerFilters || {};
        sequence.triggerFilters = {
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
      }

      // ── Default sender ───────────────────────────────────────
      if (body.defaultFromName !== undefined) {
        sequence.defaultFromName = sanitizeText(
          String(body.defaultFromName),
          MAX_FROM_NAME_LENGTH
        );
      }

      if (body.defaultFromEmail !== undefined) {
        const email = String(body.defaultFromEmail || '').trim().toLowerCase();
        if (email && !validateEmail(email)) {
          res.status(400).json({
            success: false,
            message: 'Invalid default sender email',
            requestId,
          });
          return;
        }
        sequence.defaultFromEmail = email;
      }

      if (body.defaultReplyTo !== undefined) {
        const replyTo = String(body.defaultReplyTo || '').trim().toLowerCase();
        if (replyTo && !validateEmail(replyTo)) {
          res.status(400).json({
            success: false,
            message: 'Invalid default reply-to email',
            requestId,
          });
          return;
        }
        sequence.defaultReplyTo = replyTo;
      }

      // ── Safety settings ──────────────────────────────────────
      if (body.maxEnrollmentsPerDay !== undefined) {
        sequence.maxEnrollmentsPerDay = Math.max(
          1,
          Math.min(10_000, parseInt(String(body.maxEnrollmentsPerDay), 10) || 500)
        );
      }

      if (body.skipIfAlreadyActive !== undefined) {
        sequence.skipIfAlreadyActive = Boolean(body.skipIfAlreadyActive);
      }

      if (body.stopOnUnsubscribe !== undefined) {
        sequence.stopOnUnsubscribe = Boolean(body.stopOnUnsubscribe);
      }

      // ── Track who updated ────────────────────────────────────
      sequence.updatedBy = new mongoose.Types.ObjectId(auth.id);

      await sequence.save();

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        ip:       clientIP,
        userAgent,
        metadata: {
          requestId,
          action:     'automation_sequence_updated',
          sequenceId: String(sequence._id),
          newStatus:  sequence.status,
          stepCount:  sequence.steps.length,
        },
      });

      res.status(200).json({
        success:  true,
        message:  'Sequence updated successfully',
        sequence,
        requestId,
      });
      return;

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'unknown';

      // Surface Mongoose validation errors cleanly
      if (
        errMsg.includes('Cannot activate') ||
        errMsg.includes('All steps must') ||
        errMsg.includes('Maximum 20')
      ) {
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
          action: 'automation_sequence_update_error',
          error:  errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update sequence',
        requestId,
      });
      return;
    }
  }

  // ════════════════════════════════════════════════════════════
  // DELETE — Archive sequence
  // ════════════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      const sequence: any = await AutomationSequence.findById(id);

      if (!sequence) {
        res.status(404).json({
          success: false,
          message: 'Sequence not found',
          requestId,
        });
        return;
      }

      // Already archived
      if (sequence.status === 'archived') {
        res.status(400).json({
          success: false,
          message: 'Sequence is already archived',
          requestId,
        });
        return;
      }

      // Check for active enrollments before archiving
      const activeEnrollments = await AutomationEnrollment.countDocuments({
        sequenceId: id,
        status:     'active',
      });

      if (activeEnrollments > 0) {
        // Warn but allow — cancel active enrollments first
        await AutomationEnrollment.updateMany(
          { sequenceId: id, status: 'active' },
          {
            $set: {
              status:      'cancelled',
              cancelledAt: new Date(),
              cancelReason: 'sequence_archived',
            },
          }
        );

        // Update sequence stats
        await AutomationSequence.updateOne(
          { _id: id },
          {
            $inc: {
              'stats.cancelledCount': activeEnrollments,
              'stats.activeCount':    -activeEnrollments,
            },
          }
        );
      }

      // Archive the sequence
      sequence.status    = 'archived';
      sequence.updatedBy = new mongoose.Types.ObjectId(auth.id);
      await sequence.save();

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        ip:       clientIP,
        userAgent,
        metadata: {
          requestId,
          action:              'automation_sequence_archived',
          sequenceId:          String(sequence._id),
          cancelledEnrollments: activeEnrollments,
        },
      });

      res.status(200).json({
        success: true,
        message: activeEnrollments > 0
          ? `Sequence archived. ${activeEnrollments} active enrollment${activeEnrollments !== 1 ? 's' : ''} cancelled.`
          : 'Sequence archived successfully',
        cancelledEnrollments: activeEnrollments,
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
          action: 'automation_sequence_archive_error',
          error:  err instanceof Error ? err.message : 'unknown',
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to archive sequence',
        requestId,
      });
      return;
    }
  }
}