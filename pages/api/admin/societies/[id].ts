// pages/api/admin/societies/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Society from '@/models/Society';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, setRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

// ─── Local Mongoose Doc Shapes (for .lean() results) ─────────────────────────

interface SocietyAdminFullDoc {
  _id: { toString(): string };
  name: string;
  slug: string;
  alternateNames?: string[];
  category: string;
  description?: string;
  city: string;
  areaName: string;
  fullAddress?: string;
  coordinates?: { type: 'Point'; coordinates: [number, number] };
  nocStatus: string;
  nocNumber?: string;
  nocDate?: Date;
  nocExpiryDate?: Date;
  approvalAuthority: string;
  developmentAuthority?: string;
  registrationNo?: string;
  litigationStatus: string;
  litigationNote?: string;
  overallRiskLevel: string;
  riskAlerts?: Array<{
    _id?: { toString(): string };
    severity: string;
    title: string;
    message: string;
    issuedBy?: string;
    referenceNo?: string;
    date: Date;
    isResolved: boolean;
    resolvedAt?: Date;
    resolvedNote?: string;
  }>;
  scores?: {
    legal?: number;
    growth?: number;
    possession?: number;
    infrastructure?: number;
    livability?: number;
    overall?: number;
  };
  infrastructureDetails?: {
    electricity?: number;
    gas?: number;
    water?: number;
    sewerage?: number;
    internet?: number;
    roads?: number;
  };
  livabilityDetails?: {
    schools?: number;
    hospitals?: number;
    markets?: number;
    transport?: number;
    security?: number;
    parks?: number;
  };
  blockRates?: Array<{
    _id?: { toString(): string };
    blockName: string;
    plotSize: string;
    minPrice: number;
    maxPrice: number;
    pricePerMarla?: number;
    lastUpdated: Date;
  }>;
  priceChangeYoY?: number;
  rentalYield?: number;
  featuredImage?: string;
  images?: string[];
  documents?: Array<{
    _id?: { toString(): string };
    title: string;
    url: string;
    type: string;
    uploadedAt: Date;
  }>;
  developerName?: string;
  developerWebsite?: string;
  totalPlots?: number;
  totalPhases?: number;
  launchYear?: number;
  expectedCompletionYear?: number;
  possessionPercentage?: number;
  isVerifiedByHighrise?: boolean;
  isPublished?: boolean;
  isFeatured?: boolean;
  viewCount?: number;
  searchCount?: number;
  lastVerifiedAt?: Date;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Response Types ──────────────────────────────────────────────────────────

interface DetailResponse {
  success: boolean;
  data?: { society: SocietyAdminDetail };
  error?: string;
}

interface UpdateResponse {
  success: boolean;
  data?: { society: { _id: string; name: string; slug: string } };
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

interface DeleteResponse {
  success: boolean;
  data?: { _id: string; action: 'soft_deleted' | 'hard_deleted' };
  error?: string;
}

interface SocietyAdminDetail {
  _id: string;
  name: string;
  slug: string;
  alternateNames: string[];
  category: string;
  description?: string;
  city: string;
  areaName: string;
  fullAddress?: string;
  coordinates?: { type: 'Point'; coordinates: [number, number] };
  nocStatus: string;
  nocNumber?: string;
  nocDate?: string;
  nocExpiryDate?: string;
  approvalAuthority: string;
  developmentAuthority?: string;
  registrationNo?: string;
  litigationStatus: string;
  litigationNote?: string;
  overallRiskLevel: string;
  riskAlerts: Array<{
    _id: string;
    severity: string;
    title: string;
    message: string;
    issuedBy?: string;
    referenceNo?: string;
    date: string;
    isResolved: boolean;
    resolvedAt?: string;
    resolvedNote?: string;
  }>;
  scores: {
    legal: number;
    growth: number;
    possession: number;
    infrastructure: number;
    livability: number;
    overall: number;
  };
  infrastructureDetails: {
    electricity: number;
    gas: number;
    water: number;
    sewerage: number;
    internet: number;
    roads: number;
  };
  livabilityDetails: {
    schools: number;
    hospitals: number;
    markets: number;
    transport: number;
    security: number;
    parks: number;
  };
  blockRates: Array<{
    _id: string;
    blockName: string;
    plotSize: string;
    minPrice: number;
    maxPrice: number;
    pricePerMarla?: number;
    lastUpdated: string;
  }>;
  priceChangeYoY?: number;
  rentalYield?: number;
  featuredImage?: string;
  images: string[];
  documents: Array<{
    _id: string;
    title: string;
    url: string;
    type: string;
    uploadedAt: string;
  }>;
  developerName?: string;
  developerWebsite?: string;
  totalPlots?: number;
  totalPhases?: number;
  launchYear?: number;
  expectedCompletionYear?: number;
  possessionPercentage?: number;
  isVerifiedByHighrise: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  searchCount: number;
  lastVerifiedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Validation Schemas ──────────────────────────────────────────────────────

const NOC_STATUSES = [
  'approved',
  'pending',
  'under_review',
  'illegal',
  'disputed',
  'cancelled',
  'expired',
] as const;

const AUTHORITIES = [
  'LDA',
  'CDA',
  'RDA',
  'KDA',
  'FDA',
  'MDA',
  'GDA',
  'DHA',
  'PHATA',
  'NHA',
  'NADRA',
  'Other',
] as const;

const CATEGORIES = [
  'housing_scheme',
  'gated_community',
  'apartment_complex',
  'commercial_zone',
  'mixed_use',
  'industrial_zone',
  'township',
] as const;

const LITIGATION_STATUSES = ['none', 'active', 'resolved'] as const;
const ALERT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const DOC_TYPES = ['noc', 'map', 'master_plan', 'court_order', 'approval_letter', 'other'] as const;

const updateSocietySchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    alternateNames: z.array(z.string().trim().max(200)).max(10).optional(),
    category: z.enum(CATEGORIES).optional(),
    description: z.string().trim().max(5000).optional(),

