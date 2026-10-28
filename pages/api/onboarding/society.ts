// pages/api/onboarding/society.ts
// Highrise.pk — Society Onboarding API
// Creates SocietyProfile + syncs User.onboardingStatus
// Mirrors developer.ts architecture exactly
// AES-256-GCM encryption | Zod v4 | requireAuth guard
// NO console.* | NO as any | NO axios | NO findByIdAndUpdate

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi, setRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { kycEncrypt, hashCnic } from '@/lib/kycCrypto';
import {
  sendSocietyConfirmationEmail,
  sendAdminSocietyAlertEmail,
} from '@/lib/email-templates';
import SocietyProfile from '@/models/SocietyProfile';
import User from '@/models/User';

// ─── Response shape ───────────────────────────────────────────────────────────

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  profileId?: string;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const PlotInventorySchema = z.object({
  size: z.enum([
    '3_marla', '4_marla', '5_marla', '6_marla', '7_marla',
    '8_marla', '10_marla', '12_marla', '1_kanal', '1_kanal_4_marla',
    '2_kanal', 'commercial', 'other',
  ]),
  totalPlots: z.number().int().min(0),
  availablePlots: z.number().int().min(0),
  pricePerMarla: z.number().min(0).optional(),
  pricePerSqFt: z.number().min(0).optional(),
});

const BlockSchema = z.object({
  name: z.string().trim().min(1, { message: 'Block name is required' }).max(100),
  totalPlots: z.number().int().min(0),
  availablePlots: z.number().int().min(0),
  plotSizes: z.array(
    z.enum([
      '3_marla', '4_marla', '5_marla', '6_marla', '7_marla',
      '8_marla', '10_marla', '12_marla', '1_kanal', '1_kanal_4_marla',
      '2_kanal', 'commercial', 'other',
    ])
  ).min(1, { message: 'At least one plot size is required' }),
  possessionStatus: z.enum(['announced', 'under_development', 'ready']),
  launchYear: z.number().int().min(1990).max(2100).optional(),
  completionYear: z.number().int().min(1990).max(2100).optional(),
});

const InstallmentPlanSchema = z.object({
  planName: z.string().trim().min(1, { message: 'Plan name is required' }).max(200),
  durationMonths: z.number().int().min(1).max(360),
  downPaymentPercent: z.number().min(0).max(100),
  monthlyInstallmentPercent: z.number().min(0).max(100).optional(),
  quarterlyInstallmentPercent: z.number().min(0).max(100).optional(),
  halfYearlyInstallmentPercent: z.number().min(0).max(100).optional(),
  balloonPaymentPercent: z.number().min(0).max(100).optional(),
  isInterestFree: z.boolean(),
  notes: z.string().trim().max(500).optional(),
});

const KycDocumentSchema = z.object({
  type: z.enum([
    'noc_certificate', 'layout_plan', 'master_plan',
    'secp_certificate', 'ntn_certificate', 'authority_approval',
    'land_acquisition', 'environmental_noc', 'other',
  ]),
  title: z.string().trim().min(1).max(200),
  url: z.string().url({ message: 'Invalid document URL' }),
});

// CNIC format: #####-#######-# (13 digits + 2 dashes = 15 chars)
const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
// Pakistan phone: 03XX-XXXXXXX or +923XXXXXXXXX
const phoneRegex = /^(\+92|0)3[0-9]{2}[-\s]?[0-9]{7}$/;
// IBAN: PK followed by 22 chars
const ibanRegex = /^PK\d{2}[A-Z]{4}\d{16}$/;

