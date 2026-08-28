// pages/api/aleem/project-lead.ts
// ALEEM - project inquiry lead from project page or chat widget.
// Public endpoint: guests + registered users.
// Abuse bounded by contact-form rate limits + botDefense
// (honeypot, form velocity, PK mobile, disposable email).

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { rateLimitContactForm, setRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { createProjectLead } from '@/lib/aleem/createAleemLead';
import {
  evaluateBotDefense,
  botDefenseClientMessage,
  formatPakistaniMobileDisplay,
} from '@/lib/security/botDefense';
import dbConnect from '@/lib/dbConnect';
import SecurityEvent from '@/models/SecurityEvent';

const BodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  intent: z.enum(['buy', 'invest', 'brochure', 'visit', 'general']).optional(),
  message: z.string().trim().max(500).optional(),
  projectSlug: z.string().trim().max(120),
  sessionId: z.string().trim().max(64).optional(),
  honeypot: z.string().max(200).optional().or(z.literal('')),
  formOpenedAt: z.union([z.number(), z.string()]).optional(),
});

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
}

async function logSecurityEvent(data: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await dbConnect();
    await SecurityEvent.create({ ...data, timestamp: new Date() });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[aleem/project-lead logSecurityEvent failed]:', msg);
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP = getClientIp(req);
  const userAgent = typeof req.headers['user-agent'] === 'string'
    ? req.headers['user-agent'].slice(0, 200)
    : 'unknown';

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, error: 'Method not allowed', requestId });
    return;
  }

  try {
    const rl = await rateLimitContactForm(req);
    setRateLimitHeaders(res, rl);

    if (!rl.ok) {
      void logSecurityEvent({
        eventType: 'aleem_project_lead_rate_limit',
        severity: 'medium',
        ipAddress: clientIP,
        userAgent,
        metadata: { requestId, reason: rl.reason ?? 'rate_limit' },
      });
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        requestId,
      });
      return;
    }

    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Please check the form.',
        requestId,
      });
      return;
    }

    const body = parsed.data;

    const bot = evaluateBotDefense({
      honeypot: body.honeypot ?? '',
      formOpenedAt: body.formOpenedAt,
      phone: body.phone,
      email: body.email || undefined,
      requirePhone: true,
    });

    if (!bot.ok) {
      void logSecurityEvent({
        eventType: 'aleem_project_lead_bot_blocked',
        severity: bot.code === 'HONEYPOT' || bot.code === 'VELOCITY' ? 'medium' : 'low',
        ipAddress: clientIP,
        userAgent,
        metadata: {
          requestId,
          code: bot.code,
          action: 'project_lead_blocked',
          projectSlug: body.projectSlug,
        },
      });

      res.status(400).json({
        success: false,
        error: botDefenseClientMessage(bot.code),
        requestId,
      });
      return;
    }

    const auth = await getOptionalAuth(req);

    const phoneForLead = bot.phone
      ? formatPakistaniMobileDisplay(bot.phone)
      : body.phone;

    const result = await createProjectLead({
      name: body.name,
      phone: phoneForLead,
      email: bot.email ?? (body.email || undefined),
      intent: body.intent,
      message: body.message,
      projectSlug: body.projectSlug,
      sessionId: body.sessionId,
      userId: auth?.id,
    });

    if (!result.success) {
      void logSecurityEvent({
        eventType: 'aleem_project_lead_failed',
        severity: 'low',
        userId: auth?.id,
        ipAddress: clientIP,
        userAgent,
        metadata: {
          requestId,
          code: result.code ?? 'FAILED',
          projectSlug: body.projectSlug,
        },
      });

      const errorMessages: Record<string, string> = {
        INVALID_NAME: 'Please enter your name.',
        INVALID_PHONE:
          'Please enter a valid Pakistani mobile number, for example 0300-1234567.',
        PROJECT_NOT_FOUND: 'This project is not available or not verified yet.',
        FAILED: 'Unable to submit right now. Please try again.',
      };
      res.status(400).json({
        success: false,
        error: errorMessages[result.code ?? 'FAILED'] ?? 'Unable to submit. Please try again.',
        requestId,
      });
      return;
    }

    void logSecurityEvent({
      eventType: 'aleem_project_lead_created',
      severity: 'low',
      userId: auth?.id,
      ipAddress: clientIP,
      userAgent,
      metadata: {
        requestId,
        leadId: result.leadId,
        routedToDeveloper: result.routedToDeveloper,
        action: 'project_lead_created',
        projectSlug: body.projectSlug,
      },
    });

    res.status(201).json({
      success: true,
      leadId: result.leadId,
      routedToDeveloper: result.routedToDeveloper,
      requestId,
    });
  } catch {
    void logSecurityEvent({
      eventType: 'aleem_project_lead_error',
      severity: 'high',
      ipAddress: clientIP,
      userAgent,
      metadata: { requestId },
    });

    res.status(500).json({
      success: false,
      error: 'Unable to submit right now. Please try again.',
      requestId,
    });
  }
}