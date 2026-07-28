// pages/api/units/[id]/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Unit from '@/models/Unit';
import { requireAuth } from '@/lib/requireAuth';
import {
  rateLimitDeveloper,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';
import { z } from 'zod';

// ════════════════════════════════════════════════════
// ZOD VALIDATION SCHEMAS
// ════════════════════════════════════════════════════

const BookingInfoSchema = z.object({
  reservedByName:    z.string().min(1).max(100).optional(),
  reservedByPhone:   z.string().min(7).max(20).optional(),
  reservedByEmail:   z.string().email().optional(),
  reservedUntil:     z.string().datetime().optional(),
  reservationAmount: z.number().min(0).optional(),
  reservationNotes:  z.string().max(500).optional(),
}).optional();

const SoldInfoSchema = z.object({
  soldToName:    z.string().min(1).max(100).optional(),
  soldToPhone:   z.string().min(7).max(20).optional(),
  soldToCnic:    z.string().max(20).optional(),
  soldPrice:     z.number().min(0).optional(),
  paymentMethod: z.enum([
    'full_payment',
    'installment',
    'bank_finance',
    'mixed',
  ]).optional(),
  saleNotes: z.string().max(500).optional(),
}).optional();

const StatusSchema = z.object({
  status: z.enum(['available', 'reserved', 'sold', 'on_hold', 'cancelled']),
  bookingInfo: BookingInfoSchema,
  soldInfo:    SoldInfoSchema,
});

// ════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── Method guard ──
  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── ID guard ──
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, message: 'Unit ID is required' });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid unit ID' });
  }

  // ── Auth guard ──
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── Role guard ──
  const role = auth.role as string;
  if (!['developer', 'admin'].includes(role)) {
    await logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'medium',
      userId: auth.id,
      metadata: {
        action: 'unit_status_change_unauthorized_role',
        unitId: id,
        role,
        reason: 'Non-developer attempted unit status change',
      },
    });
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // ── Rate limit ──
  const rl = await rateLimitDeveloper(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── DB ──
  await dbConnect();

  try {
    // ── Zod validation ──
    const parsed = StatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { status, bookingInfo, soldInfo } = parsed.data;

    // ── Find unit ──
    const unit = await Unit.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: { $ne: true },
    }).lean() as {
      _id: mongoose.Types.ObjectId;
      projectId: mongoose.Types.ObjectId;
      developerId: mongoose.Types.ObjectId;
      status: string;
      price: number;
      unitNumber?: string;
      unitType?: string;
    } | null;

    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    // ── Ownership check — session-based ──
    if (role === 'developer') {
      const DeveloperProfile = mongoose.models.DeveloperProfile as
        mongoose.Model<mongoose.Document>;

      if (!DeveloperProfile) {
        return res.status(500).json({ success: false, message: 'Something went wrong' });
      }

      const devProfile = await DeveloperProfile.findOne(
        { user: auth.id },
        { _id: 1 }
      ).lean() as { _id: mongoose.Types.ObjectId } | null;

      if (!devProfile) {
        return res.status(403).json({
          success: false,
          message: 'Developer profile not found',
        });
      }

      if (unit.developerId.toString() !== devProfile._id.toString()) {
        await logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          userId: auth.id,
          metadata: {
            action: 'unit_status_change_unauthorized',
            unitId: id,
            reason: 'Developer attempted to change status of another developer unit',
            targetDeveloperId: unit.developerId.toString(),
          },
        });
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this unit',
        });
      }
    }

    // ── Business rule: prevent redundant status change ──
    if (unit.status === status) {
      return res.status(400).json({
        success: false,
        message: `Unit is already ${status}`,
      });
    }

    // ── Business rule: sold units cannot be changed by developers ──
    if (unit.status === 'sold' && role === 'developer') {
      return res.status(403).json({
        success: false,
        message: 'Sold units can only be updated by administrators',
      });
    }

    // ── Build update payload ──
    const previousStatus = unit.status;
    const updateData: Record<string, unknown> = {
      status,
      lastStatusChangedAt: new Date(),
    };

    // Reserved — capture booking info
    if (status === 'reserved') {
      if (!bookingInfo) {
        return res.status(400).json({
          success: false,
          message: 'Booking information is required when reserving a unit',
        });
      }
      updateData.bookingInfo = {
        reservedByName:    bookingInfo.reservedByName,
        reservedByPhone:   bookingInfo.reservedByPhone,
        reservedByEmail:   bookingInfo.reservedByEmail,
        reservedOn:        new Date(),
        reservedUntil:     bookingInfo.reservedUntil
          ? new Date(bookingInfo.reservedUntil)
          : undefined,
        reservationAmount: bookingInfo.reservationAmount,
        reservationNotes:  bookingInfo.reservationNotes,
        reservationExpired: false,
      };
    }

    // Sold — capture sale info
    if (status === 'sold') {
      if (!soldInfo) {
        return res.status(400).json({
          success: false,
          message: 'Sale information is required when marking a unit as sold',
        });
      }
      updateData.soldInfo = {
        soldToName:    soldInfo.soldToName,
        soldToPhone:   soldInfo.soldToPhone,
        soldToCnic:    soldInfo.soldToCnic,
        soldOn:        new Date(),
        soldPrice:     soldInfo.soldPrice ?? unit.price,
        paymentMethod: soldInfo.paymentMethod,
        saleNotes:     soldInfo.saleNotes,
      };
    }

    // Available — clear booking/sold info
    if (status === 'available') {
      updateData.bookingInfo = null;
      // Note: soldInfo intentionally NOT cleared — audit trail preserved
    }

    // On hold / cancelled — no extra data required
    // (admin-level action logged below)

    // ── Update unit ──
    const updated = await Unit.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // ── Sync project unit type breakdown ──
    syncUnitTypeBreakdown(String(unit.projectId)).catch(() => {
      // Silent — sync failure never blocks response
    });

    // ── Determine audit severity ──
    const auditSeverity = status === 'sold' || status === 'cancelled'
      ? 'medium'
      : 'low';

    // ── Audit log ──
    await logSecurityEvent({
      type: 'admin_action',
      severity: auditSeverity,
      userId: auth.id,
      metadata: {
        action:         'unit_status_changed',
        unitId:         id,
        unitNumber:     unit.unitNumber,
        unitType:       unit.unitType,
        projectId:      String(unit.projectId),
        previousStatus,
        newStatus:      status,
        changedByRole:  role,
        hasBookingInfo: status === 'reserved' ? true : undefined,
        hasSoldInfo:    status === 'sold' ? true : undefined,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Unit status updated to "${status}" successfully`,
      data: {
        unitId:         id,
        previousStatus,
        newStatus:      status,
        unit:           updated,
      },
    });

  } catch (error: unknown) {
    await logSecurityEvent({
      type: 'system_error',
      severity: 'high',
      userId: auth.id,
      metadata: {
        action: 'unit_status_change_failed',
        unitId: id,
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
}