const SocietyOnboardingSchema = z.object({
  // ── Society identity ──────────────────────────────────────────────────────
  societyName: z
    .string()
    .trim()
    .min(3, { message: 'Society name must be at least 3 characters' })
    .max(200),
  registeredName: z
    .string()
    .trim()
    .min(3, { message: 'Registered legal name is required' })
    .max(200),
  city: z
    .string()
    .trim()
    .min(2, { message: 'City is required' })
    .max(100),
  areaName: z
    .string()
    .trim()
    .min(2, { message: 'Area / locality is required' })
    .max(200),
  fullAddress: z
    .string()
    .trim()
    .min(10, { message: 'Full address must be at least 10 characters' })
    .max(500),
  authority: z.enum(
    ['LDA', 'CDA', 'RDA', 'KDA', 'FDA', 'MDA', 'DHA', 'PHATA', 'Other'],
    { message: 'Please select a valid approving authority' }
  ),
  nocNumber: z
    .string()
    .trim()
    .min(3, { message: 'NOC number is required' })
    .max(100),
  nocIssuanceDate: z.string().optional(),
  nocExpiryDate: z.string().optional(),
  totalAreaAcres: z.number().min(0).optional(),
  launchYear: z.number().int().min(1950).max(2100).optional(),

  // ── Authorized person ─────────────────────────────────────────────────────
  authorizedPersonName: z
    .string()
    .trim()
    .min(3, { message: 'Authorized person name is required' })
    .max(200),
  authorizedPersonDesignation: z
    .string()
    .trim()
    .min(2, { message: 'Designation is required' })
    .max(100),
  authorizedPersonCnic: z
    .string()
    .trim()
    .regex(cnicRegex, { message: 'CNIC must be in format: #####-#######-#' }),
  authorizedPersonPhone: z
    .string()
    .trim()
    .regex(phoneRegex, { message: 'Enter a valid Pakistani mobile number' }),
  authorizedPersonEmail: z
    .string()
    .trim()
    .email({ message: 'Valid email address is required' })
    .toLowerCase(),

  // ── Compliance ────────────────────────────────────────────────────────────
  ntcNumber: z.string().trim().max(50).optional(),
  fbrNtn: z
    .string()
    .trim()
    .max(20)
    .optional(),
  strn: z.string().trim().max(20).optional(),
  bankAccountTitle: z.string().trim().max(200).optional(),
  bankName: z.string().trim().max(100).optional(),
  bankIban: z
    .string()
    .trim()
    .regex(ibanRegex, { message: 'IBAN must be in format: PK + 2 digits + 4 letters + 16 digits' })
    .optional()
    .or(z.literal('')),

  // ── Contact ───────────────────────────────────────────────────────────────
  officePhone: z
    .string()
    .trim()
    .regex(phoneRegex, { message: 'Enter a valid Pakistani office phone number' }),
  officeEmail: z
    .string()
    .trim()
    .email({ message: 'Valid office email is required' })
    .toLowerCase(),
  websiteUrl: z
    .string()
    .trim()
    .url({ message: 'Enter a valid website URL (include https://)' })
    .optional()
    .or(z.literal('')),

  // ── Structure ─────────────────────────────────────────────────────────────
  blocks: z
    .array(BlockSchema)
    .min(1, { message: 'At least one block or phase is required' })
    .max(50),
  plotInventory: z
    .array(PlotInventorySchema)
    .min(1, { message: 'At least one plot size inventory entry is required' })
    .max(20),
  amenities: z
    .array(
      z.enum([
        'mosque', 'school', 'hospital', 'park', 'community_center',
        'commercial_area', 'security_gate', 'cctv',
        'underground_electricity', 'gas', 'water_supply', 'sewerage',
        'gymnasium', 'swimming_pool', 'sports_complex', 'cinema',
        'food_court', 'playground', 'jogging_track', 'library',
        'graveyard', 'car_parking', 'visitor_parking',
        'fire_station', 'police_post',
      ])
    )
    .default([]),
  installmentPlans: z.array(InstallmentPlanSchema).max(10).default([]),

  // ── KYC documents ─────────────────────────────────────────────────────────
  kycDocuments: z
    .array(KycDocumentSchema)
    .min(1, { message: 'At least one document (NOC certificate) is required' })
    .max(20),

  // ── Consent ───────────────────────────────────────────────────────────────
  consentGiven: z.literal(true, {
    message: 'You must accept the terms to proceed',
  }),
});

// ─── Slug generator ───────────────────────────────────────────────────────────