    city: z.string().trim().min(2).max(100).optional(),
    areaName: z.string().trim().min(2).max(200).optional(),
    fullAddress: z.string().trim().max(500).optional(),
    coordinates: z
      .object({
        longitude: z.number().min(-180).max(180),
        latitude: z.number().min(-90).max(90),
      })
      .optional(),

    nocStatus: z.enum(NOC_STATUSES).optional(),
    nocNumber: z.string().trim().max(100).optional(),
    nocDate: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
    nocExpiryDate: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
    approvalAuthority: z.enum(AUTHORITIES).optional(),
    developmentAuthority: z.string().trim().max(200).optional(),
    registrationNo: z.string().trim().max(100).optional(),
    litigationStatus: z.enum(LITIGATION_STATUSES).optional(),
    litigationNote: z.string().trim().max(2000).optional(),

    developerName: z.string().trim().max(200).optional(),
    developerWebsite: z.string().trim().url().max(300).optional().or(
      z.literal('').transform(() => undefined)
    ),

    totalPlots: z.number().int().min(0).optional(),
    totalPhases: z.number().int().min(0).max(50).optional(),
    launchYear: z.number().int().min(1900).max(2100).optional(),
    expectedCompletionYear: z.number().int().min(1900).max(2100).optional(),
    possessionPercentage: z.number().min(0).max(100).optional(),

    scores: z
      .object({
        growth: z.number().int().min(0).max(100).optional(),
        possession: z.number().int().min(0).max(100).optional(),
      })
      .optional(),

    infrastructureDetails: z
      .object({
        electricity: z.number().int().min(0).max(100).optional(),
        gas: z.number().int().min(0).max(100).optional(),
        water: z.number().int().min(0).max(100).optional(),
        sewerage: z.number().int().min(0).max(100).optional(),
        internet: z.number().int().min(0).max(100).optional(),
        roads: z.number().int().min(0).max(100).optional(),
      })
      .optional(),

    livabilityDetails: z
      .object({
        schools: z.number().int().min(0).max(100).optional(),
        hospitals: z.number().int().min(0).max(100).optional(),
        markets: z.number().int().min(0).max(100).optional(),
        transport: z.number().int().min(0).max(100).optional(),
        security: z.number().int().min(0).max(100).optional(),
        parks: z.number().int().min(0).max(100).optional(),
      })
      .optional(),

    priceChangeYoY: z.number().optional(),
    rentalYield: z.number().min(0).max(100).optional(),

