// pages/api/admin/developers/[developerId]/suspend.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  rateLimitAdmin,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { logDeveloperAction } from '@/lib/logAdminAction';
import { z } from 'zod';

// ════════════════════════════════════════════════════
// ZOD VALIDATION
// ════════════════════════════════════════════════════

const SuspendSchema = z.object({
  action: z.enum(['suspend', 'reinstate']),
  reason: z.string().min(10).max(500),
  notifyDeveloper: z.boolean().optional().default(true),
});

// ════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── Method guard ──
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── Admin guard ──
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // ── Rate limit ──
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── ID guard ──
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, message: 'Developer ID is required' });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid developer ID' });
  }

  // ── DB ──
  await dbConnect();

  try {
    // ── Zod validation ──
    const parsed = SuspendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { action, reason, notifyDeveloper } = parsed.data;

    // ── Load developer profile (registry pattern) ──
    const DeveloperProfile = mongoose.models.DeveloperProfile as
      mongoose.Model<mongoose.Document>;

    if (!DeveloperProfile) {
      return res.status(500).json({ success: false, message: 'Something went wrong' });
    }

    const developer = await DeveloperProfile.findById(id).lean() as {
      _id: mongoose.Types.ObjectId;
      user: mongoose.Types.ObjectId;
      companyName?: string;
      status?: string;
      contactEmail?: string;
      suspensionHistory?: Array<{
        action: string;
        reason: string;
        adminId: string;
        timestamp: Date;
      }>;
    } | null;

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: 'Developer profile not found',
      });
    }

    // ── Business rules ──
    if (action === 'suspend') {
      // Cannot suspend already suspended developer
      if (developer.status === 'suspended') {
        return res.status(400).json({
          success: false,
          message: 'Developer is already suspended',
        });
      }

      // Cannot suspend a draft/pending profile
      // (they have no active access to suspend)
      if (developer.status === 'draft' || developer.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot suspend a developer with status "${developer.status}". Only approved developers can be suspended.`,
        });
      }
    }

    if (action === 'reinstate') {
      // Can only reinstate suspended developers
      if (developer.status !== 'suspended') {
        return res.status(400).json({
          success: false,
          message: `Cannot reinstate a developer with status "${developer.status}". Only suspended developers can be reinstated.`,
        });
      }
    }

    // ── Build update ──
    const now = new Date();

    const suspensionEntry = {
      action,
      reason,
      adminId: admin.id,
      timestamp: now,
    };

    const updateData: Record<string, unknown> = {
      status: action === 'suspend' ? 'suspended' : 'approved',
      $push: {
        suspensionHistory: suspensionEntry,
      },
    };

    if (action === 'suspend') {
      updateData.suspendedAt = now;
      updateData.suspendedBy = admin.id;
      updateData.suspensionReason = reason;
      updateData.reinstatedAt = null;
      updateData.reinstatedBy = null;
    }

    if (action === 'reinstate') {
      updateData.reinstatedAt = now;
      updateData.reinstatedBy = admin.id;
      updateData.suspendedAt = null;
      updateData.suspendedBy = null;
      updateData.suspensionReason = null;
    }

    // ── Apply update ──
    // Use findByIdAndUpdate with $set + $push separately
    // because MongoDB does not allow mixing $set and $push
    // in the same top-level update object
    await DeveloperProfile.findByIdAndUpdate(
      id,
      {
        $set: {
          status:           action === 'suspend' ? 'suspended' : 'approved',
          ...(action === 'suspend' && {
            suspendedAt:      now,
            suspendedBy:      admin.id,
            suspensionReason: reason,
            reinstatedAt:     null,
            reinstatedBy:     null,
          }),
          ...(action === 'reinstate' && {
            reinstatedAt:     now,
            reinstatedBy:     admin.id,
            suspendedAt:      null,
            suspendedBy:      null,
            suspensionReason: null,
          }),
        },
        $push: {
          suspensionHistory: suspensionEntry,
        },
      },
      { new: true, runValidators: false }
    );

    // ── Also suspend/reinstate linked User account ──
    const User = mongoose.models.User as mongoose.Model<mongoose.Document>;
    if (User && developer.user) {
      await User.findByIdAndUpdate(
        developer.user,
        {
          $set: {
            isSuspended: action === 'suspend',
            suspendedAt: action === 'suspend' ? now : null,
          },
        },
        { runValidators: false }
      );
    }

    // ── Security event ──
    await logSecurityEvent({
      type: 'admin_action',
      severity: action === 'suspend' ? 'high' : 'medium',
      userId: admin.id,
      metadata: {
        action:          `developer_${action}ed`,
        developerId:     id,
        companyName:     developer.companyName,
        previousStatus:  developer.status,
        newStatus:       action === 'suspend' ? 'suspended' : 'approved',
        reason,
        notifyDeveloper,
        linkedUserId:    developer.user?.toString(),
      },
    });

    // ── Admin audit log ──
    await logDeveloperAction({
      action:        action === 'suspend' ? 'developer_suspended' : 'developer_restored',
      adminId:       admin.id,
      adminEmail:    admin.email,
      entityId:      id,
      entityLabel:   developer.companyName,
      previousValue: developer.status,
      newValue:      action === 'suspend' ? 'suspended' : 'approved',
      reason,
      ip:            req.headers['x-forwarded-for']?.toString() ?? '',
      userAgent:     req.headers['user-agent'] ?? '',
    });

    // ── Success response ──
    const actionLabel = action === 'suspend' ? 'suspended' : 'reinstated';

    return res.status(200).json({
      success: true,
      message: `Developer ${actionLabel} successfully`,
      data: {
        developerId:    id,
        action,
        previousStatus: developer.status,
        newStatus:      action === 'suspend' ? 'suspended' : 'approved',
        reason,
        timestamp:      now,
      },
    });

  } catch (error: unknown) {
    await logSecurityEvent({
      type: 'system_error',
      severity: 'high',
      userId: admin.id,
      metadata: {
        action:      'developer_suspend_failed',
        developerId: id,
        reason:      error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
}