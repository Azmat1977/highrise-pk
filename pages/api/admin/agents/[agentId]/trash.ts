// pages/api/admin/agents/[agentId]/trash.ts
// Highrise.pk — Admin Agent Soft Delete / Restore
// PUT: toggles isDeleted (trash ↔ restore)
// Access: Admin only

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import AgentProfile from '@/models/AgentProfile';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';
import mongoose from 'mongoose';

// ─── Types ────────────────────────────────────────────────────────────────────

type TrashAction = 'trashed' | 'restored';

interface TrashResponse {
  success:   boolean;
  message:   string;
  action?:   TrashAction;
  requestId: string;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

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
  res: NextApiResponse<TrashResponse>
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 200);

  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
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

    const now = new Date();
    let action: TrashAction;
    let message: string;

    if (agent.isDeleted) {
      // ── Restore ──────────────────────────────────────────────────────────
      agent.isDeleted      = false;
      agent.deletedAt      = undefined;
      agent.deletedBy      = undefined;
      agent.deletionReason = undefined;

      await agent.addAuditEntry(
        'agent_restored',
        new mongoose.Types.ObjectId(auth.id),
        { restoredAt: now.toISOString() },
        ip
      );

      action  = 'restored';
      message = 'Agent restored from trash successfully';

      logSecurityEvent({
        type:      'admin_action',
        severity:  'medium',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  { action: 'agent_restored', targetAgentId: agentIdStr, requestId },
      });
    } else {
      // ── Soft delete ───────────────────────────────────────────────────────
      agent.isDeleted = true;
      agent.deletedAt = now;
      agent.deletedBy = new mongoose.Types.ObjectId(auth.id);

      await agent.addAuditEntry(
        'agent_trashed',
        new mongoose.Types.ObjectId(auth.id),
        { trashedAt: now.toISOString() },
        ip
      );

      action  = 'trashed';
      message = 'Agent moved to trash successfully';

      logSecurityEvent({
        type:      'admin_action',
        severity:  'medium',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  { action: 'agent_trashed', targetAgentId: agentIdStr, requestId },
      });
    }

    await agent.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message, action, requestId });
  } catch (err: unknown) {
    logSecurityEvent({
      type:      'admin_action',
      severity:  'high',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:  'agent_trash_toggle_error',
        targetAgentId: agentIdStr,
        reason:  err instanceof Error ? err.message : 'UNKNOWN',
        requestId,
      },
    });
    res.status(500).json({ success: false, message: 'Internal server error', requestId });
  }
}