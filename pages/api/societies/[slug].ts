// pages/api/societies/[slug].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Society from '@/models/Society';
import Property from '@/models/Property';
import Project from '@/models/Projects';
import { rateLimitSearch, setRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

// ─── Local Mongoose Doc Shapes (for .lean() results) ─────────────────────────

interface AlertItem {
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
}

interface DocItem {
  _id?: { toString(): string };
  title: string;
  url: string;
  type: string;
  uploadedAt: Date;
}

interface BlockRateItem {
  blockName: string;
  plotSize: string;
  minPrice: number;
  maxPrice: number;
  pricePerMarla?: number;
  lastUpdated: Date;
}

interface SocietyFullDoc {
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
  blocks?: Array<{
    name: string;
    possessionStatus: 'announced' | 'under_development' | 'ready';
    developmentStatus: 'undeveloped' | 'under_development' | 'semi_developed' | 'fully_developed';
  }>;
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
  riskAlerts?: AlertItem[];
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
  blockRates?: BlockRateItem[];
  priceChangeYoY?: number;
  rentalYield?: number;
  featuredImage?: string;
  images?: string[];
  documents?: DocItem[];
  developerName?: string;
  developerWebsite?: string;
  totalPlots?: number;
  totalPhases?: number;
  launchYear?: number;
  expectedCompletionYear?: number;
  possessionPercentage?: number;
  isVerifiedByHighrise?: boolean;
  isFeatured?: boolean;
  viewCount?: number;
  searchCount?: number;
  lastVerifiedAt?: Date;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RelatedSocietyDoc {
  _id: { toString(): string };
  name: string;
  slug: string;
  city: string;
  areaName: string;
  scores?: { overall?: number };
  overallRiskLevel: string;
  featuredImage?: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocietyDetailResponse {
  success: boolean;
  data?: {
    society: SocietyDetail;
    relatedCounts: {
      properties: number;
      projects: number;
    };
    relatedSocieties: RelatedSocietyItem[];
  };
  error?: string;
}

interface SocietyDetail {
  _id: string;
  name: string;
  slug: string;
  blocks: Array<{
    name: string;
    possessionStatus: 'announced' | 'under_development' | 'ready';
    developmentStatus: 'undeveloped' | 'under_development' | 'semi_developed' | 'fully_developed';
  }>;
  verificationPanel: {
    verifiedBy: string;
    source: string;
    verifiedAt: string | null;
    legalDisclaimer: string;
  };
  alternateNames: string[];
  category: string;
  description?: string;

  // Location
  city: string;
  areaName: string;
  fullAddress?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };

  // Legal
  nocStatus: string;
  nocNumber?: string;
  nocDate?: string;
  nocExpiryDate?: string;
  approvalAuthority: string;
  developmentAuthority?: string;
  registrationNo?: string;
  litigationStatus: string;
  litigationNote?: string;
  isNOCValid: boolean;

  // Risk
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
  activeAlertCount: number;

  // Scores
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

  // Pricing
  blockRates: Array<{
    blockName: string;
    plotSize: string;
    minPrice: number;
    maxPrice: number;
    pricePerMarla?: number;
    lastUpdated: string;
  }>;
  priceChangeYoY?: number;
  rentalYield?: number;

  // Media
  featuredImage?: string;
  images: string[];
  documents: Array<{
    _id: string;
    title: string;
    url: string;
    type: string;
    uploadedAt: string;
  }>;

  // Developer
  developerName?: string;
  developerWebsite?: string;

  // Stats
  totalPlots?: number;
  totalPhases?: number;
  launchYear?: number;
  expectedCompletionYear?: number;
  possessionPercentage?: number;

  // Platform
  isVerifiedByHighrise: boolean;
  isFeatured: boolean;
  viewCount: number;
  searchCount: number;
  lastVerifiedAt?: string;

  // SEO
  seoTitle?: string;
  seoDescription?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface RelatedSocietyItem {
  _id: string;
  name: string;
  slug: string;
  city: string;
  areaName: string;
  overallScore: number;
  overallRiskLevel: string;
  featuredImage?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(date: Date | undefined | null): string | undefined {
  if (!date) return undefined;
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 2 && slug.length <= 200;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SocietyDetailResponse>
): Promise<void> {
  // Method check
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Slug validation
  const slugParam = req.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!slug || typeof slug !== 'string' || !isValidSlug(slug)) {
    res.status(400).json({ success: false, error: 'Invalid society identifier' });
    return;
  }

  // Rate limit (public — 60 req/min)
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

    // ─── Fetch society ────────────────────────────────────────────────────────

    const societyDoc = await Society.findOne({
      slug: slug.toLowerCase(),
      isPublished: true,
    }).lean();

    if (!societyDoc) {
      // Anti-enumeration: same 404 for non-existent + unpublished
      res.status(404).json({ success: false, error: 'Society not found' });
      return;
    }

    const society = societyDoc as unknown as SocietyFullDoc;

    const societyId = society._id.toString();

    // ─── Fire-and-forget view counter ────────────────────────────────────────

    Society.updateOne(
      { _id: society._id },
      { $inc: { viewCount: 1 } }
    ).catch(() => {
      // silent — non-critical
    });

    // ─── Parallel: count related properties + projects + related societies ──

    const [propertyCount, projectCount, relatedDocs] = await Promise.all([
      Property.countDocuments({
        $or: [
          { society: { $regex: `^${escapeRegex(society.name)}$`, $options: 'i' } },
          { society: { $regex: society.name, $options: 'i' } },
        ],
        isPublished: true,
      }).catch(() => 0),

      Project.countDocuments({
        $or: [
          { areaName: { $regex: society.areaName, $options: 'i' } },
          { projectName: { $regex: society.name, $options: 'i' } },
        ],
        isVerified: true,
      }).catch(() => 0),

      // Related societies — same city, exclude current
      Society.find({
        _id: { $ne: society._id },
        city: society.city,
        isPublished: true,
      })
        .sort({ 'scores.overall': -1, isFeatured: -1 })
        .limit(4)
        .select('_id name slug city areaName scores overallRiskLevel featuredImage')
        .lean(),
    ]);

    // ─── Transform riskAlerts ────────────────────────────────────────────────

        const riskAlerts = (society.riskAlerts || []).map((a) => ({
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
    }));

    const activeAlertCount = riskAlerts.filter((a) => !a.isResolved).length;

    // ─── Transform documents ─────────────────────────────────────────────────

    const documents = (society.documents || []).map((d) => ({
      _id: d._id ? d._id.toString() : '',
      title: d.title,
      url: d.url,
      type: d.type,
      uploadedAt: toISO(d.uploadedAt) || new Date().toISOString(),
    }));

    // ─── Transform blockRates ────────────────────────────────────────────────

    const blockRates = (society.blockRates || []).map((b) => ({
      blockName: b.blockName,
      plotSize: b.plotSize,
      minPrice: b.minPrice,
      maxPrice: b.maxPrice,
      pricePerMarla: b.pricePerMarla,
      lastUpdated: toISO(b.lastUpdated) || new Date().toISOString(),
    }));

    // ─── NOC validity check ──────────────────────────────────────────────────

    const isNOCValid =
      society.nocStatus === 'approved' &&
      (!society.nocExpiryDate || new Date(society.nocExpiryDate) > new Date());

    // ─── Transform related societies ─────────────────────────────────────────

    const relatedSocieties: RelatedSocietyItem[] = (
      relatedDocs as unknown as RelatedSocietyDoc[]
    ).map((r) => ({
      _id: r._id.toString(),
      name: r.name,
      slug: r.slug,
      city: r.city,
      areaName: r.areaName,
      overallScore: r.scores?.overall ?? 0,
      overallRiskLevel: r.overallRiskLevel,
      featuredImage: r.featuredImage,
    }));

    // ─── Build response ──────────────────────────────────────────────────────

    const detail: SocietyDetail = {
      _id: societyId,
      name: society.name,
      slug: society.slug,
      blocks: society.blocks || [],
      verificationPanel: {
        verifiedBy: society.isVerifiedByHighrise ? 'Highrise.pk Advisory Desk' : 'Unverified / Public Source',
        source: society.approvalAuthority === 'Other' ? 'Public Land Records' : `${society.approvalAuthority} Legal Database`,
        verifiedAt: toISO(society.lastVerifiedAt) || null,
        legalDisclaimer: 'NOC details checked against official public directories on the specified verification date. This information is provided for educational and analytical purposes only. Highrise.pk does not legally guarantee land title, NOC validity, or developer commitments.',
      },
      alternateNames: society.alternateNames || [],
      category: society.category,
      description: society.description,

      city: society.city,
      areaName: society.areaName,
      fullAddress: society.fullAddress,
      coordinates: society.coordinates,

      nocStatus: society.nocStatus,
      nocNumber: society.nocNumber,
      nocDate: toISO(society.nocDate),
      nocExpiryDate: toISO(society.nocExpiryDate),
      approvalAuthority: society.approvalAuthority,
      developmentAuthority: society.developmentAuthority,
      registrationNo: society.registrationNo,
      litigationStatus: society.litigationStatus,
      litigationNote: society.litigationNote,
      isNOCValid,

      overallRiskLevel: society.overallRiskLevel,
      riskAlerts,
      activeAlertCount,

      scores: {
        legal: society.scores?.legal ?? 0,
        growth: society.scores?.growth ?? 0,
        possession: society.scores?.possession ?? 0,
        infrastructure: society.scores?.infrastructure ?? 0,
        livability: society.scores?.livability ?? 0,
        overall: society.scores?.overall ?? 0,
      },
      infrastructureDetails: {
        electricity: society.infrastructureDetails?.electricity ?? 0,
        gas: society.infrastructureDetails?.gas ?? 0,
        water: society.infrastructureDetails?.water ?? 0,
        sewerage: society.infrastructureDetails?.sewerage ?? 0,
        internet: society.infrastructureDetails?.internet ?? 0,
        roads: society.infrastructureDetails?.roads ?? 0,
      },
      livabilityDetails: {
        schools: society.livabilityDetails?.schools ?? 0,
        hospitals: society.livabilityDetails?.hospitals ?? 0,
        markets: society.livabilityDetails?.markets ?? 0,
        transport: society.livabilityDetails?.transport ?? 0,
        security: society.livabilityDetails?.security ?? 0,
        parks: society.livabilityDetails?.parks ?? 0,
      },

      blockRates,
      priceChangeYoY: society.priceChangeYoY,
      rentalYield: society.rentalYield,

      featuredImage: society.featuredImage,
      images: society.images || [],
      documents,

      developerName: society.developerName,
      developerWebsite: society.developerWebsite,

      totalPlots: society.totalPlots,
      totalPhases: society.totalPhases,
      launchYear: society.launchYear,
      expectedCompletionYear: society.expectedCompletionYear,
      possessionPercentage: society.possessionPercentage,

      isVerifiedByHighrise: Boolean(society.isVerifiedByHighrise),
      isFeatured: Boolean(society.isFeatured),
      viewCount: (society.viewCount ?? 0) + 1, // optimistic increment
      searchCount: society.searchCount ?? 0,
      lastVerifiedAt: toISO(society.lastVerifiedAt),

      seoTitle: society.seoTitle,
      seoDescription: society.seoDescription,

      createdAt: toISO(society.createdAt) || new Date().toISOString(),
      updatedAt: toISO(society.updatedAt) || new Date().toISOString(),
    };

    // ─── Response ────────────────────────────────────────────────────────────

    // Cache for 60s with stale-while-revalidate
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    res.status(200).json({
      success: true,
      data: {
        society: detail,
        relatedCounts: {
          properties: propertyCount,
          projects: projectCount,
        },
        relatedSocieties,
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
        endpoint: `/api/societies/${slug}`,
        method: 'GET',
        errorMessage: `Society detail fetch failed: ${errorMessage}`,
      },
    }).catch(() => {
      // silent
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch society details. Please try again.',
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}