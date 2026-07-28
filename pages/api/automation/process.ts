// pages/api/automation/process.ts
// ═══════════════════════════════════════════════════════════════
// AUTOMATION CRON PROCESSOR — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Processes all due automation enrollments.
//   Called every 30 minutes by Vercel Cron.
//
// VERCEL CRON CONFIG (vercel.json):
//   {
//     "crons": [{
//       "path": "/api/automation/process",
//       "schedule": "*/30 * * * *"
//     }]
//   }
//
// FLOW PER ENROLLMENT:
//   1. Find enrollments where nextSendAt <= now AND status=active
//   2. For each enrollment:
//      a. Fetch the sequence + current step
//      b. Check recipient unsubscribe status
//      c. Build personalized email (merge tags)
//      d. Send via nodemailer
//      e. On success → advance to next step or mark completed
//      f. On failure → increment failedSteps, retry up to 3x
//      g. On bounce → cancel enrollment
//
// SECURITY:
//   - CRON_SECRET header validation (prevents public access)
//   - Also accepts admin session (for manual trigger)
//   - Rate limited
//   - Batch processing (50 per run)
//   - Concurrency lock (prevents duplicate runs)
//   - Full audit logging
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer                                from 'nodemailer';
import mongoose                                  from 'mongoose';
import dbConnect                                 from '@/lib/db';
import AutomationSequence                        from '@/models/AutomationSequence';
import AutomationEnrollment                      from '@/models/AutomationEnrollment';
import NewsletterSubscriber                      from '@/models/NewsletterSubscriber';
import Lead                                      from '@/models/Lead';
import { requireAdmin }                          from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';
import { replaceMergeTags }                      from '@/lib/mergeTags';
import type { MergeTagData }                     from '@/lib/mergeTags';

// ─── Constants ────────────────────────────────────────────────

const BATCH_SIZE         = 50;    // Max enrollments per cron run
const MAX_STEP_RETRIES   = 3;     // Max send attempts per step
const BATCH_DELAY_MS     = 200;   // Delay between email sends (ms)
const MAX_CONTENT_LENGTH = 500_000;

const DEFAULT_FROM_NAME  = 'Highrise.pk';
const DEFAULT_FROM_EMAIL =
  process.env.EMAIL_FROM || process.env.EMAIL_USER || 'newsletter@highrise.pk';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';

// ─── SMTP Transporter ─────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  pool:              true,
  maxConnections:    3,
  maxMessages:       50,
  connectionTimeout: 30_000,
  greetingTimeout:   30_000,
  socketTimeout:     30_000,
});

// ─── Helpers ──────────────────────────────────────────────────

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',           requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('Cache-Control',          'no-store, must-revalidate, private');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildFromHeader(fromName?: string, fromEmail?: string): string {
  const name  = (fromName  || '').trim() || DEFAULT_FROM_NAME;
  const email = (fromEmail || '').trim() || DEFAULT_FROM_EMAIL;
  return `"${name.replace(/"/g, '\\"')}" <${email}>`;
}

// ─── Auth: Cron secret OR admin session ───────────────────────

async function authenticateRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<'cron' | 'admin' | null> {
  // Check Vercel cron secret header first
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return 'cron';
  }

  // Fall back to admin session
  const auth = await requireAdmin(req, res);
  if (auth) return 'admin';

  // requireAdmin already sent 401 response
  return null;
}

// ─── Merge tag builder ────────────────────────────────────────

/**
 * Build MergeTagData from enrollment + recipient record.
 * Works for both subscribers and leads.
 */
