// pages/api/admin/societies/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import Society from '@/models/Society';
import { requireAdmin } from '@/lib/requireAuth';
import { rateLimitAdmin, setRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import type { FilterQuery } from 'mongoose';

// ─── Local Mongoose Doc Shapes (for .lean() results) ─────────────────────────

interface SocietyAdminDoc {
  _id: { toString(): string };
  name: string;
  slug: string;
  city: string;
  areaName: string;
  category: string;
  nocStatus: string;
  approvalAuthority: string;
  overallRiskLevel: string;
  scores?: {
    legal?: number;
    growth?: number;
    overall?: number;
  };
  featuredImage?: string;
  isVerifiedByHighrise?: boolean;
  isPublished?: boolean;
  isFeatured?: boolean;
  viewCount?: number;
  searchCount?: number;
  riskAlerts?: Array<{ isResolved: boolean }>;
  developerName?: string;
  lastVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Response Types ──────────────────────────────────────────────────────────

interface SocietyAdminListItem {
  _id: string;
  name: string;
  slug: string;
  city: string;
  areaName: string;
  category: string;
  nocStatus: string;
  approvalAuthority: string;
  overallRiskLevel: string;
  legalScore: number;
  growthScore: number;
  overallScore: number;
  featuredImage?: string;
  isVerifiedByHighrise: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  searchCount: number;
  activeAlertCount: number;
  developerName?: string;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  success: boolean;
  data?: {
    societies: SocietyAdminListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats: {
      total: number;
      published: number;
      verified: number;
      pending: number;
      flagged: number;
    };
  };
  error?: string;
}

interface CreateResponse {
  success: boolean;
  data?: {
    society: {
      _id: string;
      name: string;
      slug: string;
      city: string;
      nocStatus: string;
    };
  };
  error?: string;
  fieldErrors?: Record<string, string[]>;
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

const createSocietySchema = z
  .object({
    // Core
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(200),
    alternateNames: z.array(z.string().trim().max(200)).max(10).optional(),
    category: z.enum(CATEGORIES).default('housing_scheme'),
    description: z.string().trim().max(5000).optional(),

    // Location
    city: z.string().trim().min(2, 'City is required').max(100),
    areaName: z.string().trim().min(2, 'Area name is required').max(200),
    fullAddress: z.string().trim().max(500).optional(),
    coordinates: z
      .object({
        longitude: z.number().min(-180).max(180),
        latitude: z.number().min(-90).max(90),
      })
      .optional(),

    // Legal
    nocStatus: z.enum(NOC_STATUSES).default('pending'),
    nocNumber: z.string().trim().max(100).optional(),
    nocDate: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
    nocExpiryDate: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
    approvalAuthority: z.enum(AUTHORITIES),
    developmentAuthority: z.string().trim().max(200).optional(),
    registrationNo: z.string().trim().max(100).optional(),
    litigationStatus: z.enum(LITIGATION_STATUSES).default('none'),
    litigationNote: z.string().trim().max(2000).optional(),

    // Developer
    developerName: z.string().trim().max(200).optional(),
    developerWebsite: z.string().trim().url('Invalid URL').max(300).optional().or(
      z.literal('').transform(() => undefined)
    ),

    // Stats
    totalPlots: z.number().int().min(0).optional(),
    totalPhases: z.number().int().min(0).max(50).optional(),
    launchYear: z.number().int().min(1900).max(2100).optional(),
    expectedCompletionYear: z.number().int().min(1900).max(2100).optional(),
    possessionPercentage: z.number().min(0).max(100).optional(),

    // Scores (admin can override)
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

    // Media
    featuredImage: z.string().trim().url().optional().or(z.literal('').transform(() => undefined)),
    images: z.array(z.string().trim().url()).max(20).optional(),

    // Platform flags
    isVerifiedByHighrise: z.boolean().optional().default(false),
    isPublished: z.boolean().optional().default(false),
    isFeatured: z.boolean().optional().default(false),

    // SEO
    seoTitle: z.string().trim().max(160).optional(),
    seoDescription: z.string().trim().max(320).optional(),
  })
  .strict();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 120);
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  const baseSlug = slugify(baseName);
  if (!baseSlug) {
    return `society-${Date.now().toString(36)}`;
  }

  const existing = await Society.findOne({ slug: baseSlug }).select('_id').lean();
  if (!existing) return baseSlug;

  // Append short suffix
  return `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
}

function toISO(date: Date | undefined | null): string | undefined {
  if (!date) return undefined;
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | CreateResponse>
): Promise<void> {
  // Admin auth check
  const auth = await requireAdmin(req, res);
  if (!auth) return; // requireAdmin already sent response

  // Rate limit
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);

  if (!rl.ok) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again shortly.',
    });
    return;
  }

  try {
    await dbConnect();

    if (req.method === 'GET') {
      await handleList(req, res);
      return;
    }

    if (req.method === 'POST') {
      await handleCreate(req, res, auth.id);
      return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
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
        endpoint: '/api/admin/societies',
        method: req.method,
        errorMessage: `Admin society handler failed: ${errorMessage}`,
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

// ─── GET: List societies ──────────────────────────────────────────────────────

async function handleList(req: NextApiRequest, res: NextApiResponse<ListResponse>): Promise<void> {
  const {
    search = '',
    city = '',
    nocStatus = '',
    riskLevel = '',
    isPublished = '',
    isVerified = '',
    isFeatured = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '20',
  } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  // Build filter (NO isPublished default — admin sees ALL)
  const filter: FilterQuery<Record<string, unknown>> = {};

  const searchStr = String(search).trim();
  if (searchStr.length > 0) {
    filter.$or = [
      { name: { $regex: escapeRegex(searchStr), $options: 'i' } },
      { areaName: { $regex: escapeRegex(searchStr), $options: 'i' } },
      { city: { $regex: escapeRegex(searchStr), $options: 'i' } },
      { slug: { $regex: escapeRegex(searchStr), $options: 'i' } },
    ];
  }

  if (city && typeof city === 'string') {
    filter.city = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
  }

  if (nocStatus && (NOC_STATUSES as readonly string[]).includes(String(nocStatus))) {
    filter.nocStatus = nocStatus;
  }

  if (riskLevel && ['safe', 'caution', 'high_risk', 'avoid'].includes(String(riskLevel))) {
    filter.overallRiskLevel = riskLevel;
  }

  if (isPublished === 'true') filter.isPublished = true;
  if (isPublished === 'false') filter.isPublished = false;

  if (isVerified === 'true') filter.isVerifiedByHighrise = true;
  if (isVerified === 'false') filter.isVerifiedByHighrise = false;

  if (isFeatured === 'true') filter.isFeatured = true;

  // Sort
  const sortFieldMap: Record<string, string> = {
    name: 'name',
    city: 'city',
    overallScore: 'scores.overall',
    legalScore: 'scores.legal',
    viewCount: 'viewCount',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  };
  const sortField = sortFieldMap[String(sortBy)] || 'createdAt';
  const sortDir: 1 | -1 = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [sortField]: sortDir };

  // Parallel query
  const [societies, total, statsAgg] = await Promise.all([
    Society.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select(
        '_id name slug city areaName category nocStatus approvalAuthority ' +
          'overallRiskLevel scores featuredImage riskAlerts ' +
          'isVerifiedByHighrise isPublished isFeatured viewCount searchCount ' +
          'developerName lastVerifiedAt createdAt updatedAt'
      )
      .lean(),
    Society.countDocuments(filter),
    Society.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: { $sum: { $cond: ['$isPublished', 1, 0] } },
          verified: { $sum: { $cond: ['$isVerifiedByHighrise', 1, 0] } },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$nocStatus', 'pending'] }, 1, 0],
            },
          },
          flagged: {
            $sum: {
              $cond: [
                {
                  $in: ['$overallRiskLevel', ['high_risk', 'avoid']],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const transformed: SocietyAdminListItem[] = (societies as unknown as SocietyAdminDoc[]).map(
    (society) => {
      const activeAlertCount = Array.isArray(society.riskAlerts)
        ? society.riskAlerts.filter((a) => !a.isResolved).length
        : 0;

      return {
        _id: society._id.toString(),
        name: society.name,
        slug: society.slug,
        city: society.city,
        areaName: society.areaName,
        category: society.category,
        nocStatus: society.nocStatus,
        approvalAuthority: society.approvalAuthority,
        overallRiskLevel: society.overallRiskLevel,
        legalScore: society.scores?.legal ?? 0,
        growthScore: society.scores?.growth ?? 0,
        overallScore: society.scores?.overall ?? 0,
        featuredImage: society.featuredImage,
        isVerifiedByHighrise: Boolean(society.isVerifiedByHighrise),
        isPublished: Boolean(society.isPublished),
        isFeatured: Boolean(society.isFeatured),
        viewCount: society.viewCount ?? 0,
        searchCount: society.searchCount ?? 0,
        activeAlertCount,
        developerName: society.developerName,
        lastVerifiedAt: toISO(society.lastVerifiedAt),
        createdAt: toISO(society.createdAt) || new Date().toISOString(),
        updatedAt: toISO(society.updatedAt) || new Date().toISOString(),
      };
    }
  );

  const stats = statsAgg[0] || {
    total: 0,
    published: 0,
    verified: 0,
    pending: 0,
    flagged: 0,
  };

  res.status(200).json({
    success: true,
    data: {
      societies: transformed,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
      stats: {
        total: stats.total ?? 0,
        published: stats.published ?? 0,
        verified: stats.verified ?? 0,
        pending: stats.pending ?? 0,
        flagged: stats.flagged ?? 0,
      },
    },
  });
}

// ─── POST: Create society ────────────────────────────────────────────────────

async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse<CreateResponse>,
  adminId: string
): Promise<void> {
  // Validate body
  const parsed = createSocietySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
    return;
  }

  const data = parsed.data;

  // Check for duplicate name in same city
  const duplicate = await Society.findOne({
    name: { $regex: `^${escapeRegex(data.name)}$`, $options: 'i' },
    city: { $regex: `^${escapeRegex(data.city)}$`, $options: 'i' },
  })
    .select('_id slug')
    .lean();

  if (duplicate) {
    res.status(409).json({
      success: false,
      error: 'A society with this name already exists in this city',
    });
    return;
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(data.name);

  // Transform coordinates to GeoJSON
  const coordinatesGeo = data.coordinates
    ? {
        type: 'Point' as const,
        coordinates: [data.coordinates.longitude, data.coordinates.latitude] as [number, number],
      }
    : undefined;

  // Build payload
  const payload = {
    name: data.name,
    slug,
    alternateNames: data.alternateNames ?? [],
    category: data.category,
    description: data.description,

    city: data.city,
    areaName: data.areaName,
    fullAddress: data.fullAddress,
    coordinates: coordinatesGeo,

    nocStatus: data.nocStatus,
    nocNumber: data.nocNumber,
    nocDate: data.nocDate ? new Date(data.nocDate) : undefined,
    nocExpiryDate: data.nocExpiryDate ? new Date(data.nocExpiryDate) : undefined,
    approvalAuthority: data.approvalAuthority,
    developmentAuthority: data.developmentAuthority,
    registrationNo: data.registrationNo,
    litigationStatus: data.litigationStatus,
    litigationNote: data.litigationNote,

    developerName: data.developerName,
    developerWebsite: data.developerWebsite,

    totalPlots: data.totalPlots,
    totalPhases: data.totalPhases,
    launchYear: data.launchYear,
    expectedCompletionYear: data.expectedCompletionYear,
    possessionPercentage: data.possessionPercentage ?? 0,

    scores: {
      legal: 50, // auto-calculated by pre-save hook
      growth: data.scores?.growth ?? 50,
      possession: data.scores?.possession ?? 0,
      infrastructure: 0, // auto-calculated by pre-save hook
      livability: 0, // auto-calculated by pre-save hook
      overall: 50, // auto-calculated by pre-save hook
    },

    infrastructureDetails: {
      electricity: data.infrastructureDetails?.electricity ?? 0,
      gas: data.infrastructureDetails?.gas ?? 0,
      water: data.infrastructureDetails?.water ?? 0,
      sewerage: data.infrastructureDetails?.sewerage ?? 0,
      internet: data.infrastructureDetails?.internet ?? 0,
      roads: data.infrastructureDetails?.roads ?? 0,
    },

    livabilityDetails: {
      schools: data.livabilityDetails?.schools ?? 0,
      hospitals: data.livabilityDetails?.hospitals ?? 0,
      markets: data.livabilityDetails?.markets ?? 0,
      transport: data.livabilityDetails?.transport ?? 0,
      security: data.livabilityDetails?.security ?? 0,
      parks: data.livabilityDetails?.parks ?? 0,
    },

    featuredImage: data.featuredImage,
    images: data.images ?? [],

    isVerifiedByHighrise: data.isVerifiedByHighrise ?? false,
    isPublished: data.isPublished ?? false,
    isFeatured: data.isFeatured ?? false,

    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,

    lastVerifiedAt: data.isVerifiedByHighrise ? new Date() : undefined,
  };

  // Create
  const created = await Society.create(payload);

  // Audit log
  await logSecurityEvent({
    type: 'admin_action',
    severity: 'low',
    userId: adminId,
    ip: getClientIp(req),
    req,
    metadata: {
      action: 'society_created',
      societyId: created._id.toString(),
      societyName: created.name,
      city: created.city,
      nocStatus: created.nocStatus,
      isPublished: (created as unknown as { isPublished: boolean }).isPublished,
    },
  }).catch(() => {
    // silent
  });

  res.status(201).json({
    success: true,
    data: {
      society: {
        _id: created._id.toString(),
        name: created.name,
        slug: created.slug,
        city: created.city,
        nocStatus: created.nocStatus,
      },
    },
  });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}