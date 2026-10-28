// pages/api/admin/applications/[id].ts
// 🔒 ADMIN APPLICATION ACTIONS API - HIGHRISE.PK
// V6.0.0 — Society Tier Added
// GET detail | PATCH approve/reject/request_info
// Handles agent + developer + society applications
// ═══════════════════════════════════════════════════════════════

import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Types, isValidObjectId } from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { sendEmail } from '@/lib/email';
import {
  agentOnboardingApprovedTemplate,
  agentOnboardingRejectedTemplate,
  agentOnboardingInfoRequiredTemplate,
  developerOnboardingApprovedTemplate,
  developerOnboardingRejectedTemplate,
  developerOnboardingInfoRequiredTemplate,
  societyOnboardingApprovedTemplate,
  societyOnboardingRejectedTemplate,
  societyOnboardingInfoRequiredTemplate,
} from '@/lib/email-templates';

import User from '@/models/User';
import AgentProfile from '@/models/AgentProfile';
import DeveloperProfile from '@/models/DeveloperProfile';
import SocietyProfile from '@/models/SocietyProfile';

// ─── Types ─────────────────────────────────────────────────────

type AppType = 'agent' | 'developer' | 'society';
type AdminAction = 'approve' | 'reject' | 'request_info';

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  requestId: string;
}

interface QueryShape {
  id?: string | string[];
  type?: string | string[];
}

// ─── Validation schemas ────────────────────────────────────────

const ActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_info']),
  reason: z.string().trim().max(1000).optional(),
});

const TypeSchema = z.enum(['agent', 'developer', 'society']);

// ─── Security headers ──────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

// ─── Helpers ───────────────────────────────────────────────────

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

function parseQuery(req: NextApiRequest): {
  id: string | null;
  type: AppType | null;
} {
  const q = req.query as QueryShape;
  const rawId = Array.isArray(q.id) ? q.id[0] : q.id;
  const rawType = Array.isArray(q.type) ? q.type[0] : q.type;

  const id = typeof rawId === 'string' && isValidObjectId(rawId) ? rawId : null;
  const typeResult = TypeSchema.safeParse(rawType);
  const type = typeResult.success ? typeResult.data : null;

  return { id, type };
}