    featuredImage: z.string().trim().url().optional().or(z.literal('').transform(() => undefined)),
    images: z.array(z.string().trim().url()).max(20).optional(),

    isVerifiedByHighrise: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),

    seoTitle: z.string().trim().max(160).optional(),
    seoDescription: z.string().trim().max(320).optional(),

    // ─── Risk Alerts ─────
    addRiskAlert: z
      .object({
        severity: z.enum(ALERT_SEVERITIES),
        title: z.string().trim().min(2).max(200),
        message: z.string().trim().min(5).max(2000),
        issuedBy: z.string().trim().max(200).optional(),
        referenceNo: z.string().trim().max(100).optional(),
      })
      .optional(),

    resolveRiskAlert: z
      .object({
        alertId: z.string().min(1),
        resolvedNote: z.string().trim().max(2000).optional(),
      })
      .optional(),

    removeRiskAlert: z.string().min(1).optional(),

    // ─── Documents ─────
    addDocument: z
      .object({
        title: z.string().trim().min(2).max(200),
        url: z.string().trim().url(),
        type: z.enum(DOC_TYPES),
      })
      .optional(),

    removeDocument: z.string().min(1).optional(),

    // ─── Block Rates ─────
    addBlockRate: z
      .object({
        blockName: z.string().trim().min(1).max(100),
        plotSize: z.string().trim().min(1).max(100),
        minPrice: z.number().min(0),
        maxPrice: z.number().min(0),
        pricePerMarla: z.number().min(0).optional(),
      })
      .optional(),