function generateSlug(name: string, city: string): string {
  const base = `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base}-${suffix}`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // Method guard
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Rate limit — onboarding submissions (strict: 5/hour per IP)
  const rl = await rateLimitApi(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    res.status(429).json({
      success: false,
      error: 'Too many submissions. Please wait before trying again.',
    });
    return;
  }

  // Auth guard — must be logged in
  const authResult = await requireAuth(req, res);
  if (!authResult) return;

  const userId = authResult.id;
  const ip = getClientIp(req);

  try {
    await dbConnect();

    // ── Parse + validate body ──────────────────────────────────────────────

    const parseResult = SocietyOnboardingSchema.safeParse(req.body);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      res.status(422).json({
        success: false,
        error: 'Please fix the highlighted fields and try again.',
        fieldErrors,
      });
      return;
    }

    const data = parseResult.data;

    // ── Load user ──────────────────────────────────────────────────────────

    const user = await User.findById(userId).select(
      '_id email name role onboardingStatus onboardingRole tokenVersion'
    );

    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found.' });
      return;
    }

    // ── Guard: already has an active onboarding ────────────────────────────

    if (
      user.onboardingStatus === 'pending' ||
      user.onboardingStatus === 'approved'
    ) {
      res.status(409).json({
        success: false,
        error:
          user.onboardingStatus === 'approved'
            ? 'Your account is already verified. No further onboarding needed.'
            : 'You already have a pending application under review. Please wait for admin review.',
      });
      return;
    }

    // ── Guard: only 'user' role can onboard as society ────────────────────

    if (user.role !== 'user') {
      res.status(403).json({
        success: false,
        error: `Your account already has the '${user.role}' role. Society onboarding is only for standard user accounts.`,
      });
      return;
    }

    // ── Duplicate detection ────────────────────────────────────────────────

    // 1. One active profile per user
    const existingProfile = await SocietyProfile.findOne({
      userId,
      status: { $in: ['pending', 'approved', 'info_required'] },
    }).select('_id status');

    if (existingProfile) {
      res.status(409).json({
        success: false,
        error:
          existingProfile.status === 'approved'
            ? 'A verified society profile already exists for your account.'
            : 'You already have a society application under review.',
      });
      return;
    }

    // ── Encrypt authorized person CNIC ────────────────────────────────────

    let cnicHash: string;
    let cnicEncrypted: string;

    try {
      cnicHash = hashCnic(data.authorizedPersonCnic);
      cnicEncrypted = kycEncrypt(data.authorizedPersonCnic);
    } catch {
      await logSecurityEvent({
        type: 'system_error',
        severity: 'high',
        ip,
        req,
        metadata: {
          endpoint: '/api/onboarding/society',
          userId,
          errorMessage: 'KYC encryption failed during society onboarding',
        },
      });
      res.status(500).json({
        success: false,
        error: 'A security error occurred. Please try again.',
      });
      return;
    }

    // ── NOC number uniqueness (active profiles only) ───────────────────────

    const nocConflict = await SocietyProfile.findOne({
      nocNumber: data.nocNumber,
      status: { $nin: ['rejected', 'draft'] },
    }).select('_id');

    if (nocConflict) {
      res.status(409).json({
        success: false,
        error:
          'This NOC number is already registered with another society profile. Please verify your NOC number and try again.',
        fieldErrors: { nocNumber: ['NOC number already registered'] },
      });
      return;
    }

    // ── FBR NTN uniqueness (if provided) ──────────────────────────────────

    if (data.fbrNtn) {
      const ntnConflict = await SocietyProfile.findOne({
        fbrNtn: data.fbrNtn,
        status: { $nin: ['rejected', 'draft'] },
      }).select('_id');

      if (ntnConflict) {
        res.status(409).json({
          success: false,
          error: 'This NTN is already registered with another society profile.',
          fieldErrors: { fbrNtn: ['NTN already registered'] },
        });
        return;
      }
    }

    // ── CNIC uniqueness across all profile types ───────────────────────────

    const [agentCnicConflict, developerCnicConflict, societyCnicConflict] =
      await Promise.all([
        // Check AgentProfile
        (async () => {
          try {
            const AgentProfile = (await import('@/models/AgentProfile')).default;
            return AgentProfile.findOne({
              cnicHash,
              status: { $nin: ['rejected', 'draft'] },
            })
              .select('_id')
              .lean();
          } catch {
            return null;
          }
        })(),
        // Check DeveloperProfile
        (async () => {
          try {
            const DeveloperProfile = (await import('@/models/DeveloperProfile')).default;
            return DeveloperProfile.findOne({
              authorizedPersonCnicHash: cnicHash,
              status: { $nin: ['rejected', 'draft'] },
            })
              .select('_id')
              .lean();
          } catch {
            return null;
          }
        })(),
        // Check SocietyProfile
        SocietyProfile.findOne({
          authorizedPersonCnicHash: cnicHash,
          status: { $nin: ['rejected', 'draft'] },
        })
          .select('_id')
          .lean(),
      ]);

    if (agentCnicConflict || developerCnicConflict || societyCnicConflict) {
      await logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        ip,
        req,
        metadata: {
          endpoint: '/api/onboarding/society',
          userId,
          errorMessage: 'Duplicate CNIC detected during society onboarding',
        },
      });
      res.status(409).json({
        success: false,
        error:
          'This CNIC is already registered with another profile on Highrise. Each CNIC can only be used once.',
        fieldErrors: {
          authorizedPersonCnic: ['CNIC already registered'],
        },
      });
      return;
    }

    // ── Build KYC documents array ──────────────────────────────────────────

    const kycDocuments = data.kycDocuments.map((doc) => ({
      type: doc.type,
      title: doc.title,
      url: doc.url,
      uploadedAt: new Date(),
    }));

    // ── Create SocietyProfile ──────────────────────────────────────────────

    const profile = new SocietyProfile({
      userId,

      // Status
      status: 'pending',
      submittedAt: new Date(),

      // Society identity
      societyName: data.societyName,
      registeredName: data.registeredName,
      slug: generateSlug(data.societyName, data.city),
      city: data.city,
      areaName: data.areaName,
      fullAddress: data.fullAddress,
      authority: data.authority,
      nocNumber: data.nocNumber,
      nocIssuanceDate: data.nocIssuanceDate
        ? new Date(data.nocIssuanceDate)
        : undefined,
      nocExpiryDate: data.nocExpiryDate
        ? new Date(data.nocExpiryDate)
        : undefined,
      totalAreaAcres: data.totalAreaAcres,
      launchYear: data.launchYear,

      // Authorized person (encrypted)
      authorizedPersonName: data.authorizedPersonName,
      authorizedPersonDesignation: data.authorizedPersonDesignation,
      authorizedPersonCnicHash: cnicHash,
      authorizedPersonCnicEncrypted: cnicEncrypted,
      authorizedPersonPhone: data.authorizedPersonPhone,
      authorizedPersonEmail: data.authorizedPersonEmail,

      // Compliance
      ntcNumber: data.ntcNumber || undefined,
      fbrNtn: data.fbrNtn || undefined,
      strn: data.strn || undefined,
      bankAccountTitle: data.bankAccountTitle || undefined,
      bankName: data.bankName || undefined,
      bankIban: data.bankIban || undefined,

      // Structure
      blocks: data.blocks,
      plotInventory: data.plotInventory,
      amenities: data.amenities,
      installmentPlans: data.installmentPlans,

      // KYC documents
      kycDocuments,

      // Contact
      officePhone: data.officePhone,
      officeEmail: data.officeEmail,
      websiteUrl: data.websiteUrl || undefined,

      // Verification defaults
      cnicVerified: false,
      nocVerified: false,
      kycStatus: 'in_review',
      trustScore: 0,
      badges: [],

      // Audit trail
      auditTrail: [
        {
          action: 'submitted',
          performedBy: user._id,
          performedAt: new Date(),
          note: `Society onboarding submitted from IP: ${ip}`,
        },
      ],

      // Consent
      consentGiven: true,
      consentTimestamp: new Date(),
      consentIp: ip,
    });

    await profile.save();

    // ── Sync User state ────────────────────────────────────────────────────

    user.onboardingStatus = 'pending';
    user.onboardingRole = 'society';
    user.onboardingSubmittedAt = new Date();
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    // ── Fire-and-forget emails ─────────────────────────────────────────────

    Promise.all([
      // Confirmation to society rep
      sendSocietyConfirmationEmail({
        toEmail: user.email,
        toName: user.name,
        societyName: data.societyName,
        nocNumber: data.nocNumber,
        authority: data.authority,
        submittedAt: new Date(),
      }),
      // Internal alert to admin
      sendAdminSocietyAlertEmail({
        societyName: data.societyName,
        applicantName: user.name,
        applicantEmail: user.email,
        nocNumber: data.nocNumber,
        authority: data.authority,
        city: data.city,
        profileId: String(profile._id),
        submittedAt: new Date(),
      }),
    ]).catch(() => {
      // Silent — emails are non-critical
    });

    // ── Security log ───────────────────────────────────────────────────────

    await logSecurityEvent({
      type: 'admin_action',
      severity: 'low',
      ip,
      req,
      metadata: {
        endpoint: '/api/onboarding/society',
        userId,
        profileId: String(profile._id),
        action: 'society_onboarding_submitted',
        societyName: data.societyName,
        nocNumber: data.nocNumber,
        authority: data.authority,
      },
    }).catch(() => {
      // Silent
    });

    // ── Success ────────────────────────────────────────────────────────────

    res.status(201).json({
      success: true,
      message:
        'Your society registration has been submitted successfully. Our team will review your application within 2-3 business days.',
      profileId: String(profile._id),
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error';

    // Duplicate key errors (race condition on unique indexes)
    if (
      typeof errorMessage === 'string' &&
      errorMessage.includes('duplicate key')
    ) {
      res.status(409).json({
        success: false,
        error:
          'A profile with this NOC number or NTN already exists. Please check your details and try again.',
      });
      return;
    }

    await logSecurityEvent({
      type: 'system_error',
      severity: 'high',
      ip,
      req,
      metadata: {
        endpoint: '/api/onboarding/society',
        userId,
        errorMessage: `Society onboarding failed: ${errorMessage}`,
      },
    }).catch(() => {
      // Silent
    });

    res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again in a few minutes.',
    });
  }
}