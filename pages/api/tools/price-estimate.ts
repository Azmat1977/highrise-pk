// pages/api/tools/price-estimate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import Society from '@/models/Society';
import { rateLimitSearch, setRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';
import type { FilterQuery } from 'mongoose';

// ─── Local Doc Shapes ────────────────────────────────────────────────────────

interface ComparablePropertyDoc {
  _id: { toString(): string };
  title: string;
  slug?: string;
  price: number;
  area?: number;
  unit?: string;
  bedrooms?: number;
  city?: string;
  society?: string;
  propertyType?: string;
  listingType?: string;
  createdAt: Date;
}

interface SocietyBlockRatesDoc {
  _id: { toString(): string };
  name: string;
  blockRates?: Array<{
    blockName: string;
    plotSize: string;
    minPrice: number;
    maxPrice: number;
    pricePerMarla?: number;
  }>;
  priceChangeYoY?: number;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComparableOut {
  _id: string;
  title: string;
  price: number;
  size: number;
  sizeUnit: string;
  bedrooms?: number;
  daysAgo: number;
  slug?: string;
}

interface EstimateResult {
  fairPriceMin: number;
  fairPriceMax: number;
  fairPriceMedian: number;
  pricePerUnit: number;
  pricePerUnitLabel: string;
  verdict: 'underpriced' | 'fair' | 'slightly_high' | 'overpriced' | 'no_data';
  verdictMessage: string;
  confidence: 'low' | 'medium' | 'high';
  comparableCount: number;
  comparables: ComparableOut[];
  marketTrend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  asking?: {
    amount: number;
    deviationPercent: number;
    suggestion: string;
  };
  insights: string[];
}

interface ApiResponse {
  success: boolean;
  data?: EstimateResult;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  'House', 'Apartment', 'Upper Portion', 'Lower Portion',
  'Residential Plot', 'Commercial Plot', 'Office', 'Shop',
] as const;

const SIZE_UNITS = ['Marla', 'Kanal', 'Sq Ft', 'Sq Yd'] as const;
const LISTING_TYPES = ['sale', 'rent'] as const;

// Size normalization (all to sq ft for comparison)
const SIZE_TO_SQFT: Record<string, number> = {
  'Marla': 272.25,      // 1 Marla = 272.25 sqft (standard Punjab)
  'Kanal': 5445,        // 1 Kanal = 20 Marla = 5445 sqft
  'Sq Ft': 1,
  'Sq. Ft.': 1,         // data-shape alias seen in seeded Property.unit values
  'Sq Yd': 9,           // 1 Sq Yd = 9 sqft
};

// ─── Validation ──────────────────────────────────────────────────────────────

const estimateSchema = z
  .object({
    city: z.string().trim().min(2).max(100),
    area: z.string().trim().min(2).max(200),
    society: z.string().trim().max(200).optional(),
    propertyType: z.enum(PROPERTY_TYPES),
    listingType: z.enum(LISTING_TYPES),
    size: z.number().positive().max(100000),
    sizeUnit: z.enum(SIZE_UNITS),
    bedrooms: z.number().int().min(0).max(20).optional(),
    askingPrice: z.number().positive().max(50000000000).optional(),
  })
  .strict();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeToSqft(size: number, unit: string): number {
  return size * (SIZE_TO_SQFT[unit] ?? 1);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calcMedian(sortedArr: number[]): number {
  if (sortedArr.length === 0) return 0;
  const mid = Math.floor(sortedArr.length / 2);
  if (sortedArr.length % 2 === 0) {
    return (sortedArr[mid - 1] + sortedArr[mid]) / 2;
  }
  return sortedArr[mid];
}

function calcPercentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = Math.max(0, Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length)));
  return sortedArr[idx];
}