    removeBlockRate: z.string().min(1).optional(),
  })
  .strict();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(date: Date | undefined | null): string | undefined {
  if (!date) return undefined;
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

function transformToDetail(s: SocietyAdminFullDoc): SocietyAdminDetail {
  return {
    _id: s._id.toString(),
    name: s.name,
    slug: s.slug,
    alternateNames: s.alternateNames ?? [],
    category: s.category,
    description: s.description,
    city: s.city,
    areaName: s.areaName,
    fullAddress: s.fullAddress,
    coordinates: s.coordinates,
    nocStatus: s.nocStatus,
    nocNumber: s.nocNumber,
    nocDate: toISO(s.nocDate),
    nocExpiryDate: toISO(s.nocExpiryDate),
    approvalAuthority: s.approvalAuthority,
    developmentAuthority: s.developmentAuthority,
    registrationNo: s.registrationNo,
    litigationStatus: s.litigationStatus,
    litigationNote: s.litigationNote,
    overallRiskLevel: s.overallRiskLevel,
    riskAlerts: (s.riskAlerts ?? []).map((a) => ({
      _id: a._id ? a._id.toString() : '',
      severity: a.severity,
      title: a.title,
      message: a.message,
      issuedBy: a.issuedBy,
      referenceNo: a.referenceNo,
      date: toISO(a.date) || new Date().toISOString(),
      isResolved: a.isResolved,
      resolvedAt: toISO(a.resolvedAt),
      resolvedNote: a.resolvedNote,
    })),
    scores: {
      legal: s.scores?.legal ?? 0,
      growth: s.scores?.growth ?? 0,
      possession: s.scores?.possession ?? 0,
      infrastructure: s.scores?.infrastructure ?? 0,
      livability: s.scores?.livability ?? 0,
      overall: s.scores?.overall ?? 0,
    },
    infrastructureDetails: {
      electricity: s.infrastructureDetails?.electricity ?? 0,
      gas: s.infrastructureDetails?.gas ?? 0,
      water: s.infrastructureDetails?.water ?? 0,
      sewerage: s.infrastructureDetails?.sewerage ?? 0,
      internet: s.infrastructureDetails?.internet ?? 0,
      roads: s.infrastructureDetails?.roads ?? 0,
    },
    livabilityDetails: {
      schools: s.livabilityDetails?.schools ?? 0,
      hospitals: s.livabilityDetails?.hospitals ?? 0,
      markets: s.livabilityDetails?.markets ?? 0,
      transport: s.livabilityDetails?.transport ?? 0,
      security: s.livabilityDetails?.security ?? 0,
      parks: s.livabilityDetails?.parks ?? 0,
    },
    blockRates: (s.blockRates ?? []).map((b) => ({
      _id: b._id ? b._id.toString() : '',
      blockName: b.blockName,
      plotSize: b.plotSize,
      minPrice: b.minPrice,
      maxPrice: b.maxPrice,
      pricePerMarla: b.pricePerMarla,
      lastUpdated: toISO(b.lastUpdated) || new Date().toISOString(),
    })),
    priceChangeYoY: s.priceChangeYoY,
    rentalYield: s.rentalYield,
    featuredImage: s.featuredImage,
    images: s.images ?? [],
    documents: (s.documents ?? []).map((d) => ({
      _id: d._id ? d._id.toString() : '',
      title: d.title,
      url: d.url,
      type: d.type,
      uploadedAt: toISO(d.uploadedAt) || new Date().toISOString(),
    })),
    developerName: s.developerName,
    developerWebsite: s.developerWebsite,
    totalPlots: s.totalPlots,
    totalPhases: s.totalPhases,
    launchYear: s.launchYear,
    expectedCompletionYear: s.expectedCompletionYear,
    possessionPercentage: s.possessionPercentage,
    isVerifiedByHighrise: Boolean(s.isVerifiedByHighrise),
    isPublished: Boolean(s.isPublished),
    isFeatured: Boolean(s.isFeatured),
    viewCount: s.viewCount ?? 0,
    searchCount: s.searchCount ?? 0,
    lastVerifiedAt: toISO(s.lastVerifiedAt),
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    createdAt: toISO(s.createdAt) || new Date().toISOString(),
    updatedAt: toISO(s.updatedAt) || new Date().toISOString(),
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DetailResponse | UpdateResponse | DeleteResponse>
): Promise<void> {
  // ── Rate limit (First) ───────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);

  if (!rl.ok) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again shortly.',
    });
    return;
  }

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // Validate ID
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  if (!id || typeof id !== 'string' || !isValidObjectId(id)) {
    res.status(400).json({ success: false, error: 'Invalid society identifier' });
    return;
  }

  try {
    await dbConnect();

    if (req.method === 'GET') {
      await handleGet(req, res, id);
      return;
    }

    if (req.method === 'PATCH') {
      await handlePatch(req, res, id, auth.id);
      return;
    }

    if (req.method === 'DELETE') {
      await handleDelete(req, res, id, auth.id);
      return;
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await logSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      userId: auth.id,
      ip: getClientIp(req),
      req,
      metadata: {
        endpoint: `/api/admin/societies/${id}`,
        method: req.method,
        errorMessage: `Admin society [id] handler failed: ${errorMessage}`,
      },
    }).catch(() => {
      // silent
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.',
    });
  }
}

// ─── GET: Single society detail ──────────────────────────────────────────────

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<DetailResponse>,
  id: string
): Promise<void> {
  const doc = await Society.findById(id).lean();

  if (!doc) {
    res.status(404).json({ success: false, error: 'Society not found' });
    return;
  }

  const society = doc as unknown as SocietyAdminFullDoc;

  res.status(200).json({
    success: true,
    data: { society: transformToDetail(society) },
  });
}