// ─── Handler ───────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  // ── Rate limit ─────────────────────────────────────────────
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

  // ── Auth ───────────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── Parse + validate query ─────────────────────────────────
  const { id, type } = parseQuery(req);

  if (!id) {
    res.status(400).json({
      success: false,
      message: 'Invalid application ID',
      requestId,
    });
    return;
  }

  if (!type) {
    res.status(400).json({
      success: false,
      message: 'Application type required (?type=agent|developer|society)',
      requestId,
    });
    return;
  }

  // ── Route by method ────────────────────────────────────────
  try {
    await dbConnect();

    if (req.method === 'GET') {
      return await handleGet(req, res, auth.id, id, type, requestId);
    }

    if (req.method === 'PATCH') {
      return await handlePatch(req, res, auth.id, id, type, requestId);
    }

    res.setHeader('Allow', 'GET, PATCH');
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';

    await logSecurityEvent({
      type: 'system_error',
      severity: 'high',
      userId: auth.id,
      req,
      metadata: {
        endpoint: '/api/admin/applications/[id]',
        method: req.method,
        appId: id,
        appType: type,
        errorMessage: message,
      },
    }).catch(() => {
      /* never throw */
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      requestId,
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// GET — Application Detail
// ═══════════════════════════════════════════════════════════════

async function handleGet(
  _req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  adminId: string,
  id: string,
  type: AppType,
  requestId: string
): Promise<void> {
  // ── AGENT ──────────────────────────────────────────────────
  if (type === 'agent') {
    const profile = await AgentProfile.findById(id)
      .select(
        '+cnicEncrypted +licenseEncrypted +ntnEncrypted +secpEncrypted +phoneEncrypted +whatsappEncrypted'
      )
      .populate(
        'user',
        'email name displayName onboardingStatus onboardingRole kycVerified role'
      );

    if (!profile || profile.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Application not found',
        requestId,
      });
      return;
    }

    const decrypted = {
      cnic: profile.getCNIC?.() ?? null,
      cnicMasked: profile.getMaskedCNIC?.() ?? '—',
      license: profile.getLicense?.() ?? null,
      ntn: profile.getNTN?.() ?? null,
      secp: profile.getSECP?.() ?? null,
      phone: profile.getPhone?.() ?? null,
      phoneMasked: profile.getMaskedPhone?.() ?? '—',
    };

    const profileObj = profile.toJSON();

    res.status(200).json({
      success: true,
      data: { type: 'agent', profile: profileObj, decrypted },
      requestId,
    });
    return;
  }

  // ── DEVELOPER ──────────────────────────────────────────────
  if (type === 'developer') {
    const profile = await DeveloperProfile.findById(id)
      .select(
        '+ntnEncrypted +secpEncrypted +authorizedPersonCnicEncrypted +phoneEncrypted +whatsappEncrypted +authorizedPersonPhoneEncrypted +adminNotes'
      )
      .populate(
        'user',
        'email name displayName onboardingStatus onboardingRole kycVerified role'
      );

    if (!profile || profile.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Application not found',
        requestId,
      });
      return;
    }

    const decrypted = {
      ntn: profile.getNTN?.() ?? null,
      secp: profile.getSECP?.() ?? null,
      authorizedPersonCnic: profile.getAuthorizedPersonCNIC?.() ?? null,
      authorizedPersonCnicMasked:
        profile.getMaskedAuthorizedPersonCNIC?.() ?? '—',
      phone: profile.getPhone?.() ?? null,
      phoneMasked: profile.getMaskedPhone?.() ?? '—',
      authorizedPersonPhone: profile.getAuthorizedPersonPhone?.() ?? null,
    };

    const profileObj = profile.toJSON();

    res.status(200).json({
      success: true,
      data: { type: 'developer', profile: profileObj, decrypted },
      requestId,
    });
    return;
  }

  // ── SOCIETY ────────────────────────────────────────────────
  const profile = await SocietyProfile.findById(id)
    .select(
      '+authorizedPersonCnicEncrypted +authorizedPersonCnicHash +authorizedPersonPhoneEncrypted +bankIban'
    )
    .populate(
      'userId',
      'email name displayName onboardingStatus onboardingRole kycVerified role'
    );

  if (!profile) {
    res.status(404).json({
      success: false,
      message: 'Application not found',
      requestId,
    });
    return;
  }

  let decryptedCnic: string | null = null;
  let maskedCnic = '—';

  if (profile.authorizedPersonCnicEncrypted) {
    try {
      const { kycDecrypt, maskCnic } = await import('@/lib/kycCrypto');
      decryptedCnic = kycDecrypt(profile.authorizedPersonCnicEncrypted, {
        adminId,
        reason: 'admin_review_society_application',
      });
      maskedCnic = maskCnic(decryptedCnic);
    } catch {
      decryptedCnic = null;
      maskedCnic = '—';
    }
  }

  const profileObj = profile.toJSON();

  res.status(200).json({
    success: true,
    data: {
      type: 'society',
      profile: profileObj,
      decrypted: {
        authorizedPersonCnic: decryptedCnic,
        authorizedPersonCnicMasked: maskedCnic,
      },
    },
    requestId,
  });
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Profile shape that has the addAuditEntry method.
 * Used to narrow union types when calling audit helper.
 */
interface ProfileWithAudit {
  addAuditEntry: (
    action: string,
    performedBy: Types.ObjectId,
    payload: Record<string, unknown>,
    ip: string
  ) => Promise<unknown>;
}

/**
 * Type guard — returns true if profile has addAuditEntry method.
 * Society profiles don't have this method (they use auditTrail.push directly).
 */
function hasAddAuditEntry(profile: unknown): profile is ProfileWithAudit {
  return (
    profile !== null &&
    typeof profile === 'object' &&
    'addAuditEntry' in profile &&
    typeof (profile as { addAuditEntry?: unknown }).addAuditEntry === 'function'
  );
}

