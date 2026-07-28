/**
 * pages/api/risk-alerts.ts
 *
 * GET /api/risk-alerts
 *
 * Unified public risk alert feed — merges Society.riskAlerts[]
 * and Project.riskAlerts[] into a single sorted response.
 *
 * Query params:
 *   type       → 'all' | 'society' | 'project'   (default: 'all')
 *   severity   → 'low' | 'medium' | 'high' | 'critical'
 *   category   → 'legal' | 'financial' | 'construction' | 'fraud' | 'noc' | 'general'
 *   city       → string (filter by city)
 *   status     → 'active' | 'resolved' | 'investigating' (default: 'active')
 *   limit      → number (default: 12, max: 50)
 *   page       → number (default: 1)
 *
 * V5.7.0 — Phase A: Unified Risk Intelligence System
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

import dbConnect from '@/lib/dbConnect';
import Society from '@/models/Society';
import Project from '@/models/Projects';
import { rateLimitSearch, setRateLimitHeaders, sendRateLimitResponse } from '@/lib/rateLimit';

// ─────────────────────────────────────────────
// Local doc shapes (Rule 9 — no model type imports)
// ─────────────────────────────────────────────

interface RawAlert {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'legal' | 'financial' | 'construction' | 'fraud' | 'noc' | 'general';
  issuedBy: string;
  issuedAt: Date;
  resolvedAt?: Date;
  status: 'active' | 'resolved' | 'investigating';
  sourceUrl?: string;
  affectedUnits?: string[];
}

interface SocietyDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug?: string;
  city?: string;
  riskAlerts?: RawAlert[];
}

interface ProjectDoc {
  _id: mongoose.Types.ObjectId;
  projectName: string;
  slug?: string;
  city?: string;
  riskAlerts?: RawAlert[];
}

// ─────────────────────────────────────────────
// Unified alert shape (public API response)
// ─────────────────────────────────────────────

export interface UnifiedRiskAlert {
  _id: string;
  // UI-compatible fields (matches homepage sampleAlerts shape)
  society: string;          // display name — society name OR project name
  city: string;
  message: string;          // maps to description
  authority: string;        // maps to issuedBy
  date: string;             // relative time string ("2 days ago")
  // Extended fields for full /risk-alerts page
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'legal' | 'financial' | 'construction' | 'fraud' | 'noc' | 'general';
  status: 'active' | 'resolved' | 'investigating';
  sourceType: 'society' | 'project';
  sourceSlug: string;
  sourceUrl?: string;
  affectedUnits?: string[];
  issuedAt: string;         // ISO string
  resolvedAt?: string;
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ApiResponse = {
  success: boolean;
  message?: string;
  code?: string;
  alerts?: UnifiedRiskAlert[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  stats?: {
    activeCount: number;
    criticalCount: number;
    highCount: number;
    societyAlerts: number;
    projectAlerts: number;
    resolvedCount: number;
  };
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
}

/**
 * Relative time formatter — no external libs, pure TS.
 * Examples: "2 days ago", "1 week ago", "3 hours ago", "Just now"
 */
function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);
  const weeks   = Math.floor(days / 7);
  const months  = Math.floor(days / 30);

  if (seconds < 60)   return 'Just now';
  if (minutes < 60)   return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24)     return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7)       return `${days} day${days === 1 ? '' : 's'} ago`;
  if (weeks < 5)      return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

/**
 * Severity sort weight — critical first.
 */
const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
};

function normalizeStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizeParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
}

function clampNumber(val: unknown, min: number, max: number, def: number): number {
  const n = parseInt(String(val ?? def), 10);
  if (Number.isNaN(n)) return def;
  return Math.min(Math.max(n, min), max);
}

/**
 * Convert a raw Society alert subdocument into a UnifiedRiskAlert.
 */
