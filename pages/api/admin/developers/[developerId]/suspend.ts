// pages/api/admin/developers/[developerId]/suspend.ts
// 🔒 ENTERPRISE v3.0 — Admin Developer Suspend/Reinstate
// Fixes: requireAdmin order, rateLimit order, security headers,
//        tokenVersion++, requestId, correct param [developerId],
//        audit logs, proper model imports (no registry pattern)

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import DeveloperProfile from '@/models/DeveloperProfile';
import User from '@/models/User';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';
import mongoose from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS & TYPES
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;

const SuspendSchema = z.object({
  action:          z.enum(['suspend', 'reinstate']),
  reason:          z.string().trim().min(10, 'Reason must be at least 10 characters').max(500),
  notifyDeveloper: z.boolean().optional().default(true),
});

interface SuspendResponse {
  success:    boolean;
  message:    string;
  requestId:  string;
  data?: {
    developerId:    string;
    action:         'suspend' | 'reinstate';
    newStatus:      string;
    timestamp:      Date;
  };
  errors?:    Record<string, string[]>;
}

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',              requestId);
  res.setHeader('Content-Type',              'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('Cache-Control',             'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuspendResponse>,
): Promise<void> {

  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return void res.status(405).json({ success: false, message: 'Method not allowed', requestId });
  }

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 200);

  // ── 1. Rate Limit (First) ──────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    return void res.status(429).json({ success: false, message: 'Too many requests', requestId });
  }

  // ── 2. Admin Auth (Second) ─────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── 3. DB (Third) ──────────────────────────────────────────
  await dbConnect();

  // ── 4. Param Validation ────────────────────────────────────
  const { developerId } = req.query;
  if (!developerId || typeof developerId !== 'string' || !mongoose.isValidObjectId(developerId)) {
    return void res.status(400).json({ success: false, message: 'Invalid developer ID', requestId });
  }

  try {
    const parseResult = SuspendSchema.safeParse(req.body);
    if (!parseResult.success) {
      return void res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
        requestId
      });
    }

    const { action, reason, notifyDeveloper } = parseResult.data;

    // ── 5. Load Developer ────────────────────────────────────
    const developer = await DeveloperProfile.findById(developerId).maxTimeMS(MAX_TIME_MS);
    if (!developer) {
      return void res.status(404).json({ success: false, message: 'Developer profile not found', requestId });
    }

    // ── 6. Business Logic Guards ─────────────────────────────
    if (action === 'suspend') {
      if (developer.status === 'suspended') {
        return void res.status(400).json({ success: false, message: 'Developer is already suspended', requestId });
      }
      if (developer.status === 'draft' || developer.status === 'pending') {
        return void res.status(400).json({ 
          success: false, 
          message: `Cannot suspend a developer with status "${developer.status}". Only approved developers can be suspended.`, 
          requestId 
        });
      }
    } else if (action === 'reinstate') {
      if (developer.status !== 'suspended') {
        return void res.status(400).json({ success: false, message: 'Only suspended developers can be reinstated', requestId });
      }
    }

    const now = new Date();
    const adminObjectId = new mongoose.Types.ObjectId(auth.id);

    // ── 7. Update Developer Profile via $set/$push ────────────
    // Use findByIdAndUpdate to avoid direct property assignment
    // on fields not declared in IDeveloperProfile interface
    const newStatus = action === 'suspend' ? 'suspended' : 'approved';
    const suspensionEntry = { action, reason, adminId: auth.id, timestamp: now };

    await DeveloperProfile.findByIdAndUpdate(
      developerId,
      {
        $set: {
          status: newStatus,
          ...(action === 'suspend' && {
            suspendedAt:      now,
            suspendedBy:      adminObjectId,
            suspensionReason: reason,
            reinstatedAt:     null,
            reinstatedBy:     null,
          }),
          ...(action === 'reinstate' && {
            reinstatedAt:     now,
            reinstatedBy:     adminObjectId,
            suspendedAt:      null,
            suspendedBy:      null,
            suspensionReason: null,
          }),
        },
        $push: { suspensionHistory: suspensionEntry },
      },
      { runValidators: false }
    ).maxTimeMS(MAX_TIME_MS);

    // ── 8. Audit entry via addAuditEntry on fetched doc ───────
    await developer.addAuditEntry(
      `developer_${action}ed`,
      adminObjectId,
      { reason, notifyDeveloper },
      ip
    );

    await developer.save();

    // ── 9. Update Linked User (tokenVersion++ is CRITICAL) ────
    // Invalidates ALL active JWTs — suspended developer cannot
    // continue using an existing session
    if (developer.user) {
      await User.findByIdAndUpdate(
        developer.user,
        {
          $set: { isSuspended: action === 'suspend' },
          $inc: { tokenVersion: 1 },
        }
      ).maxTimeMS(MAX_TIME_MS);
    }

    // ── 9. Audit Logging (MUST AWAIT) ────────────────────────
    await logSecurityEvent({
      type: 'admin_action',
      severity: action === 'suspend' ? 'high' : 'medium',
      userId: auth.id,
      ip,
      userAgent: ua,
      metadata: {
        action: `developer_${action}ed`,
        developerId,
        companyName: developer.companyName,
        reason,
        requestId
      },
    });

    return void res.status(200).json({
      success: true,
      message: `Developer ${action === 'suspend' ? 'suspended' : 'reinstated'} successfully`,
      requestId,
      data: {
        developerId,
        action,
        newStatus,
        timestamp: now,
      }
    });

  } catch (error: unknown) {
    await logSecurityEvent({
      type: 'admin_action',
      severity: 'high',
      userId: auth.id,
      ip,
      userAgent: ua,
      metadata: {
        action: `developer_${req.body?.action || 'suspend'}_error`,
        developerId,
        error: error instanceof Error ? error.message : 'Unknown',
        requestId
      },
    });

    return void res.status(500).json({ success: false, message: 'Internal server error', requestId });
  }
}