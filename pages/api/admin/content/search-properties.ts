// pages/api/admin/content/search-properties.ts
// Search properties for campaign property card insertion
// Admin only — rate limited — verified properties only

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';

// ─── Response shape ───────────────────────────────────────────
interface PropertyResult {
  id:           string;
  title:        string;
  city:         string;
  society:      string;
  propertyType: string;
  listingType:  string;
  price:        number;
  area:         number;
  unit:         string;
  imageUrl:     string | null;
  slug:         string | null;
}

interface ApiResponse {
  success:   boolean;
  results?:  PropertyResult[];
  total?:    number;
  message?:  string;
}

// ─── Security headers ─────────────────────────────────────────
function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const requestId = Math.random().toString(36).slice(2, 10);
  setSecurityHeaders(res);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── Rate limit ───────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  // ── Auth guard ───────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── Input validation ─────────────────────────────────────────
  const rawQuery = String(req.query.q    || '').trim();
  const rawCity  = String(req.query.city || '').trim();

  if (rawQuery.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Search query too long',
    });
  }

  if (rawQuery.length < 2 && !rawCity) {
    return res.status(400).json({
      success: false,
      message: 'Please enter at least 2 characters',
    });
  }

  try {
    await dbConnect();

    // ── Build query ───────────────────────────────────────────
    const baseFilter: Record<string, unknown> = {
      ...PUBLIC_PROPERTY_FILTER,
    };

    const searchConditions: Record<string, unknown>[] = [];

    if (rawQuery.length >= 2) {
      const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex   = new RegExp(escaped, 'i');
      searchConditions.push(
        { title:   { $regex: regex } },
        { society: { $regex: regex } },
        { city:    { $regex: regex } }
      );
    }

    if (rawCity) {
      const cityEscaped = rawCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchConditions.push({ city: { $regex: new RegExp(cityEscaped, 'i') } });
    }

    const filter: Record<string, unknown> =
      searchConditions.length > 0
        ? { ...baseFilter, $or: searchConditions }
        : baseFilter;

    // ── Execute query ─────────────────────────────────────────
    const docs: any[] = await Property.find(filter)
      .select(
        'title city society propertyType listingType price area unit ' +
        'featureImageUrl images gallery slug'
      )
      .sort({ 'trustScore.score': -1, views: -1 })
      .limit(20)
      .lean();

    // ── Map results ───────────────────────────────────────────
    const results: PropertyResult[] = docs.map((doc) => {
      let imageUrl: string | null = null;

      if (Array.isArray(doc.images) && doc.images.length > 0) {
        const primary = doc.images.find((img: any) => img?.isPrimary);
        imageUrl = primary?.url ?? doc.images[0]?.url ?? null;
      }

      if (!imageUrl && doc.featureImageUrl) {
        imageUrl = doc.featureImageUrl;
      }

      if (!imageUrl && Array.isArray(doc.gallery) && doc.gallery.length > 0) {
        imageUrl = doc.gallery[0]?.url ?? null;
      }

      return {
        id:           String(doc._id),
        title:        doc.title        || '',
        city:         doc.city         || '',
        society:      doc.society      || '',
        propertyType: doc.propertyType || '',
        listingType:  doc.listingType  || '',
        price:        doc.price        || 0,
        area:         doc.area         || 0,
        unit:         doc.unit         || '',
        imageUrl,
        slug:         doc.slug         || null,
      };
    });

    // ── Audit log ─────────────────────────────────────────────
    await logSecurityEvent({
      type:      'admin_action',
      severity:  'low',
      userId:    auth.id,
      ip:        String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''),
      userAgent: String(req.headers['user-agent'] || ''),
      metadata:  {
        requestId,
        action:  'property_search',
        query:   rawQuery,
        count:   results.length,
      },
    });

    return res.status(200).json({
      success: true,
      results,
      total:   results.length,
    });

  } catch (err) {
    await logSecurityEvent({
      type:      'system_error',
      severity:  'high',
      userId:    auth.id,
      ip:        String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''),
      userAgent: String(req.headers['user-agent'] || ''),
      metadata:  {
        requestId,
        action: 'property_search_error',
        error:  err instanceof Error ? err.message : 'unknown',
      },
    });

    return res.status(500).json({
      success: false,
      message: 'Search failed — please try again',
    });
  }
}