function mapSocietyAlert(
  alert: RawAlert,
  society: SocietyDoc
): UnifiedRiskAlert {
  return {
    _id:          String(alert._id),
    society:      normalizeStr(society.name),
    city:         normalizeStr(society.city),
    message:      normalizeStr(alert.description),
    authority:    normalizeStr(alert.issuedBy),
    date:         relativeTime(new Date(alert.issuedAt)),
    title:        normalizeStr(alert.title),
    severity:     alert.severity,
    category:     alert.category,
    status:       alert.status,
    sourceType:   'society',
    sourceSlug:   normalizeStr(society.slug) || String(society._id),
    sourceUrl:    alert.sourceUrl,
    affectedUnits: alert.affectedUnits,
    issuedAt:     new Date(alert.issuedAt).toISOString(),
    resolvedAt:   alert.resolvedAt
      ? new Date(alert.resolvedAt).toISOString()
      : undefined,
  };
}

/**
 * Convert a raw Project alert subdocument into a UnifiedRiskAlert.
 */
function mapProjectAlert(
  alert: RawAlert,
  project: ProjectDoc
): UnifiedRiskAlert {
  return {
    _id:          String(alert._id),
    society:      normalizeStr(project.projectName),
    city:         normalizeStr(project.city),
    message:      normalizeStr(alert.description),
    authority:    normalizeStr(alert.issuedBy),
    date:         relativeTime(new Date(alert.issuedAt)),
    title:        normalizeStr(alert.title),
    severity:     alert.severity,
    category:     alert.category,
    status:       alert.status,
    sourceType:   'project',
    sourceSlug:   normalizeStr(project.slug) || String(project._id),
    sourceUrl:    alert.sourceUrl,
    affectedUnits: alert.affectedUnits,
    issuedAt:     new Date(alert.issuedAt).toISOString(),
    resolvedAt:   alert.resolvedAt
      ? new Date(alert.resolvedAt).toISOString()
      : undefined,
  };
}

// ─────────────────────────────────────────────
// VALID VALUES (for query param guards)
// ─────────────────────────────────────────────

const VALID_TYPES     = ['all', 'society', 'project'] as const;
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const VALID_CATEGORIES = ['legal', 'financial', 'construction', 'fraud', 'noc', 'general'] as const;
const VALID_STATUSES   = ['active', 'resolved', 'investigating'] as const;

