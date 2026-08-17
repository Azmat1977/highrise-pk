/**
 * Canonical project-unit detail API.
 *
 * GET    /api/projects/[id]/units/[unitId]
 * PATCH  /api/projects/[id]/units/[unitId]
 * DELETE /api/projects/[id]/units/[unitId]  (soft delete)
 *
 * Source-of-truth relationships:
 *   Project.developerId -> User._id
 *   Unit.projectId      -> Project._id
 *   Unit.developerId    -> User._id
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';
import { requireAuth, getClientIp } from '@/lib/requireAuth';
import { getOptionalAuth } from '@/lib/optionalAuth';
import {
  rateLimitApi,
  rateLimitDeveloper,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';
import { deleteFiles, isHighrisePublicId } from '@/lib/cloudinary';

const ImageRefSchema = z.object({
  url: z.string().url().max(2048),
  publicId: z.string().min(1).max(512),
  caption: z.string().max(200).optional(),
  isPrimary: z.boolean().optional(),
  order: z.number().int().min(0).max(10_000).optional(),
});

const PatchUnitSchema = z.object({
  unitNumber: z.string().trim().min(1).max(40).optional(),
  title: z.string().trim().max(200).optional(),
  category: z.enum(['residential', 'commercial']).optional(),
  unitType: z.string().trim().min(1).max(80).optional(),
  status: z.enum(['available', 'reserved', 'sold', 'on_hold', 'cancelled']).optional(),
  floorNumber: z.number().int().min(-5).max(200).optional(),
  floorName: z.string().trim().max(80).optional(),
  tower: z.string().trim().max(80).optional(),
  wing: z.string().trim().max(80).optional(),
  building: z.string().trim().max(120).optional(),

  area: z.number().positive().optional(),
  areaUnit: z.string().trim().min(1).max(20).optional(),
  coveredArea: z.number().min(0).optional(),
  carpetArea: z.number().min(0).optional(),
  balconyArea: z.number().min(0).optional(),
  terraceArea: z.number().min(0).optional(),
  frontWidth: z.number().min(0).optional(),
  depth: z.number().min(0).optional(),
  hasMezzanine: z.boolean().optional(),
  mezzanineArea: z.number().min(0).optional(),

  price: z.number().positive().optional(),
  priceNegotiable: z.boolean().optional(),
  listingType: z.enum(['full_payment', 'installment', 'both', 'pre_launch']).optional(),
  installmentPlan: z.object({
    totalPrice: z.number().min(0).optional(),
    bookingAmount: z.number().min(0).optional(),
    bookingPercent: z.number().min(0).max(100).optional(),
    downPayment: z.number().min(0).optional(),
    downPaymentPercent: z.number().min(0).max(100).optional(),
    downPaymentDueIn: z.string().trim().max(60).optional(),
    hasMonthly: z.boolean().optional(),
    monthlyAmount: z.number().min(0).optional(),
    monthlyCount: z.number().int().min(0).optional(),
    hasQuarterly: z.boolean().optional(),
    quarterlyAmount: z.number().min(0).optional(),
    quarterlyCount: z.number().int().min(0).optional(),
    hasHalfYearly: z.boolean().optional(),
    halfYearlyAmount: z.number().min(0).optional(),
    halfYearlyCount: z.number().int().min(0).optional(),
    hasYearly: z.boolean().optional(),
    yearlyAmount: z.number().min(0).optional(),
    yearlyCount: z.number().int().min(0).optional(),
    possessionAmount: z.number().min(0).optional(),
    possessionPercent: z.number().min(0).max(100).optional(),
    planDuration: z.number().min(0).optional(),
    planDurationUnit: z.enum(['months', 'years']).optional(),
    earlyPaymentDiscount: z.number().min(0).max(100).optional(),
    fullPaymentDiscount: z.number().min(0).max(100).optional(),
  }).partial().optional(),
  charges: z.object({
    cornerCharges: z.number().min(0).optional(),
    facingPremium: z.number().min(0).optional(),
    floorPremium: z.number().min(0).optional(),
    possessionCharges: z.number().min(0).optional(),
    maintenanceAdvance: z.number().min(0).optional(),
    maintenanceMonths: z.number().min(0).optional(),
    electricityMeterCharges: z.number().min(0).optional(),
    gasMeterCharges: z.number().min(0).optional(),
    waterConnectionCharges: z.number().min(0).optional(),
    parkingCharges: z.number().min(0).optional(),
    documentationCharges: z.number().min(0).optional(),
    transferFee: z.number().min(0).optional(),
  }).partial().optional(),

  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  balconies: z.number().int().min(0).max(20).optional(),
  servantQuarter: z.boolean().optional(),
  storeRoom: z.boolean().optional(),
  laundryArea: z.boolean().optional(),
  washroom: z.enum(['none', 'private', 'shared']).optional(),
  finishingLevel: z.enum(['grey_structure', 'standard', 'premium', 'luxury']).optional(),

  isCorner: z.boolean().optional(),
  facing: z.enum(['north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west']).optional(),
  view: z.enum(['park', 'road', 'city', 'garden', 'pool', 'mosque', 'hills', 'open', 'internal']).optional(),
  isParkFacing: z.boolean().optional(),
  isRoadFacing: z.boolean().optional(),
  parkingIncluded: z.boolean().optional(),
  parkingSpaces: z.number().int().min(0).max(20).optional(),
  parkingType: z.enum(['covered', 'open', 'basement']).optional(),
  features: z.array(z.string().trim().min(1).max(80)).max(50).optional(),

  investorIntelligence: z.object({
    estimatedMonthlyRent: z.number().min(0).optional(),
    expectedRentalYield: z.number().min(0).max(100).optional(),
    capitalAppreciation: z.string().max(200).optional(),
    appreciationPercent: z.number().min(0).optional(),
    appreciationTimeframe: z.string().max(80).optional(),
    investmentScore: z.enum(['low', 'medium', 'high', 'excellent']).optional(),
    demandScore: z.enum(['low', 'moderate', 'high', 'very_high']).optional(),
    rentalDemand: z.enum(['low', 'moderate', 'high', 'very_high']).optional(),
    investmentNotes: z.string().max(1200).optional(),
  }).partial().optional(),

  newImages: z.array(ImageRefSchema).max(20).optional(),
  removedImageIds: z.array(z.string().min(1).max(512)).max(20).optional(),
  images: z.array(ImageRefSchema).max(20).optional(),
  floorPlan: ImageRefSchema.optional(),
  floorPlanImage: ImageRefSchema.optional(),
  virtualTourUrl: z.string().url().max(2048).optional().or(z.literal('')),
  videoUrl: z.string().url().max(2048).optional().or(z.literal('')),
  shortDescription: z.string().trim().max(500).optional(),
  description: z.string().trim().max(5000).optional(),
}).strict();

type ApiResponse = {
  success: boolean;
  message?: string;
  code?: string;
  unit?: unknown;
  project?: unknown;
  errors?: Record<string, string[]>;
};

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

function normalizeParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? String(v[0] ?? '').trim() : String(v ?? '').trim();
}

function isProjectPublic(project: { status?: string; verificationStatus?: string; isVerified?: boolean }): boolean {
  return project.isVerified === true ||
    (String(project.status ?? '').toLowerCase() === 'verified' &&
      String(project.verificationStatus ?? '').toLowerCase() === 'verified');
}

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(2)} Crore`;
  if (amount >= 100_000) return `${(amount / 100_000).toFixed(2)} Lac`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return String(amount);
}

function cleanPublicUnit(raw: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...raw };
  for (const key of [
    'projectId', 'developerId', 'customContact', 'bookingInfo', 'soldInfo',
    'createdBy', 'updatedBy', 'isDeleted', 'deletedAt', 'isVerified',
  ]) delete safe[key];
  return safe;
}

async function resolveProject(idOrSlug: string) {
  const filter = { isDeleted: { $ne: true } };
  return (isValidObjectId(idOrSlug)
    ? Project.findOne({ _id: idOrSlug, ...filter })
    : Project.findOne({ slug: idOrSlug, ...filter }))
    .select('_id developerId slug projectName city area status verificationStatus isVerified developerBadge')
    .lean() as Promise<{
      _id: mongoose.Types.ObjectId;
      developerId: mongoose.Types.ObjectId;
      slug?: string;
      projectName?: string;
      city?: string;
      area?: string;
      status?: string;
      verificationStatus?: string;
      isVerified?: boolean;
      developerBadge?: string;
    } | null>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>): Promise<void> {
  setSecurityHeaders(res);
  const method = (req.method ?? '').toUpperCase();
  if (!['GET', 'PATCH', 'DELETE'].includes(method)) {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return void res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const rl = await (method === 'GET' ? rateLimitApi(req) : rateLimitDeveloper(req));
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  const idOrSlug = normalizeParam(req.query.id as string | string[] | undefined);
  const unitId = normalizeParam(req.query.unitId as string | string[] | undefined);
  if (!idOrSlug || !isValidObjectId(unitId)) {
    return void res.status(400).json({ success: false, message: 'Valid project and unit IDs are required.' });
  }

  await dbConnect();
  if (method === 'GET') return void handleGet(req, res, idOrSlug, unitId);
  if (method === 'PATCH') return void handlePatch(req, res, idOrSlug, unitId);
  return void handleDelete(req, res, idOrSlug, unitId);
}

async function handleGet(req: NextApiRequest, res: NextApiResponse<ApiResponse>, idOrSlug: string, unitId: string): Promise<void> {
  const viewer = await getOptionalAuth(req);
  const project = await resolveProject(idOrSlug);
  if (!project) return void res.status(404).json({ success: false, message: 'Project not found.' });

  const isAdmin = !!viewer && ['admin', 'superadmin'].includes(viewer.role);
  const isOwner = !!viewer && viewer.role === 'developer' && String(project.developerId) === viewer.id;
  const publicProject = isProjectPublic(project);
  if (!publicProject && !isAdmin && !isOwner) {
    return void res.status(404).json({ success: false, message: 'Unit not found.' });
  }

  const filter: Record<string, unknown> = {
    _id: new mongoose.Types.ObjectId(unitId),
    projectId: project._id,
    isDeleted: { $ne: true },
  };
  if (!isAdmin && !isOwner) filter.isPublished = true;

  const unit = await Unit.findOne(filter)
    .select(isAdmin || isOwner ? '-soldInfo.cnicHash -soldInfo.cnicEncrypted' : '-bookingInfo -soldInfo -customContact -createdBy -updatedBy')
    .lean();
  if (!unit) return void res.status(404).json({ success: false, message: 'Unit not found.' });

  const raw = unit as unknown as Record<string, unknown>;
  const responseUnit = isAdmin || isOwner ? { ...raw } : cleanPublicUnit(raw);
  // Compatibility alias used by the current developer editor.
  responseUnit.floorPlan = responseUnit.floorPlanImage ?? null;
  responseUnit.priceFormatted = typeof responseUnit.price === 'number' ? formatPKR(responseUnit.price) : null;
  responseUnit.contactViaHighrise = true;

  if (!isAdmin && !isOwner) {
    Unit.updateOne({ _id: unitId }, { $inc: { views: 1 } }).exec().catch(() => undefined);
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  }

  return void res.status(200).json({
    success: true,
    unit: responseUnit,
    project: {
      _id: String(project._id),
      projectName: project.projectName ?? '',
      slug: project.slug ?? '',
      city: project.city ?? '',
      area: project.area ?? '',
    },
  });
}

async function getOwnedProject(req: NextApiRequest, res: NextApiResponse<ApiResponse>, idOrSlug: string) {
  const auth = await requireAuth(req, res);
  if (!auth) return null;
  const isAdmin = ['admin', 'superadmin'].includes(auth.role);
  if (!isAdmin && auth.role !== 'developer') {
    res.status(403).json({ success: false, message: 'Only developers or admins can modify units.' });
    return null;
  }
  const project = await resolveProject(idOrSlug);
  if (!project || (!isAdmin && String(project.developerId) !== auth.id)) {
    res.status(404).json({ success: false, message: 'Project not found.' });
    return null;
  }
  return { auth, isAdmin, project };
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse<ApiResponse>, idOrSlug: string, unitId: string): Promise<void> {
  const access = await getOwnedProject(req, res, idOrSlug);
  if (!access) return;
  const { auth, isAdmin, project } = access;

  const unit = await Unit.findOne({ _id: unitId, projectId: project._id, isDeleted: { $ne: true } });
  if (!unit) return void res.status(404).json({ success: false, message: 'Unit not found.' });

  let rawBody: unknown = req.body;
  if (typeof rawBody === 'string') {
    try {
      rawBody = JSON.parse(rawBody);
    } catch {
      return void res.status(400).json({ success: false, message: 'Invalid JSON body.' });
    }
  }

  const parsed = PatchUnitSchema.safeParse(rawBody);
  if (!parsed.success) {
    return void res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const data = parsed.data;
  const current = unit.toObject() as Record<string, unknown>;

  // Status transitions are intentionally centralized in /status so sale/reservation
  // KYC and transition rules cannot be bypassed by this general edit endpoint.
  if (data.status && data.status !== current.status) {
    return void res.status(409).json({
      success: false,
      message: 'Change unit availability through the dedicated status action.',
      code: 'USE_STATUS_ENDPOINT',
    });
  }
  if (current.status === 'sold' && !isAdmin) {
    return void res.status(409).json({ success: false, message: 'Sold units cannot be edited.' });
  }

  const mediaRefs = [
    ...(data.newImages ?? []),
    ...(data.images ?? []),
    ...(data.floorPlan ? [data.floorPlan] : []),
    ...(data.floorPlanImage ? [data.floorPlanImage] : []),
  ];
  if (mediaRefs.some((m) => !isHighrisePublicId(m.publicId))) {
    return void res.status(400).json({ success: false, message: 'Media must be uploaded through Highrise first.' });
  }
  if ((data.removedImageIds ?? []).some((id) => !isHighrisePublicId(id))) {
    return void res.status(400).json({ success: false, message: 'Invalid media removal request.' });
  }

  if (data.unitNumber && data.unitNumber !== current.unitNumber) {
    const duplicate = await Unit.exists({ projectId: project._id, unitNumber: data.unitNumber, _id: { $ne: unit._id }, isDeleted: { $ne: true } });
    if (duplicate) return void res.status(409).json({ success: false, message: `Unit number "${data.unitNumber}" already exists.` });
  }

  const removedIds = new Set(data.removedImageIds ?? []);
  const existingImages = ((current.images as Array<Record<string, unknown>> | undefined) ?? [])
    .filter((img) => !removedIds.has(String(img.publicId ?? '')));
  const nextImages = data.images ?? [...existingImages, ...(data.newImages ?? [])];
  if (nextImages.length > 20) return void res.status(422).json({ success: false, message: 'A unit can have at most 20 images.' });

  const omit = new Set(['status', 'newImages', 'removedImageIds', 'images', 'floorPlan', 'floorPlanImage']);
  for (const [key, value] of Object.entries(data)) {
    if (!omit.has(key) && value !== undefined) (unit as unknown as Record<string, unknown>)[key] = value;
  }
  if (data.images || data.newImages || data.removedImageIds) (unit as unknown as Record<string, unknown>).images = nextImages;

  const replacementFloorPlan = data.floorPlanImage ?? data.floorPlan;
  const oldFloorPlan = current.floorPlanImage as Record<string, unknown> | undefined;
  if (replacementFloorPlan) (unit as unknown as Record<string, unknown>).floorPlanImage = replacementFloorPlan;

  (unit as unknown as Record<string, unknown>).updatedBy = new mongoose.Types.ObjectId(auth.id);
  await unit.save();
  await syncUnitTypeBreakdown(String(project._id)).catch(() => undefined);

  const safelyOwnedRemoved = ((current.images as Array<Record<string, unknown>> | undefined) ?? [])
    .map((img) => String(img.publicId ?? ''))
    .filter((id) => removedIds.has(id) && isHighrisePublicId(id));
  if (replacementFloorPlan && oldFloorPlan?.publicId && isHighrisePublicId(String(oldFloorPlan.publicId))) {
    safelyOwnedRemoved.push(String(oldFloorPlan.publicId));
  }
  if (safelyOwnedRemoved.length) await deleteFiles([...new Set(safelyOwnedRemoved)]).catch(() => undefined);

  await logSecurityEvent({
    type: 'admin_action',
    severity: 'low',
    userId: auth.id,
    ip: getClientIp(req),
    metadata: { action: 'unit_updated', projectId: String(project._id), unitId },
    req,
  });

  const saved = unit.toObject() as Record<string, unknown>;
  return void res.status(200).json({ success: true, message: 'Unit updated successfully.', unit: { ...saved, floorPlan: saved.floorPlanImage ?? null } });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse<ApiResponse>, idOrSlug: string, unitId: string): Promise<void> {
  const access = await getOwnedProject(req, res, idOrSlug);
  if (!access) return;
  const { auth, isAdmin, project } = access;

  const unit = await Unit.findOne({ _id: unitId, projectId: project._id, isDeleted: { $ne: true } });
  if (!unit) return void res.status(404).json({ success: false, message: 'Unit not found.' });
  const status = String((unit as unknown as Record<string, unknown>).status ?? '');
  if (!isAdmin && ['reserved', 'sold'].includes(status)) {
    return void res.status(409).json({ success: false, message: 'Reserved or sold units cannot be deleted by a developer.' });
  }

  (unit as unknown as Record<string, unknown>).isDeleted = true;
  (unit as unknown as Record<string, unknown>).deletedAt = new Date();
  (unit as unknown as Record<string, unknown>).isPublished = false;
  (unit as unknown as Record<string, unknown>).updatedBy = new mongoose.Types.ObjectId(auth.id);
  await unit.save();
  await syncUnitTypeBreakdown(String(project._id)).catch(() => undefined);

  await logSecurityEvent({
    type: 'admin_action',
    severity: 'medium',
    userId: auth.id,
    ip: getClientIp(req),
    metadata: { action: 'unit_soft_deleted', projectId: String(project._id), unitId, previousStatus: status },
    req,
  });
  return void res.status(200).json({ success: true, message: 'Unit deleted successfully.' });
}
