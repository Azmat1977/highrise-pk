// pages/api/aleem/lead.ts
// ALEEM - expert callback lead from the in-chat form.
//
// Replaces POST /api/aria/leads. Public by design: most first-time enquiries
// come from visitors with no account, and blocking them closes the funnel.
// Abuse is bounded by the existing 5/hour contact-form limit.

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { rateLimitContactForm, setRateLimitHeaders } from '@/lib/rateLimit';
import { createExpertLead } from '@/lib/aleem/createAleemLead';

const BodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  intent: z.enum(['buy', 'rent', 'invest', 'verify']).optional(),
  message: z.string().trim().max(500).optional(),
  propertySlug: z.string().trim().max(120).optional(),
  sessionId: z.string().trim().max(64).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const rl = await rateLimitContactForm(req);
  setRateLimitHeaders(res, rl);

  if (!rl.ok) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
    });
    return;
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Please check the form.',
    });
    return;
  }

  const auth = await getOptionalAuth(req);

  const result = await createExpertLead({
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    intent: parsed.data.intent,
    message: parsed.data.message,
    propertySlug: parsed.data.propertySlug,
    sessionId: parsed.data.sessionId,
    userId: auth?.id,
  });

  if (!result.success) {
    res.status(400).json({
      success: false,
      error:
        result.code === 'INVALID_PHONE'
          ? 'Please enter a valid Pakistani mobile number, for example 0300-1234567.'
          : result.code === 'INVALID_NAME'
          ? 'Please enter your name.'
          : 'Unable to submit right now. Please try again.',
    });
    return;
  }

  res.status(201).json({
    success: true,
    leadId: result.leadId,
    assignedAgent: result.assignedAgent,
  });
}