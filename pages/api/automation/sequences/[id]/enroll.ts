// pages/api/automation/sequences/[id]/enroll.ts
// ═══════════════════════════════════════════════════════════════
// MANUAL ENROLLMENT API — POST
// Admin only — rate limited — full security
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Manually enroll one or more recipients into a sequence.
//   Used for 'manual' trigger sequences OR admin override.
//
// BODY:
//   {
//     recipients: [
//       {
//         recipientId:   string,   // Subscriber._id or Lead._id
//         recipientType: 'subscriber' | 'lead',
//         email:         string,
//         name:          string,
//       }
//     ]
//   }
//
// RULES:
//   - Sequence must be 'active'
//   - Max 500 recipients per request
//   - Skips already-active enrollments (if skipIfAlreadyActive)
//   - Respects daily enrollment cap
//   - Returns count of enrolled vs skipped
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose                                  from 'mongoose';
import dbConnect                                 from '@/lib/dbConnect';
import AutomationSequence                        from '@/models/AutomationSequence';
import AutomationEnrollment                      from '@/models/AutomationEnrollment';
import { requireAdmin }                          from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';

// ─── Constants ────────────────────────────────────────────────

const MAX_RECIPIENTS_PER_REQUEST = 500;
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

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(String(email || '').trim().toLowerCase());
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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
      metadata: { requestId, action: 'automation_manual_enroll' },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ── Auth guard ───────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── Validate sequence ID ─────────────────────────────────────
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
        action:     'automation_enroll_invalid_id',
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

  try {
    await dbConnect();

    // ── Fetch sequence ────────────────────────────────────────
    const sequence: any = await AutomationSequence.findById(id).lean();

    if (!sequence) {
      res.status(404).json({
        success: false,
        message: 'Sequence not found',
        requestId,
      });
      return;
    }

    // ── Sequence must be active ───────────────────────────────
    if (sequence.status !== 'active') {
      res.status(400).json({
        success: false,
        message: `Cannot enroll into a sequence with status "${sequence.status}". Sequence must be active.`,
        requestId,
      });
      return;
    }

    // ── Sequence must have steps ──────────────────────────────
    if (!sequence.steps || sequence.steps.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Sequence has no steps configured',
        requestId,
      });
      return;
    }

    // ── Validate recipients array ─────────────────────────────
    const { recipients } = req.body || {};

    if (!Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({
        success: false,
        message: 'recipients must be a non-empty array',
        requestId,
      });
      return;
    }

    if (recipients.length > MAX_RECIPIENTS_PER_REQUEST) {
      res.status(400).json({
        success: false,
        message: `Maximum ${MAX_RECIPIENTS_PER_REQUEST} recipients per request`,
        requestId,
      });
      return;
    }

    // ── Validate each recipient ───────────────────────────────
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];

      if (!r || typeof r !== 'object') {
        res.status(400).json({
          success: false,
          message: `Invalid recipient at index ${i}`,
          requestId,
        });
        return;
      }

      if (!r.recipientId || typeof r.recipientId !== 'string') {
        res.status(400).json({
          success: false,
          message: `Missing recipientId at index ${i}`,
          requestId,
        });
        return;
      }

      if (!['subscriber', 'lead'].includes(r.recipientType)) {
        res.status(400).json({
          success: false,
          message: `Invalid recipientType at index ${i}. Must be "subscriber" or "lead"`,
          requestId,
        });
        return;
      }

      if (!r.email || !isValidEmail(r.email)) {
        res.status(400).json({
          success: false,
          message: `Invalid email at index ${i}`,
          requestId,
        });
        return;
      }
    }

    // ── Daily cap check ───────────────────────────────────────
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await AutomationEnrollment.countDocuments({
      sequenceId: id,
      enrolledAt: { $gte: startOfDay },
    });

    const remainingCap = (sequence.maxEnrollmentsPerDay || 500) - todayCount;

    if (remainingCap <= 0) {
      res.status(429).json({
        success: false,
        message: `Daily enrollment cap of ${sequence.maxEnrollmentsPerDay} reached for this sequence. Try again tomorrow.`,
        requestId,
      });
      return;
    }

    // Trim recipients to remaining cap
    const recipientsToProcess = recipients.slice(0, remainingCap);
    const skippedDueToCap     = recipients.length - recipientsToProcess.length;

    // ── Process enrollments ───────────────────────────────────
    const now        = new Date();
    const step1      = sequence.steps[0];
    const delayMs    = (step1.delayDays || 0) * 24 * 60 * 60 * 1000;
    const nextSendAt = new Date(now.getTime() + delayMs);

    let enrolledCount = 0;
    let skippedCount  = skippedDueToCap;
    const skippedEmails: string[] = [];
    const failedEmails:  string[] = [];

    for (const recipient of recipientsToProcess) {
      try {
        const email = String(recipient.email).trim().toLowerCase();

        // ── Check existing active enrollment ──────────────────
        if (sequence.skipIfAlreadyActive) {
          const existing = await AutomationEnrollment.findOne({
            sequenceId:  id,
            recipientId: String(recipient.recipientId),
            status:      'active',
          })
            .select('_id')
            .lean();

          if (existing) {
            skippedCount++;
            skippedEmails.push(email);
            continue;
          }
        }

        // ── Create enrollment ─────────────────────────────────
        await AutomationEnrollment.create({
          sequenceId:    new mongoose.Types.ObjectId(id),
          recipientId:   String(recipient.recipientId),
          recipientType: recipient.recipientType,
          email,
          name:          String(recipient.name || '').trim().slice(0, 120),
          currentStep:   1,
          status:        'active',
          nextSendAt,
          enrolledAt:    now,
          stepsCompleted: [],
          failedSteps:   [],
        });

        enrolledCount++;

      } catch (recipientErr) {
        // Per-recipient error — continue with others
        const email = String(recipient?.email || 'unknown');
        failedEmails.push(email);
        console.error(
          `[Automation Enroll] Failed for ${email}:`,
          recipientErr instanceof Error ? recipientErr.message : recipientErr
        );
      }
    }

    // ── Update sequence stats ─────────────────────────────────
    if (enrolledCount > 0) {
      await AutomationSequence.updateOne(
        { _id: id },
        {
          $inc: {
            'stats.totalEnrolled': enrolledCount,
            'stats.activeCount':   enrolledCount,
          },
        }
      );
    }

    // ── Audit log ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     'bulk_action_performed',
      severity: 'low',
      userId:   auth.id,
      ip:       clientIP,
      userAgent,
      metadata: {
        requestId,
        action:       'automation_manual_enrollment',
        sequenceId:   String(id),
        sequenceName: sequence.name,
        requested:    recipients.length,
        enrolled:     enrolledCount,
        skipped:      skippedCount,
        failed:       failedEmails.length,
      },
    });

    // ── Response ──────────────────────────────────────────────
    res.status(200).json({
      success: true,
      message: `Enrolled ${enrolledCount} recipient${enrolledCount !== 1 ? 's' : ''} successfully`,
      stats: {
        requested: recipients.length,
        enrolled:  enrolledCount,
        skipped:   skippedCount,
        failed:    failedEmails.length,
      },
      skippedEmails: skippedEmails.slice(0, 20),   // Show first 20
      failedEmails:  failedEmails.slice(0, 20),
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
        action: 'automation_enroll_error',
        error:  err instanceof Error ? err.message : 'unknown',
      },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to process enrollments',
      requestId,
    });
    return;
  }
}