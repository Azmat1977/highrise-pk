// pages/api/societies/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Society from '@/models/Society';
import { rateLimitSearch, setRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import type { FilterQuery } from 'mongoose';

// Local society shape for .lean() queries
interface SocietyDoc {
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
    possession?: number;
    infrastructure?: number;
    livability?: number;
    overall?: number;
  };
  featuredImage?: string;
  riskAlerts?: Array<{ isResolved: boolean }>;
  isVerifiedByHighrise?: boolean;
  isFeatured?: boolean;
  viewCount?: number;
  developerName?: string;
  launchYear?: number;
  possessionPercentage?: number;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocietyListItem {
  _id: string;
  name: string;
  slug: string;
  city: string;
  areaName: string;
  category: string;
  nocStatus: string;
  approvalAuthority: string;
  overallRiskLevel: string;
  scores: {
    legal: number;
    growth: number;
    possession: number;
    infrastructure: number;
    livability: number;
    overall: number;
  };
  featuredImage?: string;
  activeAlertCount: number;
  isVerifiedByHighrise: boolean;
  isFeatured: boolean;
  viewCount: number;
  developerName?: string;
  launchYear?: number;
  possessionPercentage?: number;
}

interface PaginatedResponse {
  success: boolean;
  data?: {
    societies: SocietyListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: {
      cities: string[];
      authorities: string[];
      nocStatuses: string[];
    };
  };
  error?: string;
  message?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_SORT_FIELDS = [
  'overallScore',
  'legalScore',
  'growthScore',
  'name',
  'viewCount',
  'createdAt',
  'launchYear',
] as const;

const VALID_NOC_STATUSES = [
  'approved',
  'pending',
  'under_review',
  'illegal',
  'disputed',
  'cancelled',
  'expired',
] as const;

const VALID_RISK_LEVELS = ['safe', 'caution', 'high_risk', 'avoid'] as const;
const VALID_CATEGORIES = [
  'housing_scheme',
  'gated_community',
  'apartment_complex',
  'commercial_zone',
  'mixed_use',
  'industrial_zone',
  'township',
] as const;

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedResponse>
): Promise<void> {
  // Method check
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Rate limit (public endpoint — uses API_SEARCH: 60 req/min)
  const rl = await rateLimitSearch(req);
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

    // ─── Parse Query Params ───────────────────────────────────────────────────

    const {
      search = '',
      city = '',
      nocStatus = '',
      riskLevel = '',
      category = '',
      authority = '',
      isVerified = '',
      isFeatured = '',
      minScore = '',
      sortBy = 'overallScore',
      sortOrder = 'desc',
      page = '1',
      limit = String(DEFAULT_LIMIT),
    } = req.query;

    // Validate + normalize pagination
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(limit), 10) || DEFAULT_LIMIT));
    const skip = (pageNum - 1) * limitNum;

    // ─── Build Filter ─────────────────────────────────────────────────────────

    const filter: FilterQuery<Record<string, unknown>> = {
      isPublished: true,
    };

    // Text search (uses text index)
    const searchStr = String(search).trim();
    if (searchStr.length > 0) {
      filter.$text = { $search: searchStr };
    }

    // City filter
    if (city && typeof city === 'string') {
      filter.city = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
    }

    // NOC status
    if (nocStatus && VALID_NOC_STATUSES.includes(nocStatus as (typeof VALID_NOC_STATUSES)[number])) {
      filter.nocStatus = nocStatus;
    }

    // Risk level
    if (riskLevel && VALID_RISK_LEVELS.includes(riskLevel as (typeof VALID_RISK_LEVELS)[number])) {
      filter.overallRiskLevel = riskLevel;
    }

    // Category
    if (category && VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      filter.category = category;
    }

    // Approval authority
    if (authority && typeof authority === 'string') {
      filter.approvalAuthority = authority;
    }

    // Verified by Highrise
    if (isVerified === 'true') {
      filter.isVerifiedByHighrise = true;
    }

    // Featured
    if (isFeatured === 'true') {
      filter.isFeatured = true;
    }

    // Minimum overall score
    const minScoreNum = parseInt(String(minScore), 10);
    if (!isNaN(minScoreNum) && minScoreNum > 0 && minScoreNum <= 100) {
      filter['scores.overall'] = { $gte: minScoreNum };
    }

    // ─── Build Sort ───────────────────────────────────────────────────────────

    const sortFieldMap: Record<string, string> = {
      overallScore: 'scores.overall',
      legalScore: 'scores.legal',
      growthScore: 'scores.growth',
      name: 'name',
      viewCount: 'viewCount',
      createdAt: 'createdAt',
      launchYear: 'launchYear',
    };

    const sortField = sortFieldMap[String(sortBy)] || 'scores.overall';
    const sortDir: 1 | -1 = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const sort: Record<string, 1 | -1> = searchStr.length > 0
      ? { score: { $meta: 'textScore' } as unknown as 1, [sortField]: sortDir }
      : { [sortField]: sortDir };

    // ─── Query Execution ──────────────────────────────────────────────────────

    const projection = searchStr.length > 0
      ? { score: { $meta: 'textScore' } }
      : {};

    const [societies, total, filterOptions] = await Promise.all([
      Society.find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select(
          '_id name slug city areaName category nocStatus approvalAuthority ' +
          'overallRiskLevel scores featuredImage riskAlerts ' +
          'isVerifiedByHighrise isFeatured viewCount developerName ' +
          'launchYear possessionPercentage'
        )
        .lean(),
      Society.countDocuments(filter),
      // Filter options for UI dropdowns
      Society.aggregate([
        { $match: { isPublished: true } },
        {
          $group: {
            _id: null,
            cities: { $addToSet: '$city' },
            authorities: { $addToSet: '$approvalAuthority' },
            nocStatuses: { $addToSet: '$nocStatus' },
          },
        },
      ]),
    ]);

    // ─── Increment search count (fire-and-forget) ────────────────────────────

    if (searchStr.length > 0 && societies.length > 0) {
      const ids = (societies as unknown as Array<{ _id: unknown }>).map((s) => s._id);
      Society.updateMany(
        { _id: { $in: ids } },
        { $inc: { searchCount: 1 } }
      ).catch(() => {
        // silent — non-critical
      });
    }

    // ─── Transform results ────────────────────────────────────────────────────

    const transformed: SocietyListItem[] = (societies as unknown as SocietyDoc[]).map(
      (society) => {
        const activeAlertCount = Array.isArray(society.riskAlerts)
          ? society.riskAlerts.filter((a) => !a.isResolved).length
          : 0;

        return {
          _id: String(society._id),
          name: society.name,
          slug: society.slug,
          city: society.city,
          areaName: society.areaName,
          category: society.category,
          nocStatus: society.nocStatus,
          approvalAuthority: society.approvalAuthority,
          overallRiskLevel: society.overallRiskLevel,
          scores: {
            legal: society.scores?.legal ?? 0,
            growth: society.scores?.growth ?? 0,
            possession: society.scores?.possession ?? 0,
            infrastructure: society.scores?.infrastructure ?? 0,
            livability: society.scores?.livability ?? 0,
            overall: society.scores?.overall ?? 0,
          },
          featuredImage: society.featuredImage,
          activeAlertCount,
          isVerifiedByHighrise: Boolean(society.isVerifiedByHighrise),
          isFeatured: Boolean(society.isFeatured),
          viewCount: society.viewCount ?? 0,
          developerName: society.developerName,
          launchYear: society.launchYear,
          possessionPercentage: society.possessionPercentage,
        };
      }
    );

    const opts = filterOptions[0] ?? { cities: [], authorities: [], nocStatuses: [] };

    // ─── Response ─────────────────────────────────────────────────────────────

    // Cache for 60 seconds (public data)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

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
        filters: {
          cities: (opts.cities ?? []).filter(Boolean).sort(),
          authorities: (opts.authorities ?? []).filter(Boolean).sort(),
          nocStatuses: (opts.nocStatuses ?? []).filter(Boolean).sort(),
        },
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await logSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      ip: getClientIp(req),
      req,
      metadata: {
        endpoint: '/api/societies',
        method: 'GET',
        errorMessage: `Society listing failed: ${errorMessage}`,
      },
    }).catch(() => {
      // silent
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch societies. Please try again.',
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}