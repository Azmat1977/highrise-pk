// pages/api/aleem/project-lead.ts
// ALEEM - project inquiry lead from project page or chat widget.
// Public endpoint: works for guests and registered users.

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { rateLimitContactForm, setRateLimitHeaders } from '@/lib/rateLimit';
import { createProjectLead } from '@/lib/aleem/createAleemLead';

const BodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  intent: z.enum(['buy', 'invest', 'brochure', 'visit', 'general']).optional(),
  message: z.string().trim().max(500).optional(),
  projectSlug: z.string().trim().max(120),
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

  const result = await createProjectLead({
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    intent: parsed.data.intent,
    message: parsed.data.message,
    projectSlug: parsed.data.projectSlug,
    sessionId: parsed.data.sessionId,
    userId: auth?.id,
  });

  if (!result.success) {
    const errorMessages: Record<string, string> = {
      INVALID_NAME: 'Please enter your name.',
      INVALID_PHONE: 'Please enter a valid Pakistani mobile number, for example 0300-1234567.',
      PROJECT_NOT_FOUND: 'This project is not available or not verified yet.',
      FAILED: 'Unable to submit right now. Please try again.',
    };
    res.status(400).json({
      success: false,
      error: errorMessages[result.code ?? 'FAILED'] ?? 'Unable to submit. Please try again.',
    });
    return;
  }

  res.status(201).json({
    success: true,
    leadId: result.leadId,
    routedToDeveloper: result.routedToDeveloper,
  });
}