function daysBetween(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)));
}

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `Rs ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `Rs ${(amount / 100_000).toFixed(2)} Lac`;
  return `Rs ${amount.toLocaleString()}`;
}

// ─── Verdict Engine ──────────────────────────────────────────────────────────

function calculateVerdict(
  askingPrice: number | undefined,
  fairMin: number,
  fairMax: number,
  fairMedian: number,
  listingType: string
): { verdict: EstimateResult['verdict']; verdictMessage: string; asking?: EstimateResult['asking'] } {
  if (!askingPrice || askingPrice <= 0) {
    return {
      verdict: 'fair',
      verdictMessage: `The fair market range is ${formatPKR(fairMin)} – ${formatPKR(fairMax)}. Enter an asking price to get a fairness verdict.`,
    };
  }

  const deviationPercent = ((askingPrice - fairMedian) / fairMedian) * 100;

  let verdict: EstimateResult['verdict'];
  let verdictMessage: string;
  let suggestion: string;

  if (deviationPercent <= -15) {
    verdict = 'underpriced';
    verdictMessage = `Excellent deal — asking price is ${Math.abs(deviationPercent).toFixed(1)}% below market median. This is significantly cheaper than comparable properties. Verify property condition and legal status before grabbing.`;
    suggestion = `Move fast if condition checks out. Median market value is ${formatPKR(fairMedian)}.`;
  } else if (deviationPercent <= 10) {
    verdict = 'fair';
    verdictMessage = `Asking price is within fair market range. ${deviationPercent >= 0 ? 'Slightly above' : 'Slightly below'} median by ${Math.abs(deviationPercent).toFixed(1)}%. Reasonable for negotiation.`;
    suggestion = `Negotiate to ${formatPKR(fairMin)} – ${formatPKR(fairMedian)} range for best value.`;
  } else if (deviationPercent <= 25) {
    verdict = 'slightly_high';
    verdictMessage = `Asking price is ${deviationPercent.toFixed(1)}% above market median. There may be premium features justifying this — verify amenities, location quality, and condition before paying full.`;
    suggestion = `Counter-offer in ${formatPKR(fairMedian)} – ${formatPKR(fairMax)} range.`;
  } else {
    verdict = 'overpriced';
    verdictMessage = `Significantly overpriced — ${deviationPercent.toFixed(1)}% above market median. Comparable properties are available for much less. Consider negotiating aggressively or exploring alternatives.`;
    suggestion = `Fair offer is ${formatPKR(fairMin)} – ${formatPKR(fairMedian)} range. If seller doesn't budge, walk away.`;
  }

  return {
    verdict,
    verdictMessage,
    asking: {
      amount: askingPrice,
      deviationPercent,
      suggestion,
    },
  };
}

// ─── Insights Generator ──────────────────────────────────────────────────────