// ═══════════════════════════════════════════════════════════════
// PATCH — Admin Action (approve / reject / request_info)
// ═══════════════════════════════════════════════════════════════

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  adminId: string,
  id: string,
  type: AppType,
  requestId: string
): Promise<void> {
  // Validate body
  const parsed = ActionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid request body. Provide { action, reason? }',
      requestId,
    });
    return;
  }

  const { action, reason } = parsed.data;

  // Reason required for reject + request_info
  if ((action === 'reject' || action === 'request_info') && !reason) {
    res.status(400).json({
      success: false,
      message: `A reason is required when ${
        action === 'reject' ? 'rejecting' : 'requesting more information'
      }.`,
      requestId,
    });
    return;
  }

  const ip = getClientIp(req);
  const adminObjectId = new Types.ObjectId(adminId);

  // ── Fetch profile (NOT lean — need .save()) ───────────────
  let profile:
    | InstanceType<typeof AgentProfile>
    | InstanceType<typeof DeveloperProfile>
    | InstanceType<typeof SocietyProfile>
    | null = null;

  if (type === 'agent') {
    profile = await AgentProfile.findById(id);
    if (!profile || (profile as { isDeleted?: boolean }).isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Application not found',
        requestId,
      });
      return;
    }
  } else if (type === 'developer') {
    profile = await DeveloperProfile.findById(id);
    if (!profile || (profile as { isDeleted?: boolean }).isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Application not found',
        requestId,
      });
      return;
    }
  } else {
    profile = await SocietyProfile.findById(id);
    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Application not found',
        requestId,
      });
      return;
    }
  }

  // ── Validate state transitions ─────────────────────────────
  const currentStatus = profile.status;
  if (currentStatus === 'approved' && action === 'approve') {
    res.status(409).json({
      success: false,
      message: 'Application is already approved.',
      requestId,
    });
    return;
  }
  if (currentStatus === 'suspended') {
    res.status(409).json({
      success: false,
      message:
        'Suspended applications cannot be modified through this endpoint.',
      requestId,
    });
    return;
  }

  // ── Resolve userId (society uses userId, agent/dev use user) ──
  const profileUserId =
    type === 'society'
      ? (profile as InstanceType<typeof SocietyProfile>).userId
      : (profile as InstanceType<typeof AgentProfile>).user;

  // ── Fetch user (NOT lean — need .save()) ───────────────────
  const userDoc = await User.findById(profileUserId);
  if (!userDoc || userDoc.isDeleted) {
    res.status(404).json({
      success: false,
      message: 'Associated user not found',
      requestId,
    });
    return;
  }

  const now = new Date();

  // ═══════════════════════════════════════════════════════════
  // ACTION: APPROVE
  // ═══════════════════════════════════════════════════════════
  if (action === 'approve') {
    profile.status = 'approved';
    profile.rejectionReason = undefined;
    profile.infoRequiredReason = undefined;

    if (type === 'agent') {
      const ap = profile as InstanceType<typeof AgentProfile>;
      ap.verifiedAt = now;
      ap.verifiedBy = adminObjectId;
      if (ap.cnicHash && !ap.cnicVerified) ap.cnicVerified = true;
      if (ap.licenseHash && !ap.licenseVerified) ap.licenseVerified = true;
      if (ap.ntnHash && !ap.ntnVerified) ap.ntnVerified = true;
    } else if (type === 'developer') {
      const dp = profile as InstanceType<typeof DeveloperProfile>;
      dp.verifiedAt = now;
      dp.verifiedBy = adminObjectId;
      dp.kycStatus = 'verified';
      dp.isVerified = true;
      dp.lastVerifiedAt = now;
    } else {
      const sp = profile as InstanceType<typeof SocietyProfile>;
      sp.cnicVerified = true;
      sp.nocVerified = true;
      sp.kycStatus = 'verified';
      sp.trustScore = 70;
      sp.verifiedAt = now;
      sp.reviewedBy = adminObjectId;
      sp.reviewedAt = now;
      sp.auditTrail.push({
        action: 'approved',
        performedBy: adminObjectId,
        performedAt: now,
        note: `Approved by admin ${adminId}`,
      });
    }

    // Audit entry for agent/developer (method-based)
    if (type !== 'society' && hasAddAuditEntry(profile)) {
      await profile.addAuditEntry(
        `admin_approved_${type}_application`,
        adminObjectId,
        { previousStatus: currentStatus, newStatus: 'approved' },
        ip
      );
    }

    // Update user
    userDoc.role = type;
    userDoc.onboardingStatus = 'approved';
    userDoc.onboardingReviewedAt = now;
    userDoc.onboardingReviewedBy = adminObjectId;
    userDoc.onboardingRejectionReason = undefined;
    userDoc.kycVerified = true;
    userDoc.tokenVersion = (userDoc.tokenVersion ?? 0) + 1;

    await Promise.all([profile.save(), userDoc.save()]);

    await logSecurityEvent({
      type:
        type === 'agent'
          ? 'agent_profile_created'
          : type === 'developer'
          ? 'developer_profile_created'
          : 'admin_action',
      severity: 'low',
      userId: String(userDoc._id),
      req,
      metadata: {
        action: 'approved',
        appId: id,
        appType: type,
        adminId,
        roleAssigned: type,
      },
    });

    sendApprovalEmail(type, userDoc, profile).catch(() => {
      /* silent */
    });

    const label =
      type === 'agent'
        ? 'Agent'
        : type === 'developer'
        ? 'Developer'
        : 'Society';

    res.status(200).json({
      success: true,
      message: `${label} application approved successfully.`,
      data: { id, newStatus: 'approved', userRole: type },
      requestId,
    });
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // ACTION: REJECT
  // ═══════════════════════════════════════════════════════════
  if (action === 'reject') {
    profile.status = 'rejected';
    profile.rejectionReason = reason;
    profile.infoRequiredReason = undefined;

    if (type === 'developer') {
      const dp = profile as InstanceType<typeof DeveloperProfile>;
      dp.kycStatus = 'rejected';
    }

    if (type === 'society') {
      const sp = profile as InstanceType<typeof SocietyProfile>;
      sp.kycStatus = 'failed';
      sp.reviewedBy = adminObjectId;
      sp.reviewedAt = now;
      sp.auditTrail.push({
        action: 'rejected',
        performedBy: adminObjectId,
        performedAt: now,
        note: reason ?? 'Rejected by admin',
      });
    }

    if (type !== 'society' && hasAddAuditEntry(profile)) {
      await profile.addAuditEntry(
        `admin_rejected_${type}_application`,
        adminObjectId,
        { previousStatus: currentStatus, newStatus: 'rejected', reason },
        ip
      );
    }

    userDoc.onboardingStatus = 'rejected';
    userDoc.onboardingReviewedAt = now;
    userDoc.onboardingReviewedBy = adminObjectId;
    userDoc.onboardingRejectionReason = reason;
    userDoc.tokenVersion = (userDoc.tokenVersion ?? 0) + 1;

    await Promise.all([profile.save(), userDoc.save()]);

    await logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'medium',
      userId: String(userDoc._id),
      req,
      metadata: {
        action: 'rejected',
        appId: id,
        appType: type,
        adminId,
        reason: reason ?? '',
      },
    });

    sendRejectionEmail(type, userDoc, profile, reason ?? '').catch(() => {
      /* silent */
    });

    const label =
      type === 'agent'
        ? 'Agent'
        : type === 'developer'
        ? 'Developer'
        : 'Society';

    res.status(200).json({
      success: true,
      message: `${label} application rejected.`,
      data: { id, newStatus: 'rejected', reason },
      requestId,
    });
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // ACTION: REQUEST INFO
  // ═══════════════════════════════════════════════════════════
  if (action === 'request_info') {
    profile.status = 'info_required';
    profile.infoRequiredReason = reason;
    profile.rejectionReason = undefined;

    if (type === 'society') {
      const sp = profile as InstanceType<typeof SocietyProfile>;
      sp.reviewedBy = adminObjectId;
      sp.reviewedAt = now;
      sp.auditTrail.push({
        action: 'info_required',
        performedBy: adminObjectId,
        performedAt: now,
        note: reason ?? 'Additional information requested',
      });
    }

    if (type !== 'society' && hasAddAuditEntry(profile)) {
      await profile.addAuditEntry(
        `admin_requested_info_${type}`,
        adminObjectId,
        { previousStatus: currentStatus, newStatus: 'info_required', reason },
        ip
      );
    }

    userDoc.onboardingStatus = 'info_required';
    userDoc.onboardingReviewedAt = now;
    userDoc.onboardingReviewedBy = adminObjectId;
    userDoc.onboardingRejectionReason = reason;
    userDoc.tokenVersion = (userDoc.tokenVersion ?? 0) + 1;

    await Promise.all([profile.save(), userDoc.save()]);

    await logSecurityEvent({
      type: 'admin_action',
      severity: 'low',
      userId: String(userDoc._id),
      req,
      metadata: {
        action: 'info_requested',
        appId: id,
        appType: type,
        adminId,
        reason: reason ?? '',
      },
    });

    sendInfoRequiredEmail(type, userDoc, profile, reason ?? '').catch(() => {
      /* silent */
    });

    res.status(200).json({
      success: true,
      message: 'Additional information requested from applicant.',
      data: { id, newStatus: 'info_required', reason },
      requestId,
    });
    return;
  }
}