// ─── PATCH: Update society (partial + sub-operations) ───────────────────────

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse>,
  id: string,
  adminId: string
): Promise<void> {
  // Validate body
  const parsed = updateSocietySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
    return;
  }

  const data = parsed.data;

  // Find society
  const society = await Society.findById(id);
  if (!society) {
    res.status(404).json({ success: false, error: 'Society not found' });
    return;
  }

  // Track what changed for audit
  const changes: string[] = [];

  // ─── Field updates ────────────────────────────────────────────────────────

  const directFields: Array<keyof typeof data> = [
    'name', 'alternateNames', 'category', 'description',
    'city', 'areaName', 'fullAddress',
    'nocStatus', 'nocNumber', 'approvalAuthority',
    'developmentAuthority', 'registrationNo',
    'litigationStatus', 'litigationNote',
    'developerName', 'developerWebsite',
    'totalPlots', 'totalPhases', 'launchYear',
    'expectedCompletionYear', 'possessionPercentage',
    'priceChangeYoY', 'rentalYield',
    'featuredImage', 'images',
    'isFeatured', 'seoTitle', 'seoDescription',
  ];

  for (const field of directFields) {
    if (data[field] !== undefined) {
      (society as unknown as Record<string, unknown>)[field as string] = data[field];
      changes.push(field as string);
    }
  }

  // Date fields
  if (data.nocDate !== undefined) {
    (society as unknown as { nocDate?: Date }).nocDate = data.nocDate ? new Date(data.nocDate) : undefined;
    changes.push('nocDate');
  }
  if (data.nocExpiryDate !== undefined) {
    (society as unknown as { nocExpiryDate?: Date }).nocExpiryDate = data.nocExpiryDate ? new Date(data.nocExpiryDate) : undefined;
    changes.push('nocExpiryDate');
  }

  // Coordinates → GeoJSON
  if (data.coordinates) {
    (society as unknown as { coordinates: unknown }).coordinates = {
      type: 'Point',
      coordinates: [data.coordinates.longitude, data.coordinates.latitude],
    };
    changes.push('coordinates');
  }

  // Nested score updates (preserve auto-calculated fields)
  if (data.scores) {
    const currentScores = (society as unknown as { scores: Record<string, number> }).scores || {};
    if (data.scores.growth !== undefined) currentScores.growth = data.scores.growth;
    if (data.scores.possession !== undefined) currentScores.possession = data.scores.possession;
    (society as unknown as { scores: Record<string, number> }).scores = currentScores;
    changes.push('scores');
  }

  if (data.infrastructureDetails) {
    const current = (society as unknown as { infrastructureDetails: Record<string, number> }).infrastructureDetails || {};
    Object.assign(current, data.infrastructureDetails);
    (society as unknown as { infrastructureDetails: Record<string, number> }).infrastructureDetails = current;
    changes.push('infrastructureDetails');
  }

  if (data.livabilityDetails) {
    const current = (society as unknown as { livabilityDetails: Record<string, number> }).livabilityDetails || {};
    Object.assign(current, data.livabilityDetails);
    (society as unknown as { livabilityDetails: Record<string, number> }).livabilityDetails = current;
    changes.push('livabilityDetails');
  }

  // Verification flag (auto-set lastVerifiedAt)
  if (data.isVerifiedByHighrise !== undefined) {
    (society as unknown as { isVerifiedByHighrise: boolean }).isVerifiedByHighrise = data.isVerifiedByHighrise;
    if (data.isVerifiedByHighrise) {
      (society as unknown as { lastVerifiedAt: Date }).lastVerifiedAt = new Date();
    }
    changes.push('isVerifiedByHighrise');
  }

  if (data.isPublished !== undefined) {
    (society as unknown as { isPublished: boolean }).isPublished = data.isPublished;
    changes.push('isPublished');
  }

  // ─── Sub-operations: Risk Alerts ─────────────────────────────────────────

  if (data.addRiskAlert) {
    const alerts = (society as unknown as { riskAlerts: unknown[] }).riskAlerts || [];
    alerts.push({
      severity: data.addRiskAlert.severity,
      title: data.addRiskAlert.title,
      message: data.addRiskAlert.message,
      issuedBy: data.addRiskAlert.issuedBy,
      referenceNo: data.addRiskAlert.referenceNo,
      date: new Date(),
      isResolved: false,
    });
    (society as unknown as { riskAlerts: unknown[] }).riskAlerts = alerts;
    changes.push('addRiskAlert');
  }

  if (data.resolveRiskAlert) {
    const alerts = (society as unknown as {
      riskAlerts: Array<{
        _id?: { toString(): string };
        isResolved: boolean;
        resolvedAt?: Date;
        resolvedNote?: string;
      }>;
    }).riskAlerts || [];

    const alert = alerts.find((a) => a._id && a._id.toString() === data.resolveRiskAlert!.alertId);
    if (alert) {
      alert.isResolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedNote = data.resolveRiskAlert.resolvedNote;
      changes.push('resolveRiskAlert');
    }
  }

  if (data.removeRiskAlert) {
    const alerts = (society as unknown as {
      riskAlerts: Array<{ _id?: { toString(): string } }>;
    }).riskAlerts || [];
    const filtered = alerts.filter(
      (a) => !a._id || a._id.toString() !== data.removeRiskAlert
    );
    (society as unknown as { riskAlerts: unknown[] }).riskAlerts = filtered;
    changes.push('removeRiskAlert');
  }

  // ─── Sub-operations: Documents ───────────────────────────────────────────

  if (data.addDocument) {
    const docs = (society as unknown as { documents: unknown[] }).documents || [];
    docs.push({
      title: data.addDocument.title,
      url: data.addDocument.url,
      type: data.addDocument.type,
      uploadedAt: new Date(),
    });
    (society as unknown as { documents: unknown[] }).documents = docs;
    changes.push('addDocument');
  }

  if (data.removeDocument) {
    const docs = (society as unknown as {
      documents: Array<{ _id?: { toString(): string } }>;
    }).documents || [];
    const filtered = docs.filter(
      (d) => !d._id || d._id.toString() !== data.removeDocument
    );
    (society as unknown as { documents: unknown[] }).documents = filtered;
    changes.push('removeDocument');
  }

  // ─── Sub-operations: Block Rates ─────────────────────────────────────────

  if (data.addBlockRate) {
    const rates = (society as unknown as { blockRates: unknown[] }).blockRates || [];
    rates.push({
      blockName: data.addBlockRate.blockName,
      plotSize: data.addBlockRate.plotSize,
      minPrice: data.addBlockRate.minPrice,
      maxPrice: data.addBlockRate.maxPrice,
      pricePerMarla: data.addBlockRate.pricePerMarla,
      lastUpdated: new Date(),
    });
    (society as unknown as { blockRates: unknown[] }).blockRates = rates;
    changes.push('addBlockRate');
  }

  if (data.removeBlockRate) {
    const rates = (society as unknown as {
      blockRates: Array<{ _id?: { toString(): string } }>;
    }).blockRates || [];
    const filtered = rates.filter(
      (b) => !b._id || b._id.toString() !== data.removeBlockRate
    );
    (society as unknown as { blockRates: unknown[] }).blockRates = filtered;
    changes.push('removeBlockRate');
  }

  // ─── Save (triggers pre-save hooks for auto-score recalculation) ────────

  await society.save();

  // Audit log
  await logSecurityEvent({
    type: 'admin_action',
    severity: 'low',
    userId: adminId,
    ip: getClientIp(req),
    req,
    metadata: {
      action: 'society_updated',
      societyId: id,
      societyName: (society as unknown as { name: string }).name,
      changedFields: changes,
    },
  }).catch(() => {
    // silent
  });

  res.status(200).json({
    success: true,
    data: {
      society: {
        _id: id,
        name: (society as unknown as { name: string }).name,
        slug: (society as unknown as { slug: string }).slug,
      },
    },
  });
}

