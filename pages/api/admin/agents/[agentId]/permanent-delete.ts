// pages/api/admin/agents/[agentId]/permanent-delete.ts
// Highrise.pk — Admin Agent Permanent Delete
// DELETE: irreversible hard delete (must be in trash first)
// Requires: confirmationCode + reason (min 10 chars)
// Access: Admin only

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import AgentProfile from '@/models/AgentProfile';
import User from '@/models/User';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONFIRMATION_CODE = 'DELETE-AGENT-PERMANENTLY';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

const DeleteBodySchema = z.object({
  confirmationCode: z.literal(CONFIRMATION_CODE, {
    message: 'Invalid confirmation code',
  }),
  reason: z.string().trim().min(10, 'Reason must be at least 10 characters'),
});

// ─── Security headers ─────────────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? '').split(',')[0]?.trim() ||
    req.socket?.remoteAddress || '0.0.0.0';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 200);

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    res.status(405).json({ success: false, message: 'Method not allowed', requestId });
    return;
  }

  const { agentId } = req.query;
  const idResult = ObjectIdSchema.safeParse(agentId);
  if (!idResult.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid Agent ID format',
      requestId,
    });
    return;
  }
  const agentIdStr = idResult.data;

  await dbConnect();

  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({
      success: false,
      message: `Too many requests. Retry in ${rl.retryAfter ?? 60} seconds.`,
      requestId,
    });
    return;
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── Validate body ──────────────────────────────────────────────────────────
  const bodyResult = DeleteBodySchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({
      success: false,
      message: bodyResult.error.issues[0]?.message ?? 'Invalid request body',
      requestId,
    });
    return;
  }

  const { reason } = bodyResult.data;

  try {
    const agent = await AgentProfile.findById(agentIdStr).maxTimeMS(5000);

    if (!agent) {
      res.status(404).json({
        success: false,
        message: 'Agent not found',
        requestId,
      });
      return;
    }

    // ── Safety gate: must be in trash first ──────────────────────────────────
    if (!agent.isDeleted) {
      res.status(400).json({
        success: false,
        message: 'Agent must be moved to trash before permanent deletion.',
        code: 'NOT_IN_TRASH',
        requestId,
      });
      return;
    }

    const agentDisplayName = agent.displayName;
    const agentUserId = agent.user;

    // ── Hard delete ──────────────────────────────────────────────────────────
    await AgentProfile.findByIdAndDelete(agentIdStr);

    // ── V6.8.0: Full capability cleanup + role downgrade ─────────────────────
    // Clear all agent-related flags since profile is permanently gone
    // tokenVersion++ forces immediate re-login (ensures no stale session)
    await User.findByIdAndUpdate(
      agentUserId,
      {
        $set: {
          role:                    'user',
          isVerifiedAgent:         false,
          agentVerificationStatus: 'none',
          agentProfileId:          null,
          agentListingCount:       0,
        },
        $inc: { tokenVersion: 1 },
      },
      { runValidators: true }
    ).maxTimeMS(5000);

    logSecurityEvent({
      type:      'admin_action',
      severity:  'critical',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:                    'agent_permanently_deleted',
        targetAgentId:             agentIdStr,
        agentUserId:               String(agentUserId),
        agentName:                 agentDisplayName,
        reason,
        capabilitiesRevoked:       ['isVerifiedAgent', 'agentProfileId', 'agentListingCount'],
        agentVerificationStatus:   'none',
        roleDowngraded:            'user',
        requestId,
      },
    });

    res.status(200).json({
      success: true,
      message: `Agent "${agentDisplayName}" permanently deleted.`,
      requestId,
    });
  } catch (err: unknown) {
    logSecurityEvent({
      type:      'admin_action',
      severity:  'critical',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:        'agent_permanent_delete_error',
        targetAgentId: agentIdStr,
        reason:        err instanceof Error ? err.message : 'UNKNOWN',
        requestId,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      requestId,
    });
  }
}