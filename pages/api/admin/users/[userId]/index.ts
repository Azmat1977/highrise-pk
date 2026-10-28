// pages/api/admin/users/[userId]/index.ts
// Admin User Detail + Update API — V4.1 Compliant
// GET    — full user details + risk score + audit trail + statistics stub
// PATCH  — role/status/forceLogout/unlock/verification changes
// Routes: user/agent/developer/admin only (V4.1 Option A)

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { logUserAction } from '@/lib/logAdminAction';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TIME_MS = 5000;
const VALID_ROLES = ['user', 'agent', 'developer', 'admin'] as const;
const VALID_STATUSES = ['active', 'pending', 'suspended', 'banned'] as const;

const EXCLUDED_FIELDS = [
  '-password',
  '-resetToken',
  '-resetTokenExpiry',
  '-cnic',
  '-cnicEnc',
  '-cnicHash',
  '-security.passwordHistory',
  '-security.resetCodeHash',
  '-twoFactorAuth.secret',
  '-twoFactorAuth.backupCodes',
  '-securityQuestions.answerHash',
].join(' ');

// ─── Zod ──────────────────────────────────────────────────────────────────────

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

const UpdateUserSchema = z.object({
  role:           z.enum(VALID_ROLES).optional(),
  status:         z.enum(VALID_STATUSES).optional(),
  statusReason:   z.string().trim().min(5).max(500).optional(),
  isVerified:     z.boolean().optional(),
  forceLogout:    z.boolean().optional(),
  unlockAccount:  z.boolean().optional(),
}).refine(
  (d) =>
    d.role !== undefined ||
    d.status !== undefined ||
    d.isVerified !== undefined ||
    d.forceLogout === true ||
    d.unlockAccount === true,
  { message: 'At least one field must be provided for update' }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserFullDoc {
  _id:               mongoose.Types.ObjectId;
  name?:             string;
  displayName?:      string;
  email?:            string;
  phone?:            string;
  whatsappNumber?:   string;
  role?:             string;
  status?:           string;
  statusReason?:     string;
  statusChangedAt?:  Date;
  accountType?:      string;
  profession?:       string;
  companyName?:      string;
  city?:             string;
  country?:          string;
  about?:            string;
  licenseNumber?:    string;
  ntnNumber?:        string;
  officeAddress?:    string;
  homeAddress?:      string;
  cnicName?:         string;
  cnicStatus?:       string;
  cnicLockedAt?:     Date;
  cnicFrontUrl?:     string;
  cnicBackUrl?:      string;
  licenseFileUrl?:   string;
  companyProofUrl?:  string;
  ntnCertUrl?:       string;
  profilePictureUrl?: string;
  isVerified?:       boolean;
  isDeleted?:        boolean;
  deletedAt?:        Date;
  lastLoginAt?:      Date;
  tokenVersion?:     number;
  createdAt?:        Date;
  updatedAt?:        Date;
  security?: {
    failedLoginAttempts?: number;
    accountLockedUntil?:  Date;
    totalSuccessfulLogins?: number;
    lastSuccessfulLoginAt?: Date;
  };
}

interface RiskCalcInput {
  status?: string;
  createdAt?: Date;
  isVerified?: boolean;
  security?: {
    failedLoginAttempts?: number;
  };
}

interface SecurityEventDoc {
  _id?:       unknown;
  type?:      string;
  ip?:        string;
  severity?:  string;
  metadata?:  Record<string, unknown>;
  createdAt?: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip || '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

function calculateRiskScore(
  user: RiskCalcInput,
  securityEvents: SecurityEventDoc[]
): { score: number; level: 'low' | 'medium' | 'high' | 'critical' } {
  let score = 0;

  if (user.status === 'banned')    score += 50;
  if (user.status === 'suspended') score += 30;
  if (user.status === 'pending')   score += 10;

  const failedAttempts = user.security?.failedLoginAttempts ?? 0;
  if (failedAttempts > 5)      score += 25;
  else if (failedAttempts > 3) score += 15;
  else if (failedAttempts > 0) score += 5;

  const criticalEvents = securityEvents.filter((e) => e.severity === 'critical').length;
  const highEvents     = securityEvents.filter((e) => e.severity === 'high').length;
  score += criticalEvents * 20;
  score += highEvents * 10;

  if (user.createdAt) {
    const ageInDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (ageInDays < 1)       score += 20;
    else if (ageInDays < 7)  score += 10;
    else if (ageInDays < 30) score += 5;
  }

  if (!user.isVerified) score += 15;

  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 80)      level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';
  else                  level = 'low';

  return { score: Math.min(100, score), level };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 1000);

  // Validate userId
  const idResult = ObjectIdSchema.safeParse(req.query.userId);
  if (!idResult.success) {
    res.status(400).json({ success: false, message: 'Invalid user ID format', code: 'INVALID_ID', requestId });
    return;
  }
  const userId = idResult.data;

  try {
    // Rate limit
    const rl = await rateLimitAdmin(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
      res.status(429).json({ success: false, message: 'Too many requests', code: 'RATE_LIMITED', requestId });
      return;
    }

    // Admin auth
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    await dbConnect();

    // ─── GET: Fetch user details ─────────────────────────────────────────────
    if (req.method === 'GET') {
      const userRaw = await User.findById(userId)
        .select(EXCLUDED_FIELDS)
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (!userRaw) {
        res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND', requestId });
        return;
      }

      const user = userRaw as unknown as UserFullDoc;

      // Recent security events (last 20)
      const eventsRaw = await SecurityEvent.find({
        $or: [
          { userId: new mongoose.Types.ObjectId(userId) },
          { 'metadata.targetUserId': userId },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      const events = eventsRaw as unknown as SecurityEventDoc[];

      // Account age in days
      const accountAgeInDays = user.createdAt
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Risk score
      const { score: riskScore, level: riskLevel } = calculateRiskScore(user, events);

      // Lock status
      const isLocked = Boolean(
        user.security?.accountLockedUntil &&
        new Date(user.security.accountLockedUntil).getTime() > Date.now()
      );

      res.status(200).json({
        success: true,
        user: {
          ...user,
          _id: String(user._id),
          createdAt:       user.createdAt?.toISOString()       ?? null,
          updatedAt:       user.updatedAt?.toISOString()       ?? null,
          lastLoginAt:     user.lastLoginAt?.toISOString()     ?? null,
          statusChangedAt: user.statusChangedAt?.toISOString() ?? null,
          deletedAt:       user.deletedAt?.toISOString()       ?? null,
          cnicLockedAt:    user.cnicLockedAt?.toISOString()    ?? null,
        },
        statistics: {
          // TODO: Wire to Property API when Section 4 is built
          properties: {
            total:               0,
            active:              0,
            verified:            0,
            pendingVerification: 0,
            note:                'Property statistics available in Section 4',
          },
          account: {
            ageInDays:           accountAgeInDays,
            lastLogin:           user.lastLoginAt?.toISOString() ?? null,
            failedLoginAttempts: user.security?.failedLoginAttempts ?? 0,
            totalSuccessfulLogins: user.security?.totalSuccessfulLogins ?? 0,
            tokenVersion:        user.tokenVersion ?? 0,
            isLocked,
          },
        },
        security: {
          riskScore,
          riskLevel,
          status:     user.status     ?? 'active',
          isVerified: Boolean(user.isVerified),
          isDeleted:  Boolean(user.isDeleted),
          isLocked,
          recentEvents: events.slice(0, 20).map((e) => ({
            type:      e.type ?? 'unknown',
            severity:  e.severity ?? 'low',
            createdAt: e.createdAt?.toISOString() ?? '',
            metadata:  e.metadata ?? {},
          })),
        },
        requestId,
      });
      return;
    }

    // ─── PATCH: Update user ──────────────────────────────────────────────────
    if (req.method === 'PATCH' || req.method === 'PUT') {
      // Prevent self-modification
      if (userId === admin.id) {
        res.status(400).json({
          success: false,
          message: 'Cannot modify your own account through this endpoint',
          code:    'SELF_MODIFICATION_BLOCKED',
          requestId,
        });
        return;
      }

      const parsed = UpdateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid request body',
          code:    'VALIDATION_ERROR',
          errors:  parsed.error.flatten().fieldErrors,
          requestId,
        });
        return;
      }

      const { role, status, statusReason, isVerified, forceLogout, unlockAccount } = parsed.data;

      const targetUser = await User.findById(userId).maxTimeMS(MAX_TIME_MS);
      if (!targetUser) {
        res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND', requestId });
        return;
      }

      // Track changes for audit
      const changesBefore: Record<string, unknown> = {};
      const changesAfter:  Record<string, unknown> = {};

      // Role change
      if (role && role !== targetUser.role) {
        changesBefore.role = targetUser.role;
        changesAfter.role  = role;
        targetUser.role    = role;
        // Always bump tokenVersion on role change
        targetUser.tokenVersion = (targetUser.tokenVersion ?? 0) + 1;
      }

      // Status change
      if (status && status !== targetUser.status) {
        changesBefore.status = targetUser.status;
        changesAfter.status  = status;
        targetUser.status    = status;
        targetUser.statusChangedAt = new Date();

        if ((status === 'suspended' || status === 'banned') && statusReason) {
          targetUser.statusReason = statusReason;
          changesAfter.statusReason = statusReason;
        }
        if (status === 'active') {
          targetUser.statusReason = undefined;
        }

        // Bump tokenVersion on suspend/ban to force logout
        if (status === 'suspended' || status === 'banned') {
          targetUser.tokenVersion = (targetUser.tokenVersion ?? 0) + 1;
        }
      }

      // Verification flag
      if (typeof isVerified === 'boolean' && isVerified !== targetUser.isVerified) {
        changesBefore.isVerified = targetUser.isVerified;
        changesAfter.isVerified  = isVerified;
        targetUser.isVerified    = isVerified;
      }

      // Force logout
      if (forceLogout === true) {
        targetUser.tokenVersion = (targetUser.tokenVersion ?? 0) + 1;
        changesAfter.forceLogout = true;
      }

      // Unlock account
      if (unlockAccount === true) {
        // security subdocument is always present after pre("save") initialisation.
        // Write directly via findByIdAndUpdate to avoid Mongoose cast issues
        // when the subdocument is undefined on a lean/partial fetch.
        await User.findByIdAndUpdate(targetUser._id, {
          $set: {
            "security.failedLoginAttempts": 0,
            "security.accountLockedUntil": null,
            "security.accountLockedAt": null,
            "security.lockReason": null,
          },
        });
        changesAfter.unlockAccount = true;
      }

      await targetUser.save();

      // Audit log — one entry per change type
      // The AdminAction enum has granular actions, so we log each change separately
      const targetLabel = targetUser.name ?? targetUser.email ?? userId;
      const adminEmail = admin.email ?? '';
      const adminName = admin.name ?? admin.email ?? 'admin';

      // Role change
      if (changesBefore.role !== undefined && changesAfter.role !== undefined) {
        void logUserAction({
          action:        'user_role_changed',
          adminId:       admin.id,
          adminEmail,
          adminName,
          entityId:      userId,
          entityLabel:   targetLabel,
          previousValue: String(changesBefore.role).slice(0, 500),
          newValue:      String(changesAfter.role).slice(0, 500),
          ip,
          userAgent:     ua,
          requestId,
          meta: {
            previousValue: changesBefore.role,
            newValue:      changesAfter.role,
          },
        });
      }

      // Status change → maps to specific action
      if (changesBefore.status !== undefined && changesAfter.status !== undefined) {
        const newStatus = String(changesAfter.status);
        let statusAction: 'user_suspended' | 'user_activated' | 'user_deleted' | null = null;

        if (newStatus === 'suspended' || newStatus === 'banned') {
          statusAction = 'user_suspended';
        } else if (newStatus === 'active') {
          statusAction = 'user_activated';
        }

        if (statusAction) {
          void logUserAction({
            action:        statusAction,
            adminId:       admin.id,
            adminEmail,
            adminName,
            entityId:      userId,
            entityLabel:   targetLabel,
            previousValue: String(changesBefore.status).slice(0, 500),
            newValue:      newStatus.slice(0, 500),
            reason:        typeof changesAfter.statusReason === 'string'
              ? changesAfter.statusReason
              : undefined,
            ip,
            userAgent:     ua,
            requestId,
            meta: {
              previousValue: changesBefore.status,
              newValue:      changesAfter.status,
              statusReason:  changesAfter.statusReason,
            },
          });
        }
      }

      // Force logout
      if (changesAfter.forceLogout === true) {
        void logUserAction({
          action:      'user_force_logout',
          adminId:     admin.id,
          adminEmail,
          adminName,
          entityId:    userId,
          entityLabel: targetLabel,
          newValue:    'tokenVersion bumped',
          ip,
          userAgent:   ua,
          requestId,
          meta: {
            newTokenVersion: targetUser.tokenVersion,
          },
        });
      }

      // Unlock account — no specific action, log as activated (closest match)
      if (changesAfter.unlockAccount === true) {
        void logUserAction({
          action:      'user_activated',
          adminId:     admin.id,
          adminEmail,
          adminName,
          entityId:    userId,
          entityLabel: targetLabel,
          newValue:    'account unlocked',
          ip,
          userAgent:   ua,
          requestId,
          meta: {
            action: 'unlock_account',
            clearedFailedAttempts: true,
          },
        });
      }

      // Fetch updated user (clean)
      const updatedRaw = await User.findById(userId)
        .select(EXCLUDED_FIELDS)
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      const updated = updatedRaw as unknown as UserFullDoc;

      let message = 'User updated successfully';
      if (status === 'active')    message = 'User activated';
      if (status === 'suspended') message = 'User suspended';
      if (status === 'banned')    message = 'User banned';
      if (role)                   message = `Role changed to ${role}`;
      if (forceLogout)            message = 'User forcibly logged out from all sessions';
      if (unlockAccount)          message = 'Account unlocked';

      res.status(200).json({
        success: true,
        message,
        user: {
          ...updated,
          _id: String(updated._id),
          createdAt:       updated.createdAt?.toISOString()       ?? null,
          updatedAt:       updated.updatedAt?.toISOString()       ?? null,
          lastLoginAt:     updated.lastLoginAt?.toISOString()     ?? null,
          statusChangedAt: updated.statusChangedAt?.toISOString() ?? null,
        },
        requestId,
      });
      return;
    }

    // Method not allowed
    res.setHeader('Allow', ['GET', 'PATCH', 'PUT']);
    res.status(405).json({ success: false, message: 'Method not allowed', requestId });
  } catch (err: unknown) {
    void logSecurityEvent({
      type: 'admin_action',
      ip,
      metadata: {
        action:    'admin_user_detail_error',
        endpoint:  `/api/admin/users/${userId}`,
        method:    req.method,
        error:     err instanceof Error ? err.message : 'unknown',
        requestId,
      },
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code:    'SERVER_ERROR',
      requestId,
    });
  }
}