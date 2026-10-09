// pages/api/developer/onboarding.ts
// Highrise.pk -- Developer Onboarding API Route (4-Stage Engine)
// GET: Resume draft or check verification status
// POST: Save progress draft or submit application for admin verification
// Rule Set B Hardened: Auth guard -> Rate limit -> Zod validate -> AES-256 encryption -> Audit log

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import DeveloperProfile from '@/models/DeveloperProfile';
import User from '@/models/User';
import {
  developerOnboardingSubmitSchema,
  developerOnboardingDraftSchema,
} from '@/lib/validations/developerOnboarding';

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  errors?: Record<string, string[]>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // 1. Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');

  // 2. Authentication Guard
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // 3. Rate Limiting
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    res.status(429).json({
      success: false,
      message: `Too many requests. Please retry in ${rl.retryAfter}s.`,
    });
    return;
  }

  await dbConnect();

  // ============================================================================
  // GET: Fetch existing application / profile draft
  // ============================================================================
  if (req.method === 'GET') {
    try {
      const profile = await DeveloperProfile.findOne({
        user: auth.id,
        isDeleted: { $ne: true },
      })
        .select('+phoneEncrypted +ntnEncrypted +secpEncrypted +authorizedPersonCnicEncrypted +authorizedPersonPhoneEncrypted +adminNotes')
        .lean();

      if (!profile) {
        res.status(200).json({
          success: true,
          data: {
            status: 'unstarted',
            onboardingStatus: auth.onboardingStatus,
            profile: null,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          status: profile.status,
          onboardingStatus: auth.onboardingStatus,
          isVerified: profile.isVerified,
          kycStatus: profile.kycStatus,
          rejectionReason: profile.rejectionReason,
          infoRequiredReason: profile.infoRequiredReason,
          profile: {
            ...profile,
            // Expose masked versions
            ntnNumber: profile.ntnNumberMasked || '',
            secpNumber: profile.secpNumberMasked || '',
            authorizedPersonCnic: profile.authorizedPersonCnicMasked || '',
          },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch application';
      res.status(500).json({ success: false, message: msg });
    }
    return;
  }

  // ============================================================================
  // POST: Save draft or submit application
  // ============================================================================
  if (req.method === 'POST') {
    try {
      const { action, ...payload } = req.body as { action?: 'draft' | 'submit'; [key: string]: unknown };
      const isSubmit = action === 'submit';

      // Check existing profile lock status
      const existing = await DeveloperProfile.findOne({
        user: auth.id,
        isDeleted: { $ne: true },
      });

      if (existing && (existing.status === 'approved' || (existing.status === 'pending' && isSubmit))) {
        res.status(403).json({
          success: false,
          message: 'Your application is already submitted or approved. Contact support for modifications.',
        });
        return;
      }

      // 4. Validate input via Zod
      if (isSubmit) {
        const parsed = developerOnboardingSubmitSchema.safeParse(payload);
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            message: 'Validation failed. Please correct all highlighted fields.',
            errors: parsed.error.flatten().fieldErrors,
          });
          return;
        }
      } else {
        const parsedDraft = developerOnboardingDraftSchema.safeParse(payload);
        if (!parsedDraft.success) {
          res.status(400).json({
            success: false,
            message: 'Draft validation failed.',
            errors: parsedDraft.error.flatten().fieldErrors,
          });
          return;
        }
      }

      const data = payload as Record<string, any>;

      // Build update document with encryption carriers
      const profileDoc = existing || new DeveloperProfile({ user: auth.id });

      // Core Company Info
      if (data.developerType) profileDoc.developerType = data.developerType;
      if (data.companyName) profileDoc.companyName = data.companyName;
      if (data.companyType) profileDoc.companyType = data.companyType;
      if (data.establishedYear) profileDoc.establishedYear = Number(data.establishedYear);
      if (data.ceoName !== undefined) profileDoc.ceoName = data.ceoName;
      if (data.tagline !== undefined) profileDoc.tagline = data.tagline;
      if (data.description !== undefined) profileDoc.description = data.description;
      if (data.email) profileDoc.email = data.email.toLowerCase().trim();
      if (data.website !== undefined) profileDoc.website = data.website;
      if (data.city) profileDoc.city = data.city;
      if (data.officeAddress !== undefined) profileDoc.officeAddress = data.officeAddress;
      if (data.operatingCities) profileDoc.operatingCities = data.operatingCities;

      // Media Assets
      if (data.logo) profileDoc.logo = data.logo;
      if (data.coverImage) profileDoc.coverImage = data.coverImage;

      // Phone encryption carrier
      if (data.phone) profileDoc._rawPhone = data.phone;
      if (data.whatsapp) profileDoc._rawWhatsapp = data.whatsapp;

      // Stage 2: SECP & FBR Tax KYC
      if (data.ntnNumber) profileDoc.ntnNumberMasked = data.ntnNumber;
      if (data.secpNumber) profileDoc.secpNumberMasked = data.secpNumber;
      if (data.strnNumber) profileDoc.strnMasked = data.strnNumber;

      if (data.legalDocs) {
        profileDoc.legalDocs = {
          ...profileDoc.legalDocs,
          ...data.legalDocs,
        };
      }

      // Stage 3: Representative Details
      if (data.authorizedPersonName) profileDoc.authorizedPersonName = data.authorizedPersonName;
      if (data.authorizedPersonDesignation) profileDoc.authorizedPersonDesignation = data.authorizedPersonDesignation;
      if (data.authorizedPersonEmail) profileDoc.authorizedPersonEmail = data.authorizedPersonEmail.toLowerCase().trim();
      if (data.authorizedPersonCnic) profileDoc._rawAuthorizedPersonCnic = data.authorizedPersonCnic;
      if (data.authorizedPersonPhone) profileDoc._rawAuthorizedPersonPhone = data.authorizedPersonPhone;

      // Stage 4: Projects & Portfolio
      if (data.completedProjects) {
        profileDoc.portfolio = {
          ...profileDoc.portfolio,
          completedProjects: data.completedProjects,
          totalUnitsDelivered: data.totalUnitsDelivered || 0,
          totalLandArea: data.totalLandArea || 0,
        };
      }

      // Submission status transitions
      if (isSubmit) {
        profileDoc.status = 'pending';
        profileDoc.kycStatus = 'pending';
        profileDoc.verificationLevel = 'docs_pending';
        profileDoc.kycLockedAt = new Date();

        if (!profileDoc.verificationHistory) profileDoc.verificationHistory = [];
        profileDoc.verificationHistory.push({
          status: 'submitted',
          at: new Date(),
          notes: 'Developer completed and submitted 4-stage onboarding form.',
        });
      } else {
        if (!existing) profileDoc.status = 'draft';
      }

      await profileDoc.save();

      // Synchronize User Onboarding State
      await User.findByIdAndUpdate(auth.id, {
        $set: {
          onboardingStatus: isSubmit ? 'pending' : 'none',
          onboardingRole: 'developer',
        },
      });

      // Security Logging
      if (isSubmit) {
        await logSecurityEvent({
          userId: auth.id,
          email: auth.email,
          role: auth.role,
          type: 'kyc_submitted',
          ip: req.socket?.remoteAddress || 'unknown',
          metadata: {
            action: 'developer_onboarding_submitted',
            profileId: profileDoc._id.toString(),
            companyName: profileDoc.companyName,
          },
        });
      }

      res.status(200).json({
        success: true,
        message: isSubmit
          ? 'Application submitted successfully! Our compliance team will review your credentials.'
          : 'Draft progress saved successfully.',
        data: {
          profileId: profileDoc._id,
          status: profileDoc.status,
          slug: profileDoc.slug,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save application';
      res.status(500).json({ success: false, message: msg });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
}
