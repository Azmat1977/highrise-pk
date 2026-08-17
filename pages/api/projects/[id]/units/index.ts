/**
 * Canonical project unit collection API.
 *
 * GET  /api/projects/[id]/units
 * POST /api/projects/[id]/units
 *
 * Model contract:
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
  rateLimitPropertyCreate,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';
import { isHighrisePublicId } from '@/lib/cloudinary';

const ImageSchema = z.object({
  url: z.string().url().max(2048),
  publicId: z.string().min(1).max(512),
  caption: z.string().max(200).optional(),
  isPrimary: z.boolean().optional(),
  order: z.number().int().min(0).max(100).optional(),
});

const CreateUnitSchema = z.object({
  unitNumber: z.string().trim().min(1).max(40),
  category: z.enum(['residential', 'commercial']),
  unitType: z.string().trim().min(1).max(80),
  floorNumber: z.number().int().min(-10).max(300).optional(),
  floorName: z.string().trim().max(60).optional(),
  tower: z.string().trim().max(40).optional(),
  wing: z.string().trim().max(40).optional(),
  building: z.string().trim().max(60).optional(),

  area: z.number().positive(),
  areaUnit: z.string().trim().min(1).max(20).default('Sq.Ft'),
  coveredArea: z.number().min(0).optional(),
  carpetArea: z.number().min(0).optional(),
  balconyArea: z.number().min(0).optional(),
  terraceArea: z.number().min(0).optional(),
  frontWidth: z.number().min(0).optional(),
  depth: z.number().min(0).optional(),
  hasMezzanine: z.boolean().optional(),
  mezzanineArea: z.number().min(0).optional(),

  price: z.number().positive(),
  priceNegotiable: z.boolean().optional(),
  listingType: z.enum(['full_payment', 'installment', 'both', 'pre_launch']).default('both'),

  installmentPlan: z.object({
    totalPrice: z.number().min(0).optional(),
    bookingAmount: z.number().min(0).optional(),
    bookingPercent: z.number().min(0).max(100).optional(),
    downPayment: z.number().min(0).optional(),
    downPaymentPercent: z.number().min(0).max(100).optional(),
    monthlyAmount: z.number().min(0).optional(),
    monthlyCount: z.number().int().min(0).optional(),
    possessionAmount: z.number().min(0).optional(),
    possessionPercent: z.number().min(0).max(100).optional(),
  }).optional(),

  charges: z.object({
    cornerCharges: z.number().min(0).optional(),
    facingPremium: z.number().min(0).optional(),
    floorPremium: z.number().min(0).optional(),
    parkingCharges: z.number().min(0).optional(),
    maintenanceAdvance: z.number().min(0).optional(),
  }).optional(),

  bedrooms: z.number().int().min(0).max(30).optional(),
  bathrooms: z.number().int().min(0).max(30).optional(),
  balconies: z.number().int().min(0).max(30).optional(),
  servantQuarter: z.boolean().optional(),
  storeRoom: z.boolean().optional(),
  laundryArea: z.boolean().optional(),
  washroom: z.string().trim().max(50).optional(),
  finishingLevel: z.string().trim().max(80).optional(),
  isCorner: z.boolean().optional(),
  facing: z.string().trim().max(30).optional(),
  view: z.string().trim().max(30).optional(),
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
    investmentScore: z.enum(['low', 'medium', 'high', 'excellent']).optional(),
  }).optional(),

  images: z.array(ImageSchema).max(20).optional(),
  floorPlan: ImageSchema.optional(),
  floorPlanImage: ImageSchema.optional(),
  virtualTourUrl: z.string().url().max(2048).optional().or(z.literal('')),
  videoUrl: z.string().url().max(2048).optional().or(z.literal('')),
  shortDescription: z.string().trim().max(500).optional(),
  description: z.string().trim().max(5000).optional(),
}).strict();

type CreateUnitBody = z.infer<typeof CreateUnitSchema>;

function setSecurityHeaders(res: NextApiResponse, isPublic: boolean): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', isPublic
    ? 'public, s-maxage=30, stale-while-revalidate=120'
    : 'no-store, max-age=0');
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

function normalizeId(v: string | string[] | undefined): string {
  return Array.isArray(v) ? String(v[0] ?? '').trim() : String(v ?? '').trim();
}

function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : def;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function areaAliases(area: unknown, areaUnit: unknown): { areaSqft?: number; areaMarla?: number } {
  const n = typeof area === 'number' ? area : Number(area);
  if (!Number.isFinite(n)) return {};
  const unit = String(areaUnit ?? '').toLowerCase().replace(/\s+/g, '');
  if (unit.includes('marla')) return { areaMarla: n };
  if (unit.includes('sq.ft') || unit.includes('sqft') || unit.includes('sq.ft.')) return { areaSqft: n };
  return {};
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

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const method = (req.method ?? '').toUpperCase();
  if (!['GET', 'POST'].includes(method)) {
    setSecurityHeaders(res, false);
    res.setHeader('Allow', ['GET', 'POST']);
    return void res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  setSecurityHeaders(res, method === 'GET');
  const rl = await (method === 'POST' ? rateLimitPropertyCreate(req) : rateLimitApi(req));
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  const idOrSlug = normalizeId(req.query.id as string | string[] | undefined);
  if (!idOrSlug) return void res.status(400).json({ success: false, message: 'Project ID or slug is required.' });

  await dbConnect();
  if (method === 'GET') return void handleGet(req, res, idOrSlug);
  return void handlePost(req, res, idOrSlug);
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, idOrSlug: string): Promise<void> {
  const viewer = await getOptionalAuth(req);
  const project = await resolveProject(idOrSlug);
  if (!project) return void res.status(404).json({ success: false, message: 'Project not found.' });

  const isAdmin = !!viewer && ['admin', 'superadmin'].includes(viewer.role);
  const isOwner = !!viewer && viewer.role === 'developer' && String(project.developerId) === viewer.id;
  const publicAllowed = isProjectPublic(project);
  if (!publicAllowed && !isAdmin && !isOwner) {
    return void res.status(404).json({ success: false, message: 'Project not found.' });
  }

  const page = clampInt(req.query.page, 1, 1, 1_000_000);
  const limit = clampInt(req.query.limit, 25, 1, 200);
  const q = String(req.query.q ?? '').trim().slice(0, 60);
  const status = String(req.query.status ?? '').trim().toLowerCase();
  const unitType = String(req.query.unitType ?? '').trim().slice(0, 80);
  const floorRaw = String(req.query.floor ?? req.query.floorNumber ?? '').trim();

  const filter: Record<string, unknown> = {
    projectId: project._id,
    isDeleted: { $ne: true },
  };

  if (!isAdmin && !isOwner) {
    filter.isPublished = true;
    filter.status = status && ['available', 'reserved', 'sold', 'on_hold', 'cancelled'].includes(status)
      ? status
      : 'available';
  } else if (status && ['available', 'reserved', 'sold', 'on_hold', 'cancelled'].includes(status)) {
    filter.status = status;
  }

  if (unitType) filter.unitType = unitType;
  if (floorRaw && Number.isFinite(Number(floorRaw))) filter.floorNumber = Math.trunc(Number(floorRaw));
  if (q) {
    const rx = new RegExp(escapeRegExp(q), 'i');
    filter.$or = [{ unitNumber: rx }, { title: rx }, { unitType: rx }, { floorName: rx }];
  }

  const skip = (page - 1) * limit;
  const [rows, total, statsAgg] = await Promise.all([
    Unit.find(filter)
      .select([
        '_id', 'unitNumber', 'floorNumber', 'floorName', 'category', 'unitType',
        'listingType', 'price', 'area', 'areaUnit', 'status', 'bedrooms', 'bathrooms',
        'facing', 'view', 'images', 'projectSlug', 'projectName', 'city', 'areaName',
        'developerBadge', 'isPublished', 'createdAt', 'updatedAt',
      ].join(' '))
      .sort({ floorNumber: 1, unitNumber: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Unit.countDocuments(filter),
    Unit.aggregate([
      { $match: {
        projectId: project._id,
        isDeleted: { $ne: true },
        ...(!isAdmin && !isOwner ? { isPublished: true } : {}),
      } },
      { $group: {
        _id: null,
        totalUnits: { $sum: 1 },
        availableUnits: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
        reservedUnits: { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
        soldUnits: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
        onHoldUnits: { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      } },
    ]),
  ]);

  const units = (rows as Array<Record<string, unknown>>).map((u) => ({
    ...u,
    ...areaAliases(u.area, u.areaUnit),
    priceFormatted: typeof u.price === 'number' ? formatPKR(u.price) : null,
  }));

  const stats = statsAgg[0] ?? {
    totalUnits: 0, availableUnits: 0, reservedUnits: 0, soldUnits: 0,
    onHoldUnits: 0, minPrice: 0, maxPrice: 0,
  };
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const projectInfo = {
    _id: String(project._id),
    slug: project.slug ?? '',
    projectName: project.projectName ?? '',
    city: project.city ?? '',
    area: project.area ?? '',
    areaName: project.area ?? '',
  };
  const pagination = { total, page, limit, totalPages, hasMore: page < totalPages };

  // Keep both response shapes temporarily so old public pages and the current
  // developer dashboard remain synchronized during the migration.
  return void res.status(200).json({
    success: true,
    units,
    stats,
    project: projectInfo,
    totalPages,
    currentPage: page,
    totalCount: total,
    pagination,
    data: { units, stats, project: projectInfo, pagination },
  });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, idOrSlug: string): Promise<void> {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const isAdmin = ['admin', 'superadmin'].includes(auth.role);
  if (!isAdmin && auth.role !== 'developer') {
    return void res.status(403).json({ success: false, message: 'Only developers can add units.' });
  }

  const project = await resolveProject(idOrSlug);
  if (!project) return void res.status(404).json({ success: false, message: 'Project not found.' });
  if (!isAdmin && String(project.developerId) !== auth.id) {
    return void res.status(404).json({ success: false, message: 'Project not found.' });
  }
  if (!isAdmin && String(project.status ?? 'draft') === 'draft') {
    return void res.status(409).json({
      success: false,
      message: 'Submit your project for review before adding units.',
      code: 'PROJECT_DRAFT',
    });
  }

  const parsed = CreateUnitSchema.safeParse(req.body);
  if (!parsed.success) {
    return void res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }
  const data: CreateUnitBody = parsed.data;

  const duplicate = await Unit.exists({
    projectId: project._id,
    unitNumber: data.unitNumber,
    isDeleted: { $ne: true },
  });
  if (duplicate) {
    return void res.status(409).json({ success: false, message: `Unit number "${data.unitNumber}" already exists.` });
  }

  const mediaRefs = [...(data.images ?? []), ...(data.floorPlan ? [data.floorPlan] : []), ...(data.floorPlanImage ? [data.floorPlanImage] : [])];
  if (mediaRefs.some((m) => !isHighrisePublicId(m.publicId))) {
    return void res.status(400).json({ success: false, message: 'All media must be uploaded through Highrise first.' });
  }

  const floorPlanImage = data.floorPlanImage ?? data.floorPlan;
  const unit = await Unit.create({
    projectId: project._id,
    developerId: project.developerId,
    projectSlug: project.slug,
    projectName: project.projectName,
    city: project.city,
    areaName: project.area,
    developerBadge: project.developerBadge,

    unitNumber: data.unitNumber,
    category: data.category,
    unitType: data.unitType,
    floorNumber: data.floorNumber,
    floorName: data.floorName,
    tower: data.tower,
    wing: data.wing,
    building: data.building,
    area: data.area,
    areaUnit: data.areaUnit,
    coveredArea: data.coveredArea,
    carpetArea: data.carpetArea,
    balconyArea: data.balconyArea,
    terraceArea: data.terraceArea,
    frontWidth: data.frontWidth,
    depth: data.depth,
    hasMezzanine: data.hasMezzanine,
    mezzanineArea: data.mezzanineArea,
    price: data.price,
    priceNegotiable: data.priceNegotiable,
    listingType: data.listingType,
    installmentPlan: data.installmentPlan,
    charges: data.charges,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    balconies: data.balconies,
    servantQuarter: data.servantQuarter,
    storeRoom: data.storeRoom,
    laundryArea: data.laundryArea,
    washroom: data.washroom,
    finishingLevel: data.finishingLevel,
    isCorner: data.isCorner,
    facing: data.facing,
    view: data.view,
    isParkFacing: data.isParkFacing,
    isRoadFacing: data.isRoadFacing,
    parkingIncluded: data.parkingIncluded,
    parkingSpaces: data.parkingSpaces,
    parkingType: data.parkingType,
    features: data.features,
    investorIntelligence: data.investorIntelligence,
    images: data.images,
    floorPlanImage,
    virtualTourUrl: data.virtualTourUrl || undefined,
    videoUrl: data.videoUrl || undefined,
    shortDescription: data.shortDescription,
    description: data.description,
    status: 'available',
    isPublished: false,
    isVerified: false,
    isDeleted: false,
  });

  await syncUnitTypeBreakdown(String(project._id)).catch(() => undefined);
  await logSecurityEvent({
    type: 'project_created',
    severity: 'low',
    userId: auth.id,
    ip: getClientIp(req),
    metadata: {
      action: 'unit_created',
      unitId: String(unit._id),
      unitNumber: unit.unitNumber,
      projectId: String(project._id),
    },
    req,
  });

  return void res.status(201).json({
    success: true,
    message: 'Unit created successfully and is awaiting publication review.',
    unit: {
      _id: String(unit._id),
      unitNumber: unit.unitNumber,
      unitType: unit.unitType,
      status: unit.status,
      price: unit.price,
      priceFormatted: formatPKR(unit.price),
      createdAt: unit.createdAt,
    },
  });
}