type AlertType     = typeof VALID_TYPES[number];
type AlertSeverity = typeof VALID_SEVERITIES[number];
type AlertCategory = typeof VALID_CATEGORIES[number];
type AlertStatus   = typeof VALID_STATUSES[number];

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return void res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // ── Rate limit ──────────────────────────────
  const rl = await rateLimitSearch(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  // ── Parse + validate query params ──────────
  const rawType     = normalizeParam(req.query.type);
  const rawSeverity = normalizeParam(req.query.severity);
  const rawCategory = normalizeParam(req.query.category);
  const rawStatus   = normalizeParam(req.query.status);
  const rawCity     = normalizeParam(req.query.city).toLowerCase().trim();
  const rawLimit    = req.query.limit;
  const rawPage     = req.query.page;

  const alertType = (
    VALID_TYPES.includes(rawType as AlertType) ? rawType : 'all'
  ) as AlertType;

  const severityFilter = (
    VALID_SEVERITIES.includes(rawSeverity as AlertSeverity) ? rawSeverity : ''
  ) as AlertSeverity | '';

  const categoryFilter = (
    VALID_CATEGORIES.includes(rawCategory as AlertCategory) ? rawCategory : ''
  ) as AlertCategory | '';

  const statusFilter = (
    VALID_STATUSES.includes(rawStatus as AlertStatus) ? rawStatus : 'active'
  ) as AlertStatus;

  const limit = clampNumber(rawLimit, 1, 50, 12);
  const page  = clampNumber(rawPage,  1, 100, 1);
  const skip  = (page - 1) * limit;

  await dbConnect();

  // ─────────────────────────────────────────────
  // BUILD MONGOOSE MATCH for riskAlerts subdocs
  // We query on the nested array using $match on
  // the parent document, then unwind in application
  // layer (avoids complex aggregation for now).
  //
  // For scale: use $unwind + $match aggregation.
  // ─────────────────────────────────────────────

  // Alert-level filters applied in JS after fetch
  function alertMatchesFilters(alert: RawAlert): boolean {
    if (alert.status !== statusFilter) return false;
    if (severityFilter && alert.severity !== severityFilter) return false;
    if (categoryFilter && alert.category !== categoryFilter) return false;
    return true;
  }

  // Parent-level city filter (applied in DB query)
  const cityMatch = rawCity
    ? { city: { $regex: rawCity, $options: 'i' } }
    : {};

  // ─────────────────────────────────────────────
  // FETCH — Societies + Projects in parallel
  // Only fetch docs that HAVE at least one alert
  // matching the status filter (pre-filter in DB).
  // ─────────────────────────────────────────────

  const alertStatusMatch = {
    'riskAlerts.status': statusFilter,
    'riskAlerts.0':      { $exists: true },
  };

  const societyProjection = {
    name:       1,
    slug:       1,
    city:       1,
    riskAlerts: 1,
  };

  const projectProjection = {
    projectName: 1,
    slug:        1,
    city:        1,
    riskAlerts:  1,
  };

  const [societyDocs, projectDocs] = await Promise.all([
    // Fetch societies only if type is 'all' or 'society'
    alertType !== 'project'
      ? (Society as unknown as {
          find: (q: Record<string, unknown>, p: Record<string, number>) => {
            lean: () => Promise<SocietyDoc[]>;
          };
        })
          .find(
            { ...alertStatusMatch, ...cityMatch },
            societyProjection
          )
          .lean() as Promise<SocietyDoc[]>
      : Promise.resolve([] as SocietyDoc[]),

    // Fetch projects only if type is 'all' or 'project'
    alertType !== 'society'
      ? (Project as unknown as {
          find: (q: Record<string, unknown>, p: Record<string, number>) => {
            lean: () => Promise<ProjectDoc[]>;
          };
        })
          .find(
            {
              ...alertStatusMatch,
              ...cityMatch,
              isDeleted: { $ne: true },
              status:    'verified',
            },
            projectProjection
          )
          .lean() as Promise<ProjectDoc[]>
      : Promise.resolve([] as ProjectDoc[]),
  ]);

  // ─────────────────────────────────────────────
  // FLATTEN — unwind nested alerts into flat array
  // ─────────────────────────────────────────────

  const allAlerts: UnifiedRiskAlert[] = [];

  for (const society of societyDocs) {
    if (!Array.isArray(society.riskAlerts)) continue;
    for (const alert of society.riskAlerts) {
      if (!alertMatchesFilters(alert)) continue;
      allAlerts.push(mapSocietyAlert(alert, society));
    }
  }

  for (const project of projectDocs) {
    if (!Array.isArray(project.riskAlerts)) continue;
    for (const alert of project.riskAlerts) {
      if (!alertMatchesFilters(alert)) continue;
      allAlerts.push(mapProjectAlert(alert, project));
    }
  }

  // ─────────────────────────────────────────────
  // SORT — severity desc (critical → low),
  //        then issuedAt desc (newest first)
  // ─────────────────────────────────────────────

  allAlerts.sort((a, b) => {
    const severityDiff =
      (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0);
    if (severityDiff !== 0) return severityDiff;
    return (
      new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );
  });

  // ─────────────────────────────────────────────
  // STATS — computed from full unfiltered set
  // (runs on allAlerts before pagination slice)
  // ─────────────────────────────────────────────

  const stats = {
    activeCount:    allAlerts.filter((a) => a.status === 'active').length,
    criticalCount:  allAlerts.filter((a) => a.severity === 'critical').length,
    highCount:      allAlerts.filter((a) => a.severity === 'high').length,
    societyAlerts:  allAlerts.filter((a) => a.sourceType === 'society').length,
    projectAlerts:  allAlerts.filter((a) => a.sourceType === 'project').length,
    resolvedCount:  allAlerts.filter((a) => a.status === 'resolved').length,
  };

  // ─────────────────────────────────────────────
  // PAGINATE
  // ─────────────────────────────────────────────

  const total       = allAlerts.length;
  const totalPages  = Math.ceil(total / limit);
  const paginated   = allAlerts.slice(skip, skip + limit);

  return void res.status(200).json({
    success: true,
    alerts:  paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
    stats,
  });
}