// ═══════════════════════════════════════════════════════════════
// EMAIL HELPERS
// ═══════════════════════════════════════════════════════════════

interface UserDocLite {
  email: string;
  name?: string;
  displayName?: string;
}

interface ProfileDocLite {
  displayName?: string;
  companyName?: string;
  agencyName?: string;
  societyName?: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://highrise.pk';

async function sendApprovalEmail(
  type: AppType,
  user: UserDocLite,
  profile: ProfileDocLite
): Promise<void> {
  if (type === 'agent') {
    const tpl = agentOnboardingApprovedTemplate;
    await sendEmail({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html({
        agentName: user.displayName ?? user.name ?? 'Agent',
        agencyName: profile.agencyName ?? profile.displayName ?? '',
        dashboardUrl: `${SITE_URL}/agent/dashboard`,
      }),
      fromName: 'Highrise.pk Verification',
    });
    return;
  }

  if (type === 'developer') {
    const tpl = developerOnboardingApprovedTemplate;
    await sendEmail({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html({
        developerName: user.displayName ?? user.name ?? 'Developer',
        companyName: profile.companyName ?? '',
        dashboardUrl: `${SITE_URL}/developer/dashboard`,
      }),
      fromName: 'Highrise.pk Verification',
    });
    return;
  }

  // society
  const tpl = societyOnboardingApprovedTemplate;
  await sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html({
      toName: user.displayName ?? user.name ?? 'Representative',
      societyName: profile.societyName ?? '',
      dashboardUrl: `${SITE_URL}/society/dashboard`,
    }),
    fromName: 'Highrise.pk Compliance',
  });
}