function generateInsights(params: {
  comparableCount: number;
  society?: string;
  city: string;
  propertyType: string;
  listingType: string;
  yoyChange?: number;
  societyBlockRates?: SocietyBlockRatesDoc['blockRates'];
  oldestDays: number;
  newestDays: number;
}): string[] {
  const insights: string[] = [];

  // Data quality
  if (params.comparableCount >= 15) {
    insights.push(`Strong sample size — analysis based on ${params.comparableCount} verified ${params.propertyType.toLowerCase()}s in ${params.city}.`);
  } else if (params.comparableCount >= 5) {
    insights.push(`Moderate sample — ${params.comparableCount} comparable ${params.propertyType.toLowerCase()}s found. More listings = more accuracy.`);
  } else if (params.comparableCount > 0) {
    insights.push(`Limited data — only ${params.comparableCount} comparable found. Estimate has lower confidence; consider broadening your area search.`);
  }

  // Recency
  if (params.newestDays <= 7) {
    insights.push(`Fresh market data — most recent comparable listed ${params.newestDays} day${params.newestDays !== 1 ? 's' : ''} ago.`);
  } else if (params.oldestDays > 180) {
    insights.push(`Some data is 6+ months old — current market may have shifted. Consult a verified agent for latest trends.`);
  }

  // YoY trend
  if (params.yoyChange !== undefined) {
    if (params.yoyChange > 10) {
      insights.push(`Strong appreciation — ${params.city} prices up ${params.yoyChange.toFixed(1)}% year-over-year. Good for sellers.`);
    } else if (params.yoyChange > 0) {
      insights.push(`Stable growth — ${params.yoyChange.toFixed(1)}% YoY price increase in this market.`);
    } else if (params.yoyChange < -5) {
      insights.push(`Market correction in progress — prices down ${Math.abs(params.yoyChange).toFixed(1)}% YoY. Good buying opportunity.`);
    }
  }

  // Society-specific
  if (params.society && params.societyBlockRates && params.societyBlockRates.length > 0) {
    insights.push(`Official block-wise rates available for ${params.society}. Use those for plot transactions.`);
  }

  // Rent-specific
  if (params.listingType === 'rent') {
    insights.push(`Rental yield in this area is typically 5-7% annually for ${params.propertyType.toLowerCase()}s.`);
  }

  // Property type tips
  if (params.propertyType === 'Residential Plot' || params.propertyType === 'Commercial Plot') {
    insights.push(`For plots: verify NOC, possession status, and dimensions on-ground before final payment.`);
  } else if (params.propertyType === 'House' || params.propertyType === 'Apartment') {
    insights.push(`For ${params.propertyType.toLowerCase()}s: inspect condition, age, and approved building map before deciding.`);
  }

  return insights.slice(0, 5);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // Method check
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ success: false, error: 'Method not allowed' });
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

  // Validate body
  const parsed = estimateSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid input',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
    return;
  }

  const input = parsed.data;

  try {
    await dbConnect();

    // ─── Build Comparable Search Filter ──────────────────────────────────────

    const targetSqft = normalizeToSqft(input.size, input.sizeUnit);

    // Match listing type (map to internal property listingType)
    // Property model uses: 'full_payment'|'installment'|'rent'|'pre_launch'
    const listingTypeFilter = input.listingType === 'rent'
      ? { listingType: 'rent' }
      : { listingType: { $in: ['full_payment', 'installment'] } };

    // Build progressive filter (try strictest first, broaden if no results)
    const baseFilter: FilterQuery<Record<string, unknown>> = {
      ...PUBLIC_PROPERTY_FILTER,
      city: { $regex: `^${escapeRegex(input.city)}$`, $options: 'i' },
      propertyType: input.propertyType,
      ...listingTypeFilter,
    };

    // Society filter (if provided)
    const withSocietyFilter = input.society
      ? { ...baseFilter, society: { $regex: escapeRegex(input.society), $options: 'i' } }
      : baseFilter;

    // Area filter (locality match — "area" is a free-text label; Property.area is numeric)
    const withAreaFilter = {
      ...withSocietyFilter,
      $or: [
        { locality: { $regex: escapeRegex(input.area), $options: 'i' } },
        { society: { $regex: escapeRegex(input.area), $options: 'i' } },
      ],
    };

    // Bedrooms filter (if specified and applicable)
    const withBedroomsFilter = input.bedrooms !== undefined && input.bedrooms > 0
      ? { ...withAreaFilter, bedrooms: input.bedrooms }
      : withAreaFilter;

    // ─── Progressive search — start strictest, broaden if needed ────────────

    let comparables = await Property.find(withBedroomsFilter)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('_id title slug price area unit bedrooms city society propertyType listingType createdAt')
      .lean();

    // If <5 comparables, drop bedrooms filter
    if (comparables.length < 5 && input.bedrooms) {
      comparables = await Property.find(withAreaFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .select('_id title slug price area unit bedrooms city society propertyType listingType createdAt')
        .lean();
    }

    // If still <5, drop area filter (city + type only)
    if (comparables.length < 5) {
      comparables = await Property.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .select('_id title slug price area unit bedrooms city society propertyType listingType createdAt')
        .lean();
    }

    // ─── Filter by size similarity (±25%) ─────────────────────────────────────

    const typedComparables = comparables as unknown as ComparablePropertyDoc[];

    const sizeFiltered = typedComparables.filter((c) => {
      if (!c.area || !c.unit) return false;
      const compSqft = normalizeToSqft(c.area, c.unit);
      if (compSqft <= 0) return false;
      const ratio = compSqft / targetSqft;
      return ratio >= 0.75 && ratio <= 1.35; // within ±25-35%
    });

    // If size filtering left too few, use all comparables
    const finalComparables = sizeFiltered.length >= 3 ? sizeFiltered : typedComparables;

    // ─── Society block rates fallback ────────────────────────────────────────

    let societyBlockRates: SocietyBlockRatesDoc['blockRates'] | undefined;
    let societyYoY: number | undefined;

    if (input.society) {
      const societyDoc = await Society.findOne({
        $or: [
          { name: { $regex: `^${escapeRegex(input.society)}$`, $options: 'i' } },
          { alternateNames: { $regex: `^${escapeRegex(input.society)}$`, $options: 'i' } },
        ],
        city: { $regex: `^${escapeRegex(input.city)}$`, $options: 'i' },
      })
        .select('_id name blockRates priceChangeYoY')
        .lean();

      if (societyDoc) {
        const typedSociety = societyDoc as unknown as SocietyBlockRatesDoc;
        societyBlockRates = typedSociety.blockRates;
        societyYoY = typedSociety.priceChangeYoY;
      }
    }

    // ─── No data case ────────────────────────────────────────────────────────

    if (finalComparables.length === 0 && (!societyBlockRates || societyBlockRates.length === 0)) {
      res.status(200).json({
        success: true,
        data: {
          fairPriceMin: 0,
          fairPriceMax: 0,
          fairPriceMedian: 0,
          pricePerUnit: 0,
          pricePerUnitLabel: input.sizeUnit,
          verdict: 'no_data',
          verdictMessage: `No comparable ${input.propertyType.toLowerCase()}s found in ${input.area}, ${input.city}. Try broadening your area or checking a different property type. You can also contact a verified Highrise agent for manual valuation.`,
          confidence: 'low',
          comparableCount: 0,
          comparables: [],
          insights: [
            'Insufficient market data — try widening your area search.',
            'Consider listing the property on Highrise to attract verified buyers.',
            'Contact our team for expert manual valuation.',
          ],
        },
      });
      return;
    }

    // ─── Statistical Analysis ────────────────────────────────────────────────

    // Calculate price per sqft for each comparable
    const pricesPerSqft: number[] = [];
    for (const c of finalComparables) {
      if (!c.area || !c.unit || c.price <= 0) continue;
      const compSqft = normalizeToSqft(c.area, c.unit);
      if (compSqft <= 0) continue;
      pricesPerSqft.push(c.price / compSqft);
    }

    let fairPriceMin = 0;
    let fairPriceMedian = 0;
    let fairPriceMax = 0;
    let pricePerUnit = 0;

    if (pricesPerSqft.length > 0) {
      const sorted = [...pricesPerSqft].sort((a, b) => a - b);

      // Use IQR (25th–75th percentile) for fair range
      const p25 = calcPercentile(sorted, 25);
      const p75 = calcPercentile(sorted, 75);
      const median = calcMedian(sorted);

      // Translate per-sqft to total price for target size
      fairPriceMin = Math.round(p25 * targetSqft);
      fairPriceMedian = Math.round(median * targetSqft);
      fairPriceMax = Math.round(p75 * targetSqft);

      // Per-unit price in user's chosen unit
      pricePerUnit = Math.round(median * (SIZE_TO_SQFT[input.sizeUnit] ?? 1));
    } else if (societyBlockRates && societyBlockRates.length > 0) {
      // Fallback to society block rates
      const matchingBlock = societyBlockRates.find((b) =>
        b.plotSize.toLowerCase().includes(`${input.size}`) ||
        b.plotSize.toLowerCase().includes(input.sizeUnit.toLowerCase())
      ) || societyBlockRates[0];

      fairPriceMin = matchingBlock.minPrice;
      fairPriceMax = matchingBlock.maxPrice;
      fairPriceMedian = Math.round((matchingBlock.minPrice + matchingBlock.maxPrice) / 2);
      pricePerUnit = matchingBlock.pricePerMarla
        ? Math.round(matchingBlock.pricePerMarla * (SIZE_TO_SQFT[input.sizeUnit] ?? 1) / SIZE_TO_SQFT['Marla'])
        : Math.round(fairPriceMedian / input.size);
    }

    // ─── Confidence Score ────────────────────────────────────────────────────

    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (finalComparables.length >= 15) confidence = 'high';
    else if (finalComparables.length >= 7) confidence = 'medium';

    // Boost confidence if society block rates also available
    if (confidence === 'medium' && societyBlockRates && societyBlockRates.length > 0) {
      confidence = 'high';
    }

    // ─── Verdict ─────────────────────────────────────────────────────────────

    const { verdict, verdictMessage, asking } = calculateVerdict(
      input.askingPrice,
      fairPriceMin,
      fairPriceMax,
      fairPriceMedian,
      input.listingType
    );

    // ─── Market Trend ────────────────────────────────────────────────────────

    let marketTrend: EstimateResult['marketTrend'];
    if (societyYoY !== undefined) {
      marketTrend = {
        direction: societyYoY > 2 ? 'up' : societyYoY < -2 ? 'down' : 'stable',
        percentage: societyYoY,
        period: '12 months',
      };
    } else if (finalComparables.length >= 10) {
      // Estimate trend from old vs new comparables
      const sortedByDate = [...finalComparables].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const half = Math.floor(sortedByDate.length / 2);
      const oldHalf = sortedByDate.slice(0, half);
      const newHalf = sortedByDate.slice(half);

      const oldAvg = oldHalf.reduce((s, c) => {
        if (!c.area || !c.unit) return s;
        return s + (c.price / normalizeToSqft(c.area, c.unit));
      }, 0) / Math.max(1, oldHalf.length);

      const newAvg = newHalf.reduce((s, c) => {
        if (!c.area || !c.unit) return s;
        return s + (c.price / normalizeToSqft(c.area, c.unit));
      }, 0) / Math.max(1, newHalf.length);

      if (oldAvg > 0 && newAvg > 0) {
        const change = ((newAvg - oldAvg) / oldAvg) * 100;
        marketTrend = {
          direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
          percentage: change,
          period: 'recent trend',
        };
      }
    }

    // ─── Insights ────────────────────────────────────────────────────────────

    const oldestDays = finalComparables.length > 0
      ? Math.max(...finalComparables.map((c) => daysBetween(c.createdAt)))
      : 0;
    const newestDays = finalComparables.length > 0
      ? Math.min(...finalComparables.map((c) => daysBetween(c.createdAt)))
      : 0;

    const insights = generateInsights({
      comparableCount: finalComparables.length,
      society: input.society,
      city: input.city,
      propertyType: input.propertyType,
      listingType: input.listingType,
      yoyChange: marketTrend?.percentage,
      societyBlockRates,
      oldestDays,
      newestDays,
    });

    // ─── Transform comparables for response ──────────────────────────────────

    const comparablesOut: ComparableOut[] = finalComparables
      .slice(0, 5) // top 5 most recent
      .map((c) => ({
        _id: c._id.toString(),
        title: c.title,
        price: c.price,
        size: c.area ?? 0,
        sizeUnit: c.unit ?? 'Marla',
        bedrooms: c.bedrooms,
        daysAgo: daysBetween(c.createdAt),
        slug: c.slug,
      }));

    // ─── Response ────────────────────────────────────────────────────────────

    res.status(200).json({
      success: true,
      data: {
        fairPriceMin,
        fairPriceMax,
        fairPriceMedian,
        pricePerUnit,
        pricePerUnitLabel: input.sizeUnit,
        verdict,
        verdictMessage,
        confidence,
        comparableCount: finalComparables.length,
        comparables: comparablesOut,
        marketTrend,
        asking,
        insights,
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
        endpoint: '/api/tools/price-estimate',
        method: 'POST',
        errorMessage: `Price estimate failed: ${errorMessage}`,
        input: {
          city: input.city,
          area: input.area,
          propertyType: input.propertyType,
        },
      },
    }).catch(() => {
      // silent
    });

    res.status(500).json({
      success: false,
      error: 'Failed to calculate price estimate. Please try again.',
    });
  }
}