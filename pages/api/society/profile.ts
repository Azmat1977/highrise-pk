// pages/api/society/profile.ts
// Highrise.pk — Society Portal: Own Profile API
// GET  → return own SocietyProfile (requireSociety guard)
// PATCH → update allowed fields only (findOne + save)
// NO console.* | NO as any | NO findByIdAndUpdate | NO plain CNIC

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import SocietyProfile from '@/models/SocietyProfile';
import type { ISocietyProfile, SocietyAmenity } from '@/models/SocietyProfile';
import { requireSociety } from '@/lib/requireAuth';
import type { AuthToken } from '@/lib/requireAuth';
import { z } from 'zod';
import mongoose from 'mongoose';

// ─── Lean shape ───────────────────────────────────────────────────────────────

interface SocietyProfileLean {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: string;
  infoRequiredReason?: string;
  rejectionReason?: string;
  suspensionReason?: string;
  societyName: string;
  registeredName: string;
  slug: string;
  city: string;
  areaName: string;
  fullAddress: string;
  authority: string;
  nocNumber: string;
  nocIssuanceDate?: Date;
  nocExpiryDate?: Date;
  totalAreaAcres?: number;
  launchYear?: number;
  authorizedPersonName: string;
  authorizedPersonDesignation: string;
  authorizedPersonPhone: string;
  authorizedPersonEmail: string;
  ntcNumber?: string;
  fbrNtn?: string;
  strn?: string;
  bankAccountTitle?: string;
  bankName?: string;
  officePhone: string;
  officeEmail: string;
  websiteUrl?: string;
  blocks: Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    totalPlots: number;
    availablePlots: number;
    plotSizes: string[];
    possessionStatus: string;
    launchYear?: number;
    completionYear?: number;
  }>;
  plotInventory: Array<{
    size: string;
    totalPlots: number;
    availablePlots: number;
    pricePerMarla?: number;
    pricePerSqFt?: number;
  }>;
  amenities: string[];
  installmentPlans: Array<{
    _id: mongoose.Types.ObjectId;
    planName: string;
    durationMonths: number;
    downPaymentPercent: number;
    monthlyInstallmentPercent?: number;
    quarterlyInstallmentPercent?: number;
    halfYearlyInstallmentPercent?: number;
    balloonPaymentPercent?: number;
    isInterestFree: boolean;
    notes?: string;
  }>;
  kycDocuments: Array<{
    _id: mongoose.Types.ObjectId;
    type: string;
    title: string;
    url: string;
    uploadedAt: Date;
  }>;
  cnicVerified: boolean;
  nocVerified: boolean;
  kycStatus: string;
  trustScore: number;
  badges: string[];
  submittedAt?: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Response type ────────────────────────────────────────────────────────────

interface ApiResponse {
  success: boolean;
  profile?: SocietyProfileLean;
  message?: string;
  errors?: Record<string, string[]>;
}

// ─── PATCH validation schema ──────────────────────────────────────────────────

const AMENITY_VALUES = [
  'mosque', 'school', 'hospital', 'park', 'community_center',
  'commercial_area', 'security_gate', 'cctv', 'underground_electricity',
  'gas', 'water_supply', 'sewerage', 'gymnasium', 'swimming_pool',
  'sports_complex', 'cinema', 'food_court', 'playground', 'jogging_track',
  'library', 'graveyard', 'car_parking', 'visitor_parking',
  'fire_station', 'police_post',
] as const;

const PatchSchema = z.object({
  officePhone: z.string().min(10).max(20).optional(),
  officeEmail: z.string().email().max(200).optional(),
  websiteUrl: z.string().url().max(500).optional().or(z.literal('')),
  amenities: z.array(z.enum(AMENITY_VALUES)).max(25).optional(),
  bankAccountTitle: z.string().max(200).optional(),
  bankName: z.string().max(100).optional(),
}).strict();

type PatchBody = z.infer<typeof PatchSchema>;

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authResult = await requireSociety(req, res);
  if (!authResult) return;

  await dbConnect();

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const profile = await SocietyProfile
      .findOne({ userId: new mongoose.Types.ObjectId(authResult.id) })
      .lean<SocietyProfileLean>();

    if (!profile) {
      res.status(404).json({ success: false, message: 'Society profile not found.' });
      return;
    }

    res.status(200).json({ success: true, profile });
    return;
  }

  // ── PATCH ─────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const parsed = PatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
      return;
    }

    const data: PatchBody = parsed.data;

    // findOne + save (Rule: never findByIdAndUpdate for mutations)
    const profile = await SocietyProfile.findOne({
      userId: new mongoose.Types.ObjectId(authResult.id),
    });

    if (!profile) {
      res.status(404).json({ success: false, message: 'Society profile not found.' });
      return;
    }

    // Apply only allowed fields
    if (data.officePhone !== undefined) profile.officePhone = data.officePhone;
    if (data.officeEmail !== undefined) profile.officeEmail = data.officeEmail;
    if (data.websiteUrl !== undefined) profile.websiteUrl = data.websiteUrl || undefined;
    if (data.amenities !== undefined) {
      profile.amenities = data.amenities as SocietyAmenity[];
    }
    if (data.bankAccountTitle !== undefined) profile.bankAccountTitle = data.bankAccountTitle;
    if (data.bankName !== undefined) profile.bankName = data.bankName;

    // Audit trail entry for self-update
    profile.auditTrail.push({
      action: 'updated',
      performedBy: new mongoose.Types.ObjectId(authResult.id),
      performedAt: new Date(),
      note: 'Profile updated by society admin via portal.',
    });

    await profile.save();

    // Return lean result (no encrypted fields — toJSON transform strips them)
    const updated = await SocietyProfile
      .findOne({ userId: new mongoose.Types.ObjectId(authResult.id) })
      .lean<SocietyProfileLean>();

    res.status(200).json({ success: true, profile: updated ?? undefined });
    return;
  }

  res.status(405).json({ success: false, message: 'Method not allowed.' });
}