async function sendRejectionEmail(
  type: AppType,
  user: UserDocLite,
  profile: ProfileDocLite,
  reason: string
): Promise<void> {
  if (type === 'agent') {
    const tpl = agentOnboardingRejectedTemplate;
    await sendEmail({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html({
        agentName: user.displayName ?? user.name ?? 'Agent',
        reason,
        supportUrl: `${SITE_URL}/contact`,
      }),
      fromName: 'Highrise.pk Verification',
    });
    return;
  }

  if (type === 'developer') {
    const tpl = developerOnboardingRejectedTemplate;
    await sendEmail({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html({
        developerName: user.displayName ?? user.name ?? 'Developer',
        companyName: profile.companyName ?? '',
        reason,
        supportUrl: `${SITE_URL}/contact`,
      }),
      fromName: 'Highrise.pk Verification',
    });
    return;
  }

  // society
  const tpl = societyOnboardingRejectedTemplate;
  await sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html({
      toName: user.displayName ?? user.name ?? 'Representative',
      societyName: profile.societyName ?? '',
      reason,
      supportUrl: `${SITE_URL}/contact`,
    }),
    fromName: 'Highrise.pk Compliance',
  });
}

async function sendInfoRequiredEmail(
  type: AppType,
  user: UserDocLite,
  profile: ProfileDocLite,
  reason: string
): Promise<void> {
  if (type === 'agent') {
    const tpl = agentOnboardingInfoRequiredTemplate;
    await sendEmail({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html({
        agentName: user.displayName ?? user.name ?? 'Agent',
        reason,
        dashboardUrl: `${SITE_URL}/dashboard`,
      }),
      fromName: 'Highrise.pk Verification',
    });
    return;
  }

  if (type === 'developer') {
    const tpl = developerOnboardingInfoRequiredTemplate;
    await sendEmail({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html({
        developerName: user.displayName ?? user.name ?? 'Developer',
        companyName: profile.companyName ?? '',
        reason,
        dashboardUrl: `${SITE_URL}/dashboard`,
      }),
      fromName: 'Highrise.pk Verification',
    });
    return;
  }

  // society
  const tpl = societyOnboardingInfoRequiredTemplate;
  await sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html({
      toName: user.displayName ?? user.name ?? 'Representative',
      societyName: profile.societyName ?? '',
      reason,
      dashboardUrl: `${SITE_URL}/dashboard`,
    }),
    fromName: 'Highrise.pk Compliance',
  });
}