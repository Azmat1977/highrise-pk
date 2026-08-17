// pages/api/admin/reports/[id].ts
// 🔒 ENTERPRISE v2.0 - Single Report View & Status Update with Atomic Operations & Audit Trail

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Report from '@/models/Report';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import mongoose from 'mongoose';
import { requireAuth } from '@/lib/requireAuth';
import { checkPermission } from '@/lib/permissions';
import { z } from 'zod';
import { rateLimitAdmin } from '@/lib/rateLimit';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 3000;
const ALLOWED_STATUS = ['open', 'reviewing', 'resolved', 'rejected'] as const;
const MIN_RESOLUTION_NOTES_LENGTH = 10;
const MAX_RESOLUTION_NOTES_LENGTH = 1000;

// ✅ Zod Schema for PATCH Request
const UpdateSchema = z.object({
  status: z.enum(ALLOWED_STATUS),
  resolutionNotes: z.string().trim().min(MIN_RESOLUTION_NOTES_LENGTH).max(MAX_RESOLUTION_NOTES_LENGTH).optional(),
  actionTaken: z.enum(['none', 'warning_sent', 'content_removed', 'user_banned', 'escalated']).optional(),
}).superRefine((value, ctx) => {
  if ((value.status === 'resolved' || value.status === 'rejected') && !value.resolutionNotes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['resolutionNotes'],
      message: 'Resolution notes are required when closing a report.',
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function setSecurityHeaders(res: NextApiResponse, requestId: string) {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

// ═══════════════════════════════════════════════════════════════
// 🔒 HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip || '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

function requireActiveUserOrThrow(user: any) {
  if (!user || user.isDeleted || user.status === 'banned') {
    const err: any = new Error('Account is restricted');
    err.statusCode = 403;
    err.code = 'ACCOUNT_RESTRICTED';
    throw err;
  }
}

function requireAdminRoleOrThrow(user: any) {
  const role = String(user?.role || 'user').toLowerCase();
  if (!['admin', 'superadmin'].includes(role)) {
    const err: any = new Error('Admin access required');
    err.statusCode = 403;
    err.code = 'ADMIN_REQUIRED';
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] || '').slice(0, 200);

  // ═══════════════════════════════════════════════════════════════
  // ✅ VALIDATE REPORT ID
  // ═══════════════════════════════════════════════════════════════

  const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid report ID',
      code: 'INVALID_ID',
      requestId 
    });
  }

  try {
    await dbConnect();

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUTHENTICATION & AUTHORIZATION
    // ═══════════════════════════════════════════════════════════════

    const auth = await requireAuth(req, res);
    if (!auth) return;

    const admin: any = await User.findById(auth.id)
      .select('role status isDeleted permissions')
      .lean()
      .maxTimeMS(MAX_TIME_MS);

    requireActiveUserOrThrow(admin);
    requireAdminRoleOrThrow(admin);

    const isSuperAdmin = String(admin.role).toLowerCase() === 'superadmin';

    // ═══════════════════════════════════════════════════════════════
    // ✅ RATE LIMITING (Applied once for all methods)
    // ═══════════════════════════════════════════════════════════════

    const rlResult = await rateLimitAdmin(req);
    if (!rlResult.ok) {
      res.setHeader('Retry-After', String(rlResult.retryAfter || 60));
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.',
        code: 'RATE_LIMITED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ METHOD: GET - View Report Details
    // ═══════════════════════════════════════════════════════════════

    if (req.method === 'GET') {
      const hasPermission = checkPermission(admin, 'reports.view');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
          code: 'PERMISSION_DENIED',
          requestId,
        });
      }

      const report: any = await Report.findById(id)
        .select('-__v')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (!report) {
        return res.status(404).json({ 
          success: false, 
          message: 'Report not found',
          code: 'NOT_FOUND',
          requestId 
        });
      }

      // PII Redaction for non-superadmins
      const reportData: any = {
        _id: String(report._id),
        entityType: report.entityType,
        entityId: String(report.entityId),
        reason: report.reason,
        details: report.details,
        reporterUserId: report.reporterUserId ? String(report.reporterUserId) : null,
        reporterEmail: isSuperAdmin ? report.reporterEmail : `${(report.reporterEmail || '').slice(0, 3)}***@***`,
        reporterPhone: isSuperAdmin ? report.reporterPhone : `***${(report.reporterPhone || '').slice(-4)}`,
        status: report.status,
        resolutionNotes: report.resolutionNotes || '',
        actionTaken: report.actionTaken || 'none',
        resolvedBy: report.resolvedBy ? String(report.resolvedBy) : null,
        resolvedAt: report.resolvedAt || null,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      };

      // Audit log (async - non-blocking)
      SecurityEvent.create({
        eventType: 'admin.report.viewed',
        userId: auth.id,
        metadata: { reportId: id },
        ipAddress: ip,
        userAgent: ua,
        severity: 'info',
      }).catch((err) => console.error('Audit failed:', err));

      return res.status(200).json({
        success: true,
        report: reportData,
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ METHOD: PATCH - Update Report Status
    // ═══════════════════════════════════════════════════════════════

    if (req.method === 'PATCH') {
      const hasPermission = checkPermission(admin, 'reports.update');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
          code: 'PERMISSION_DENIED',
          requestId,
        });
      }

      // Validate input
      const parseResult = UpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          errors: parseResult.error.flatten().fieldErrors,
          requestId,
        });
      }

      const { status, resolutionNotes, actionTaken } = parseResult.data;

      const currentReport: any = await Report.findById(id)
        .select('status resolvedAt resolvedBy')
        .lean()
        .maxTimeMS(MAX_TIME_MS);
      if (!currentReport) {
        return res.status(404).json({ success: false, message: 'Report not found', code: 'NOT_FOUND', requestId });
      }

      const isFinal = currentReport.status === 'resolved' || currentReport.status === 'rejected';
      const reopening = isFinal && (status === 'open' || status === 'reviewing');
      if (reopening && !isSuperAdmin) {
        return res.status(409).json({
          success: false,
          message: 'Closed reports can only be reopened by a superadmin.',
          code: 'FINAL_REPORT_STATE',
          requestId,
        });
      }

      // ✅ Atomic Update with $set
      const updatePayload: any = {
        status,
        updatedAt: new Date(),
      };

      if (resolutionNotes) {
        updatePayload.resolutionNotes = resolutionNotes;
      }

      if (actionTaken) {
        updatePayload.actionTaken = actionTaken;
      }

      // If status is 'resolved' or 'rejected', track who resolved it.
      if (status === 'resolved' || status === 'rejected') {
        updatePayload.resolvedBy = auth.id;
        updatePayload.resolvedAt = new Date();
      } else if (reopening && isSuperAdmin) {
        updatePayload.resolvedBy = null;
        updatePayload.resolvedAt = null;
      }

      const updated: any = await Report.findByIdAndUpdate(
        id,
        { $set: updatePayload },
        { new: true, runValidators: true }
      )
        .select('-__v')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (!updated) {
        return res.status(404).json({ 
          success: false, 
          message: 'Report not found',
          code: 'NOT_FOUND',
          requestId 
        });
      }

      // Audit log (async - non-blocking)
      SecurityEvent.create({
        eventType: 'admin.report.updated',
        userId: auth.id,
        metadata: {
          reportId: id,
          newStatus: status,
          actionTaken: actionTaken || 'none',
        },
        ipAddress: ip,
        userAgent: ua,
        severity: 'medium',
      }).catch((err) => console.error('Audit failed:', err));

      return res.status(200).json({
        success: true,
        message: 'Report updated successfully',
        report: {
          _id: String(updated._id),
          status: updated.status,
          resolutionNotes: updated.resolutionNotes,
          actionTaken: updated.actionTaken,
          resolvedBy: updated.resolvedBy ? String(updated.resolvedBy) : null,
          resolvedAt: updated.resolvedAt,
          updatedAt: updated.updatedAt,
        },
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ METHOD NOT ALLOWED
    // ═══════════════════════════════════════════════════════════════

    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed',
      requestId 
    });

  } catch (error: any) {
    console.error('Admin report error:', { requestId, error: error?.message });

    if (error?.statusCode && error?.code) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
        requestId,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      requestId,
    });
  }
}