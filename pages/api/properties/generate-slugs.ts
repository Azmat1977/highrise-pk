// pages/api/properties/generate-slugs.ts
// ═══════════════════════════════════════════════════════════════
// Admin utility — bulk slug generation for properties
// with missing or empty slugs.
//
// Uses ObjectId-suffix format: "property-title-city-abc12345"
// (deterministic — differs from model auto-slug which uses timestamp)
//
// Always run with dryRun: true first to preview changes.
// ═══════════════════════════════════════════════════════════════
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, setRateLimitHeaders } from '@/lib/rateLimit';
import { logPropertyAction } from '@/lib/logAdminAction';
import mongoose from 'mongoose';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS  = 5000; // bulk ops need more time
const DEFAULT_LIMIT = 500;
const MAX_LIMIT     = 5000;

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface GenerateSlugsBody {
  dryRun?:         unknown;
  onlyMissing?:    unknown;
  includeDeleted?: unknown;
  limit?:          unknown;
  cursor?:         unknown;
}

interface LeanPropertySlug {
  _id:    mongoose.Types.ObjectId;
  title?: string;
  city?:  string;
  slug?:  string;
}

interface SlugSample {
  _id:  string;
  from: string | null;
  to:   string;
}

interface BulkWriteOp {
  updateOne: {
    filter: { _id: mongoose.Types.ObjectId };
    update: {
      $set: {
        slug:      string;
        updatedAt: Date;
      };
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf    = req.headers['x-forwarded-for'];
  const raw   = Array.isArray(xf) ? xf[0] : xf;
  const first = (raw ?? '').split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || '0.0.0.0';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',              requestId);
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains; preload');
  res.setHeader('X-DNS-Prefetch-Control',    'off');
  res.setHeader('Cache-Control',             'no-store');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// Deterministic slug format for backfill utility
// Uses ObjectId suffix (stable across re-runs)
// Format: "property-title-city-abc12345"
function slugify(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildSlug(title: string, city: string, id: string): string {
  const base   = slugify(`${title}-${city}`) || 'property';
  const suffix = String(id).slice(-8);
  return `${base}-${suffix}`.slice(0, 180);
}

// ═══════════════════════════════════════════════════════════════
// 🚦 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      requestId,
    });
    return;
  }

  // Rate limit (admin endpoint — tight)
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down.',
      requestId,
    });
    return;
  }

  // Admin only
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const ip = getClientIp(req);

  try {
    await dbConnect();

    // ── Parse body ────────────────────────────────────────
    const body = req.body as GenerateSlugsBody;

    if (!body || typeof body !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Request body must be JSON.',
        requestId,
      });
      return;
    }

    // dryRun defaults to TRUE — safe first run
    const dryRun        = body.dryRun      !== false;
    const onlyMissing   = body.onlyMissing !== false;
    const includeDeleted= body.includeDeleted === true;

    const limit = clampInt(
      Number(body.limit ?? DEFAULT_LIMIT),
      1,
      MAX_LIMIT
    );

    const cursorRaw = typeof body.cursor === 'string'
      ? body.cursor.trim()
      : '';

    const cursor = cursorRaw && isValidObjectId(cursorRaw)
      ? cursorRaw
      : null;

    // ── Build filter ──────────────────────────────────────
    type PropertyFilter = {
      isDeleted?: { $ne: boolean };
      $or?:       Array<Record<string, unknown>>;
      _id?:       { $gt: mongoose.Types.ObjectId };  // ObjectId — not string
    };

    const filter: PropertyFilter = {};

    if (!includeDeleted) {
      filter.isDeleted = { $ne: true };
    }

    if (onlyMissing) {
      filter.$or = [
        { slug: { $exists: false } },
        { slug: ''   },
        { slug: null },
      ];
    }

    // ✅ ObjectId cursor — BSON comparison is type-correct
    if (cursor) {
      filter._id = { $gt: new mongoose.Types.ObjectId(cursor) };
    }

    // ── Fetch ─────────────────────────────────────────────
    const props = await Property
      .find(filter as mongoose.FilterQuery<typeof Property>)
      .select('_id title city slug')
      .sort({ _id: 1 })
      .limit(limit)
      .maxTimeMS(MAX_TIME_MS)
      .lean<LeanPropertySlug[]>();

    if (props.length === 0) {
      res.status(200).json({
        success:        true,
        requestId,
        message:        'No matching properties found.',
        dryRun,
        onlyMissing,
        includeDeleted,
        processed:      0,
        updated:        0,
        nextCursor:     null,
        sample:         [],
      });
      return;
    }

    // ── Compute slugs ─────────────────────────────────────
    let updated       = 0;
    const sample:     SlugSample[] = [];
    const ops:        BulkWriteOp[] = [];

    for (const p of props) {
      const id      = p._id.toString();
      const title   = String(p.title ?? 'property').trim();
      const city    = String(p.city  ?? '').trim();
      const nextSlug= buildSlug(title, city, id);
      const curSlug = p.slug ? String(p.slug) : null;

      // Skip if already correct
      if (curSlug === nextSlug) continue;

      if (sample.length < 10) {
        sample.push({ _id: id, from: curSlug, to: nextSlug });
      }

      updated += 1;

      if (!dryRun) {
        ops.push({
          updateOne: {
            filter: { _id: p._id },
            update: {
              $set: {
                slug:      nextSlug,
                // bulkWrite bypasses Mongoose timestamps plugin —
                // updatedAt must be set manually here (not redundant)
                updatedAt: new Date(),
              },
            },
          },
        });
      }
    }

    // ── Execute bulk write ────────────────────────────────
    // Note: bulkWrite bypasses pre-save hooks intentionally here.
    // Slug-only updates do not need trueCost/trustScore recalculation.
    // This is a maintenance utility — not a data modification endpoint.
    if (!dryRun && ops.length > 0) {
      await Property.bulkWrite(
        ops as Parameters<typeof Property.bulkWrite>[0],
        { ordered: false }
      );
    }

    // Return null cursor when on last page (props.length < limit)
    // Returning a cursor when there are no more results causes infinite loops
    const nextCursor = props.length < limit
      ? null
      : props[props.length - 1]._id.toString();

    // ── Audit log ─────────────────────────────────────────
    // Only log actual writes — dry runs are previews (no audit noise)
    // Admin bulk operations use logPropertyAction() — convenience wrapper
    // that pre-fills entityType: 'property' (avoids enum mismatch)
    // (logSecurityEvent is for owner/user mutations — Lesson #13)
    if (!dryRun && updated > 0) {
      await logPropertyAction({
        action:      'data_export',
        adminId:     auth.id,
        adminEmail:  auth.email ?? '',
        adminName:   auth.name  ?? undefined,
        entityLabel: `Bulk slug generation — ${updated} of ${props.length} properties`,
        meta: {
          propertiesUpdated: updated,
          propertiesScanned: props.length,
          onlyMissing,
          includeDeleted,
          cursor:            cursor ?? null,
          limit,
        },
        ip,
        userAgent: req.headers['user-agent'] ?? '',
        requestId,
      });
    }

    // ── Response ──────────────────────────────────────────
    res.status(200).json({
      success:        true,
      requestId,
      message:        dryRun
        ? `Dry run complete. ${updated} slugs would be updated.`
        : `Updated ${updated} of ${props.length} properties with new slugs.`,
      dryRun,
      onlyMissing,
      includeDeleted,
      processed:      props.length,
      updated,
      nextCursor,
      sample,
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate slugs.',
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        debug: err instanceof Error ? err.message : String(err),
      }),
    });
  }
}