// ─── DELETE: Soft delete (unpublish) or hard delete ─────────────────────────

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<DeleteResponse>,
  id: string,
  adminId: string
): Promise<void> {
  const { hard } = req.query;
  const isHardDelete = hard === 'true';

  const society = await Society.findById(id);
  if (!society) {
    res.status(404).json({ success: false, error: 'Society not found' });
    return;
  }

  const societyName = (society as unknown as { name: string }).name;

  if (isHardDelete) {
    await Society.deleteOne({ _id: id });

    await logSecurityEvent({
      type: 'admin_action',
      severity: 'high',
      userId: adminId,
      ip: getClientIp(req),
      req,
      metadata: {
        action: 'society_hard_deleted',
        societyId: id,
        societyName,
      },
    }).catch(() => {
      // silent
    });

    res.status(200).json({
      success: true,
      data: { _id: id, action: 'hard_deleted' },
    });
    return;
  }

  // Soft delete: unpublish + unverify
  (society as unknown as { isPublished: boolean }).isPublished = false;
  (society as unknown as { isFeatured: boolean }).isFeatured = false;
  await society.save();

  await logSecurityEvent({
    type: 'admin_action',
    severity: 'medium',
    userId: adminId,
    ip: getClientIp(req),
    req,
    metadata: {
      action: 'society_soft_deleted',
      societyId: id,
      societyName,
    },
  }).catch(() => {
    // silent
  });

  res.status(200).json({
    success: true,
    data: { _id: id, action: 'soft_deleted' },
  });
}