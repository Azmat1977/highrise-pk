// pages/api/admin/units/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Unit from '@/models/Unit';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  rateLimitAdmin,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { logAdminAction } from '@/lib/logAdminAction';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';
import { z } from 'zod';

// ════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════

const AdminUnitUpdateSchema = z.object({
  // Visibility & verification
  isPublished:    z.boolean().optional(),
  isVerified:     z.boolean().optional(),
  isFeatured:     z.boolean().optional(),
  isHotDeal:      z.boolean().optional(),
  isPriceDropped: z.boolean().optional(),

  // Status override (admin can change any status)
  status: z.enum([
    'available',
    'reserved',
    'sold',
    'on_hold',
    'cancelled',
  ]).optional(),

  // Price override
  price:          z.number().min(0).optional(),
  previousPrice:  z.number().min(0).optional(),
  priceLabel:     z.string().max(100).optional(),

  // Admin notes
  adminNotes:     z.string().max(2000).optional(),

  // Reason (required for destructive actions)
  reason:         z.string().max(500).optional(),
});

const AdminTrashSchema = z.object({
  reason: z.string().min(5).max(500),
});

const AdminRestoreSchema = z.object({
  reason: z.string().min(5).max(500).optional(),
});

// ════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── ID guard ──
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, message: 'Unit ID is required' });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid unit ID' });
  }

  // ── Rate limit (First) ──
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── Auth (Second) ──
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // ── DB (Third) ──
  await dbConnect();

  // ════════════════════════════════════════════════════
  // GET — Single unit full detail (admin view)
  // ════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const unit = await Unit.findById(id)
        .populate('projectId',  'projectName slug city area status developerId')
        .populate('developerId', 'companyName email slug status')
        .lean() as Record<string, unknown> | null;

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Unit not found',
        });
      }

      // Admin sees ALL fields including soft-deleted
      return res.status(200).json({
        success: true,
        data: { unit },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   admin.id,
        metadata: {
          action: 'admin_unit_fetch_failed',
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

  // ════════════════════════════════════════════════════
  // PATCH — Admin update unit
  // ════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      // Zod validation
      const parsed = AdminUnitUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const updates = parsed.data;

      // Find existing unit (including deleted — admin can restore)
      const existingUnit = await Unit.findById(id).lean() as {
        _id:        mongoose.Types.ObjectId;
        projectId:  mongoose.Types.ObjectId;
        developerId: mongoose.Types.ObjectId;
        unitNumber?: string;
        unitType?:  string;
        status?:    string;
        price?:     number;
        isPublished?: boolean;
        isVerified?:  boolean;
        isFeatured?:  boolean;
        isDeleted?:   boolean;
      } | null;

      if (!existingUnit) {
        return res.status(404).json({
          success: false,
          message: 'Unit not found',
        });
      }

      // ── Build update payload ──
      const updateData: Record<string, unknown> = {};
      const changedFields: string[] = [];

      if (updates.isPublished !== undefined) {
        updateData.isPublished = updates.isPublished;
        changedFields.push('isPublished');
      }
      if (updates.isVerified !== undefined) {
        updateData.isVerified = updates.isVerified;
        // Auto-publish when verified
        if (updates.isVerified && !existingUnit.isPublished) {
          updateData.isPublished = true;
          changedFields.push('isPublished');
        }
        changedFields.push('isVerified');
      }
      if (updates.isFeatured !== undefined) {
        updateData.isFeatured = updates.isFeatured;
        changedFields.push('isFeatured');
      }
      if (updates.isHotDeal !== undefined) {
        updateData.isHotDeal = updates.isHotDeal;
        changedFields.push('isHotDeal');
      }
      if (updates.isPriceDropped !== undefined) {
        updateData.isPriceDropped = updates.isPriceDropped;
        changedFields.push('isPriceDropped');
      }
      if (updates.status !== undefined) {
        updateData.status = updates.status;
        updateData.lastStatusChangedAt = new Date();
        changedFields.push('status');
      }
      if (updates.price !== undefined) {
        // Capture previous price before overwrite
        if (existingUnit.price && existingUnit.price !== updates.price) {
          updateData.previousPrice = existingUnit.price;
        }
        updateData.price = updates.price;
        changedFields.push('price');
      }
      if (updates.previousPrice !== undefined) {
        updateData.previousPrice = updates.previousPrice;
        changedFields.push('previousPrice');
      }
      if (updates.priceLabel !== undefined) {
        updateData.priceLabel = updates.priceLabel;
        changedFields.push('priceLabel');
      }
      if (updates.adminNotes !== undefined) {
        updateData.adminNotes = updates.adminNotes;
        changedFields.push('adminNotes');
      }

      if (changedFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields provided to update',
        });
      }

      // ── Apply update ──
      const updated = await Unit.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: false }
      ).lean();

      // ── Sync project breakdown ──
      syncUnitTypeBreakdown(String(existingUnit.projectId)).catch(() => {
        // Silent
      });

      // ── Determine audit severity ──
      const severity =
        updates.isVerified === false ||
        updates.status === 'cancelled'
          ? 'medium'
          : 'low';

      // ── Security event ──
      await logSecurityEvent({
        type:     'admin_action',
        severity,
        userId:   admin.id,
        metadata: {
          action:        'admin_unit_updated',
          unitId:        id,
          unitNumber:    existingUnit.unitNumber,
          projectId:     String(existingUnit.projectId),
          changedFields,
          reason:        updates.reason,
        },
      });

      // ── Admin audit log ──
      await logAdminAction({
        action:      'unit_updated' as any,
        entityType:  'unit' as any,
        adminId:     admin.id,
        adminEmail:  admin.email,
        entityId:    id,
        entityLabel: existingUnit.unitNumber,
        previousValue: JSON.stringify({
          status:      existingUnit.status,
          isPublished: existingUnit.isPublished,
          isVerified:  existingUnit.isVerified,
          price:       existingUnit.price,
        }),
        newValue: JSON.stringify(updateData),
        reason:   updates.reason,
        meta: {
          changedFields,
          projectId: String(existingUnit.projectId),
        },
        ip:        req.headers['x-forwarded-for']?.toString() ?? '',
        userAgent: req.headers['user-agent'] ?? '',
      });

      return res.status(200).json({
        success: true,
        message: 'Unit updated successfully',
        data: {
          unitId:        id,
          changedFields,
          unit:          updated,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   admin.id,
        metadata: {
          action: 'admin_unit_update_failed',
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

  // ════════════════════════════════════════════════════
  // DELETE — Soft delete (trash) unit
  // ════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      // Zod validation
      const parsed = AdminTrashSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'A reason is required to delete a unit',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { reason } = parsed.data;

      // Find unit
      const unit = await Unit.findOne({
        _id:       new mongoose.Types.ObjectId(id),
        isDeleted: { $ne: true },
      }).lean() as {
        _id:        mongoose.Types.ObjectId;
        projectId:  mongoose.Types.ObjectId;
        developerId: mongoose.Types.ObjectId;
        unitNumber?: string;
        status?:    string;
      } | null;

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Unit not found or already deleted',
        });
      }

      // Soft delete
      await Unit.findByIdAndUpdate(id, {
        $set: {
          isDeleted:  true,
          deletedAt:  new Date(),
          isPublished: false,
        },
      });

      // Sync project breakdown
      syncUnitTypeBreakdown(String(unit.projectId)).catch(() => {
        // Silent
      });

      // Security event
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'high',
        userId:   admin.id,
        metadata: {
          action:     'admin_unit_trashed',
          unitId:     id,
          unitNumber: unit.unitNumber,
          projectId:  String(unit.projectId),
          reason,
        },
      });

      // Admin audit log
      await logAdminAction({
        action:      'unit_deleted' as any,
        entityType:  'unit' as any,
        adminId:     admin.id,
        adminEmail:  admin.email,
        entityId:    id,
        entityLabel: unit.unitNumber,
        previousValue: unit.status,
        newValue:    'deleted',
        reason,
        ip:        req.headers['x-forwarded-for']?.toString() ?? '',
        userAgent: req.headers['user-agent'] ?? '',
      });

      return res.status(200).json({
        success: true,
        message: 'Unit deleted successfully',
        data: { unitId: id },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   admin.id,
        metadata: {
          action: 'admin_unit_trash_failed',
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

  // ════════════════════════════════════════════════════
  // PUT — Restore soft-deleted unit
  // ════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      // Zod validation
      const parsed = AdminRestoreSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { reason } = parsed.data;

      // Find deleted unit
      const unit = await Unit.findOne({
        _id:       new mongoose.Types.ObjectId(id),
        isDeleted: true,
      }).lean() as {
        _id:        mongoose.Types.ObjectId;
        projectId:  mongoose.Types.ObjectId;
        unitNumber?: string;
      } | null;

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Unit not found or not deleted',
        });
      }

      // Restore — unpublished by default (admin must re-review)
      await Unit.findByIdAndUpdate(id, {
        $set: {
          isDeleted:   false,
          deletedAt:   null,
          isPublished: false,
        },
      });

      // Sync project breakdown
      syncUnitTypeBreakdown(String(unit.projectId)).catch(() => {
        // Silent
      });

      // Security event
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'medium',
        userId:   admin.id,
        metadata: {
          action:     'admin_unit_restored',
          unitId:     id,
          unitNumber: unit.unitNumber,
          projectId:  String(unit.projectId),
          reason,
        },
      });

      // Admin audit log
      await logAdminAction({
        action:      'unit_restored' as any,
        entityType:  'unit' as any,
        adminId:     admin.id,
        adminEmail:  admin.email,
        entityId:    id,
        entityLabel: unit.unitNumber,
        previousValue: 'deleted',
        newValue:    'restored',
        reason,
        ip:        req.headers['x-forwarded-for']?.toString() ?? '',
        userAgent: req.headers['user-agent'] ?? '',
      });

      return res.status(200).json({
        success: true,
        message: 'Unit restored successfully',
        data: { unitId: id },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   admin.id,
        metadata: {
          action: 'admin_unit_restore_failed',
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

  // ── Method not allowed ──
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}