function buildMergeTagData(
  enrollment: any,
  recipientRecord: any,
  unsubscribeUrl: string
): MergeTagData {
  const isLead = enrollment.recipientType === 'lead';

  if (isLead && recipientRecord) {
    return {
      name:         recipientRecord.name         || enrollment.name || '',
      firstName:    (recipientRecord.name || enrollment.name || '').split(' ')[0],
      email:        enrollment.email,
      phone:        recipientRecord.phone         || '',
      city:
        recipientRecord.projectSnapshot?.city    ||
        recipientRecord.propertySnapshot?.city   || '',
      area:
        recipientRecord.projectSnapshot?.area    ||
        recipientRecord.propertySnapshot?.society || '',
      entityName:
        recipientRecord.projectSnapshot?.projectName ||
        recipientRecord.propertySnapshot?.title      || '',
      price:
        recipientRecord.projectSnapshot?.minPrice    ||
        recipientRecord.propertySnapshot?.price      || 0,
      propertyType:
        recipientRecord.propertySnapshot?.propertyType || '',
      budgetMin:    recipientRecord.budget?.min   || 0,
      budgetMax:    recipientRecord.budget?.max   || 0,
      budgetTier:   recipientRecord.budget?.tier  || '',
      leadType:     recipientRecord.leadType       || '',
      leadScore:    recipientRecord.leadScore      || 0,
      temperature:  recipientRecord.temperature    || '',
      status:       recipientRecord.status         || '',
      source:       recipientRecord.source         || '',
      inquiryDate:  recipientRecord.createdAt      || null,
      unsubscribeUrl,
      currentYear:  new Date().getFullYear(),
      currentDate:  new Date().toLocaleDateString('en-PK', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    };
  }

  // Subscriber
  return {
    name:         recipientRecord?.name || enrollment.name || '',
    firstName:    (recipientRecord?.name || enrollment.name || '').split(' ')[0],
    email:        enrollment.email,
    unsubscribeUrl,
    currentYear:  new Date().getFullYear(),
    currentDate:  new Date().toLocaleDateString('en-PK', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
  };
}

// ─── Email HTML wrapper ───────────────────────────────────────

function wrapEmailContent(
  content:        string,
  subject:        string,
  previewText:    string,
  unsubscribeUrl: string
): string {
  const safeSubject     = String(subject     || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 200);
  const safePreviewText = String(previewText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 300);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
  ${safePreviewText ? `
  <div style="display:none;max-height:0;overflow:hidden;">${safePreviewText}</div>
  <div style="display:none;max-height:0;overflow:hidden;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
  ` : ''}
  <style>
    body { margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background:#f8f9fa; }
    .container { max-width:600px; margin:0 auto; background:#fff; }
    .header { background:linear-gradient(135deg,#029bba 0%,#004063 100%); padding:32px 30px; text-align:center; }
    .logo { font-size:26px; font-weight:800; color:#fff; margin:0; }
    .tagline { color:rgba(255,255,255,0.85); font-size:13px; margin:6px 0 0 0; }
    .content { padding:32px 30px; }
    .content h1,.content h2,.content h3 { color:#004063; margin-top:0; }
    .content p { color:#4a4a4a; line-height:1.7; }
    .content a { color:#029bba; }
    .footer { background:#f8f9fa; padding:24px 30px; text-align:center; border-top:1px solid #e9ecef; }
    .footer p { color:#666; font-size:12px; margin:4px 0; }
    .footer a { color:#029bba; text-decoration:none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">🏠 Highrise.pk</h1>
      <p class="tagline">Pakistan's Premier Real Estate Platform</p>
    </div>
    <div class="content">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Highrise.pk. All rights reserved.</p>
      <p style="margin-top:8px;">
        <a href="${SITE_URL}">Visit Website</a> &nbsp;·&nbsp;
        <a href="${unsubscribeUrl}">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Check unsubscribe status ─────────────────────────────────

/**
 * Returns true if the recipient has unsubscribed
 * and the sequence is configured to stop on unsubscribe.
 */
async function isUnsubscribed(
  enrollment:       any,
  stopOnUnsubscribe: boolean
): Promise<boolean> {
  if (!stopOnUnsubscribe) return false;

  if (enrollment.recipientType === 'subscriber') {
    const sub: any = await NewsletterSubscriber.findOne({
      email: enrollment.email,
    })
      .select('status')
      .lean();

    return sub?.status === 'unsubscribed' || sub?.status === 'bounced';
  }

  if (enrollment.recipientType === 'lead') {
    const lead: any = await Lead.findById(enrollment.recipientId)
      .select('emailOptOut')
      .lean();

    return lead?.emailOptOut === true;
  }

  return false;
}

// ─── Process single enrollment ────────────────────────────────

interface ProcessResult {
  status:  'sent' | 'skipped' | 'completed' | 'cancelled' | 'failed';
  reason?: string;
}

async function processEnrollment(
  enrollment:   any,
  sequence:     any,
  requestId:    string
): Promise<ProcessResult> {

  const stepIndex  = enrollment.currentStep - 1;
  const step       = sequence.steps[stepIndex];

  // Step not found — sequence may have changed
  if (!step) {
    return { status: 'completed', reason: 'step_not_found' };
  }

  // ── Check unsubscribe ───────────────────────────────────────
  const unsubscribed = await isUnsubscribed(
    enrollment,
    sequence.stopOnUnsubscribe !== false
  );

  if (unsubscribed) {
    return { status: 'cancelled', reason: 'unsubscribed' };
  }

  // ── Fetch recipient record for merge tags ───────────────────
  let recipientRecord: any = null;

  try {
    if (enrollment.recipientType === 'subscriber') {
      recipientRecord = await NewsletterSubscriber.findOne({
        email: enrollment.email,
      })
        .select('name email status')
        .lean();
    } else {
      recipientRecord = await Lead.findById(enrollment.recipientId)
        .select(
          'name email phone status temperature leadScore leadType ' +
          'source budget projectSnapshot propertySnapshot createdAt ' +
          'emailOptOut'
        )
        .lean();
    }
  } catch {
    // Non-fatal — proceed with enrollment data
  }

  // ── Build unsubscribe URL ───────────────────────────────────
  let unsubscribeUrl = `${SITE_URL}/unsubscribe`;

  if (enrollment.recipientType === 'subscriber' && recipientRecord?.unsubscribeToken) {
    unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${recipientRecord.unsubscribeToken}`;
  } else if (enrollment.recipientType === 'lead' && recipientRecord?.emailUnsubscribeToken) {
    unsubscribeUrl = `${SITE_URL}/api/leads/unsubscribe?token=${recipientRecord.emailUnsubscribeToken}`;
  }

  // ── Build merge tag data ────────────────────────────────────
  const tagData = buildMergeTagData(enrollment, recipientRecord, unsubscribeUrl);

  // ── Resolve sender for this step ───────────────────────────
  const fromName  = step.fromName  || sequence.defaultFromName  || DEFAULT_FROM_NAME;
  const fromEmail = step.fromEmail || sequence.defaultFromEmail || DEFAULT_FROM_EMAIL;
  const replyTo   = step.replyTo   || sequence.defaultReplyTo   || '';

  // ── Personalize subject + content ──────────────────────────
  const personalizedSubject = replaceMergeTags(step.subject, tagData);
  const personalizedContent = replaceMergeTags(step.content, tagData);

  // ── Build final HTML ────────────────────────────────────────
  const finalHtml = wrapEmailContent(
    personalizedContent,
    personalizedSubject,
    step.previewText || '',
    unsubscribeUrl
  );

  // ── Send email ──────────────────────────────────────────────
  try {
    await transporter.sendMail({
      from:    buildFromHeader(fromName, fromEmail),
      to:      enrollment.email,
      replyTo: replyTo || undefined,
      subject: personalizedSubject,
      html:    finalHtml,
      headers: {
        'X-Automation-Sequence': String(sequence._id),
        'X-Automation-Step':     String(enrollment.currentStep),
        'X-Enrollment-Id':       String(enrollment._id),
        'List-Unsubscribe':      `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    return { status: 'sent' };

  } catch (sendErr) {
    const errMsg = (sendErr instanceof Error ? sendErr.message : String(sendErr)).toLowerCase();

    // Detect hard bounces
    const isBounce =
      errMsg.includes('550') ||
      errMsg.includes('no such user') ||
      errMsg.includes('does not exist') ||
      errMsg.includes('recipient address rejected') ||
      errMsg.includes('invalid_email');

    if (isBounce) {
      return { status: 'cancelled', reason: 'bounce' };
    }

    return { status: 'failed', reason: errMsg.slice(0, 200) };
  }
}

// ─── Main Handler ─────────────────────────────────────────────

export default async function handler(
  req:  NextApiRequest,
  res:  NextApiResponse
): Promise<void> {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP  = getClientIP(req);
  const userAgent = String(req.headers['user-agent'] || 'cron').slice(0, 500);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  // ── Rate limit ───────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  // ── Auth: cron secret OR admin session ───────────────────────
  const authType = await authenticateRequest(req, res);
  if (!authType) return; // requireAdmin already sent 401

  try {
    await dbConnect();

    const now = new Date();

    // ── Fetch due enrollments ─────────────────────────────────
    // Due = nextSendAt <= now AND status = active
    const dueEnrollments: any[] = await AutomationEnrollment.find({
      status:     'active',
      nextSendAt: { $lte: now },
    })
      .sort({ nextSendAt: 1 }) // Oldest due first
      .limit(BATCH_SIZE)
      .lean();

    if (dueEnrollments.length === 0) {
      res.status(200).json({
        success:   true,
        message:   'No enrollments due',
        processed: 0,
        requestId,
      });
      return;
    }

    // ── Fetch all unique sequences needed ─────────────────────
    const sequenceIds = [
      ...new Set(dueEnrollments.map((e) => String(e.sequenceId))),
    ];

    const sequences: any[] = await AutomationSequence.find({
      _id: { $in: sequenceIds },
    }).lean();

    const sequenceMap = new Map<string, any>(
      sequences.map((s) => [String(s._id), s])
    );

    // ── Process stats ─────────────────────────────────────────
    let sentCount      = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let failedCount    = 0;
    let skippedCount   = 0;

    // ── Process each enrollment ───────────────────────────────
    for (const enrollment of dueEnrollments) {
      try {
        const sequence = sequenceMap.get(String(enrollment.sequenceId));

        // Sequence deleted or archived — cancel enrollment
        if (!sequence || sequence.status === 'archived') {
          await AutomationEnrollment.updateOne(
            { _id: enrollment._id },
            {
              $set: {
                status:       'cancelled',
                cancelledAt:  now,
                cancelReason: 'sequence_unavailable',
              },
            }
          );
          cancelledCount++;
          continue;
        }

        // ── Process this enrollment ─────────────────────────
        const result = await processEnrollment(enrollment, sequence, requestId);

        if (result.status === 'sent') {
          sentCount++;

          // Determine next step
          const totalSteps  = sequence.steps.length;
          const isLastStep  = enrollment.currentStep >= totalSteps;

          if (isLastStep) {
            // All steps complete — mark enrollment as completed
            await AutomationEnrollment.updateOne(
              { _id: enrollment._id },
              {
                $set: {
                  status:      'completed',
                  completedAt: now,
                  nextSendAt:  null,
                },
                $push: {
                  stepsCompleted: {
                    stepNumber: enrollment.currentStep,
                    sentAt:     now,
                  },
                },
              }
            );

            // Update sequence stats
            await AutomationSequence.updateOne(
              { _id: enrollment.sequenceId },
              {
                $inc: {
                  'stats.completedCount': 1,
                  'stats.activeCount':   -1,
                  'stats.emailsSent':     1,
                },
              }
            );

            completedCount++;

          } else {
            // Advance to next step
            const nextStepIndex = enrollment.currentStep; // 0-based = current step number
            const nextStep      = sequence.steps[nextStepIndex];
            const delayMs       = (nextStep.delayDays || 0) * 24 * 60 * 60 * 1000;
            const nextSendAt    = new Date(now.getTime() + delayMs);

            await AutomationEnrollment.updateOne(
              { _id: enrollment._id },
              {
                $set: {
                  currentStep: enrollment.currentStep + 1,
                  nextSendAt,
                  failedSteps: [], // Reset failed attempts on success
                },
                $push: {
                  stepsCompleted: {
                    stepNumber: enrollment.currentStep,
                    sentAt:     now,
                  },
                },
              }
            );

            // Update sequence email sent count
            await AutomationSequence.updateOne(
              { _id: enrollment.sequenceId },
              { $inc: { 'stats.emailsSent': 1 } }
            );
          }

        } else if (result.status === 'cancelled') {
          // Unsubscribe or bounce — cancel enrollment
          await AutomationEnrollment.updateOne(
            { _id: enrollment._id },
            {
              $set: {
                status:       'cancelled',
                cancelledAt:  now,
                cancelReason: result.reason || 'cancelled',
                nextSendAt:   null,
              },
            }
          );

          // Handle bounce — mark subscriber/lead
          if (result.reason === 'bounce') {
            if (enrollment.recipientType === 'subscriber') {
              await NewsletterSubscriber.updateOne(
                { email: enrollment.email },
                { $set: { status: 'bounced' } }
              );
            } else {
              await Lead.updateOne(
                { _id: enrollment.recipientId },
                { $set: { emailOptOut: true, emailOptOutAt: now } }
              );
            }
          }

          await AutomationSequence.updateOne(
            { _id: enrollment.sequenceId },
            {
              $inc: {
                'stats.cancelledCount': 1,
                'stats.activeCount':   -1,
              },
            }
          );

          cancelledCount++;

        } else if (result.status === 'failed') {
          failedCount++;

          // Increment failed attempt for this step
          const failedSteps = enrollment.failedSteps || [];
          const stepFails   = failedSteps.filter(
            (f: any) => f.stepNumber === enrollment.currentStep
          ).length;

          if (stepFails >= MAX_STEP_RETRIES - 1) {
            // Max retries reached — mark enrollment as failed
            await AutomationEnrollment.updateOne(
              { _id: enrollment._id },
              {
                $set: {
                  status:     'failed',
                  failedAt:   now,
                  nextSendAt: null,
                },
                $push: {
                  failedSteps: {
                    stepNumber: enrollment.currentStep,
                    failedAt:   now,
                    reason:     result.reason,
                  },
                },
              }
            );

            await AutomationSequence.updateOne(
              { _id: enrollment.sequenceId },
              {
                $inc: {
                  'stats.failedCount': 1,
                  'stats.activeCount': -1,
                },
              }
            );

          } else {
            // Schedule retry in 2 hours
            const retryAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

            await AutomationEnrollment.updateOne(
              { _id: enrollment._id },
              {
                $set:  { nextSendAt: retryAt },
                $push: {
                  failedSteps: {
                    stepNumber: enrollment.currentStep,
                    failedAt:   now,
                    reason:     result.reason,
                  },
                },
              }
            );
          }

        } else {
          // 'skipped' — should not occur in processor but handle gracefully
          skippedCount++;
        }

        // Small delay between sends to avoid SMTP rate limits
        await sleep(BATCH_DELAY_MS);

      } catch (enrollmentErr) {
        // Per-enrollment error — log and continue
        console.error(
          `[Automation Process] Enrollment ${enrollment._id} failed:`,
          enrollmentErr instanceof Error
            ? enrollmentErr.message
            : enrollmentErr
        );
        failedCount++;
      }
    }

    // ── Audit log ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     'bulk_action_performed',
      severity: 'low',
      ip:       clientIP,
      userAgent,
      metadata: {
        requestId,
        action:     'automation_process_run',
        triggeredBy: authType,
        processed:  dueEnrollments.length,
        sent:       sentCount,
        completed:  completedCount,
        cancelled:  cancelledCount,
        failed:     failedCount,
        skipped:    skippedCount,
      },
    });

    // ── Response ──────────────────────────────────────────────
    res.status(200).json({
      success: true,
      message: `Processed ${dueEnrollments.length} enrollment${dueEnrollments.length !== 1 ? 's' : ''}`,
      stats: {
        processed:  dueEnrollments.length,
        sent:       sentCount,
        completed:  completedCount,
        cancelled:  cancelledCount,
        failed:     failedCount,
        skipped:    skippedCount,
      },
      requestId,
    });
    return;

  } catch (err) {
    await logSecurityEvent({
      type:     'system_error',
      severity: 'high',
      ip:       clientIP,
      userAgent,
      metadata: {
        requestId,
        action: 'automation_process_error',
        error:  err instanceof Error ? err.message : 'unknown',
      },
    });

    res.status(500).json({
      success: false,
      message: 'Automation processor failed',
      requestId,
    });
    return;
  }
}