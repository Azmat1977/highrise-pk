// pages/api/admin/applications/index.ts
// 🔒 ADMIN APPLICATIONS LIST API - HIGHRISE.PK
// V5.9.0 — Combined list of agent + developer applications
// GET only — paginated, searchable, filterable
// ═══════════════════════════════════════════════════════════════

import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAuth';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

import AgentProfile from '@/models/AgentProfile';
import DeveloperProfile from '@/models/DeveloperProfile';
import SocietyProfile from '@/models/SocietyProfile';

// ─── Types ─────────────────────────────────────────────────────

type AppType = 'agent' | 'developer' | 'society';
type AppStatus = 'pending' | 'approved' | 'rejected' | 'info_required' | 'suspended';

interface ApplicationListItem {
  _id: string;
  type: AppType;
  displayName: string;          // Agent: displayName | Developer/Society: companyName/societyName
  agencyOrCompany: string;       // Agent: agencyName | Developer: companyName | Society: societyName
  city: string;
  email: string;
  status: AppStatus;
  submittedAt: string | null;
  createdAt: string;
  // Type-specific
  agentType?: string;            // For agents
  developerType?: string;        // For developers
  authority?: string;            // For societies (NOC authority)
  nocNumber?: string;            // For societies
}

interface Counts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  info_required: number;
  // Per-type counts
  agents: number;
  developers: number;
  societies: number;
}

interface ListResponse {
  success: boolean;
  applications?: ApplicationListItem[];
  counts?: Counts;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
  message?: string;
  requestId: string;
}

// ─── Query validation ──────────────────────────────────────────

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['agent', 'developer', 'society', 'all']).default('all'),
  status: z
    .enum(['pending', 'approved', 'rejected', 'info_required', 'suspended', 'all'])
    .default('pending'),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

// ─── Lean shapes ───────────────────────────────────────────────

interface AgentLean {
  _id: { toString(): string };
  displayName?: string;
  agencyName?: string;
  agentType?: string;
  city?: string;
  email?: string;
  status?: string;
  submittedForReviewAt?: Date;
  createdAt: Date;
}

interface DeveloperLean {
  _id: { toString(): string };
  companyName?: string;
  developerType?: string;
  city?: string;
  email?: string;
  status?: string;
  createdAt: Date;
}

interface SocietyLean {
  _id: { toString(): string };
  societyName?: string;
  authority?: string;
  nocNumber?: string;
  city?: string;
  officeEmail?: string;
  status?: string;
  submittedAt?: Date;
  createdAt: Date;
}

// ─── Security headers ──────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

// ─── Handler ───────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse>
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
    return;
  }

  // ── Rate limit ─────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({
      success: false,
      message: `Too many requests. Retry in ${rl.retryAfter ?? 60} seconds.`,
      requestId,
    });
    return;
  }

  // ── Auth ───────────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── DB ─────────────────────────────────────────────────────
  try {
    await dbConnect();

    // ── Validate query ──────────────────────────────────────
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        requestId,
      });
      return;
    }

    const { page, limit, type, status, search, sort } = parsed.data;

    // ── Build status filter ─────────────────────────────────
    const statusFilter: Record<string, unknown> = { isDeleted: false };
    if (status !== 'all') {
      statusFilter.status = status;
    }

    // ── Build search filter ─────────────────────────────────
    const buildSearchFilter = (
      forType: AppType
    ): Record<string, unknown> => {
      if (!search) return {};
      const regex = { $regex: search, $options: 'i' };
      if (forType === 'agent') {
        return {
          $or: [
            { displayName: regex },
            { agencyName: regex },
            { city: regex },
            { email: regex },
          ],
        };
      } else {
        return {
          $or: [
            { companyName: regex },
            { city: regex },
            { email: regex },
          ],
        };
      }
    };

    const agentFilter = {
      ...statusFilter,
      ...buildSearchFilter('agent'),
    };

    const developerFilter = {
      ...statusFilter,
      ...buildSearchFilter('developer'),
    };

    const sortDir: 1 | -1 = sort === 'oldest' ? 1 : -1;

    // ── Run queries based on type filter ────────────────────
    // ── Build society search filter ─────────────────────────
    const societyFilter: Record<string, unknown> = { ...statusFilter };
    if (search) {
      const regex = { $regex: search, $options: 'i' };
      societyFilter.$or = [
        { societyName: regex },
        { registeredName: regex },
        { nocNumber: regex },
        { city: regex },
        { officeEmail: regex },
      ];
    }

    let agents: AgentLean[] = [];
    let developers: DeveloperLean[] = [];
    let societies: SocietyLean[] = [];
    let agentTotal = 0;
    let developerTotal = 0;
    let societyTotal = 0;

    if (type === 'agent' || type === 'all') {
      [agents, agentTotal] = await Promise.all([
        AgentProfile.find(agentFilter)
          .select(
            'displayName agencyName agentType city email status submittedForReviewAt createdAt'
          )
          .sort({ createdAt: sortDir })
          .limit(type === 'all' ? limit : limit * page)
          .lean<AgentLean[]>(),
        AgentProfile.countDocuments(agentFilter),
      ]);
    }

    if (type === 'developer' || type === 'all') {
      [developers, developerTotal] = await Promise.all([
        DeveloperProfile.find(developerFilter)
          .select(
            'companyName developerType city email status createdAt'
          )
          .sort({ createdAt: sortDir })
          .limit(type === 'all' ? limit : limit * page)
          .lean<DeveloperLean[]>(),
        DeveloperProfile.countDocuments(developerFilter),
      ]);
    }

    if (type === 'society' || type === 'all') {
      [societies, societyTotal] = await Promise.all([
        SocietyProfile.find(societyFilter)
          .select(
            'societyName authority nocNumber city officeEmail status submittedAt createdAt'
          )
          .sort({ createdAt: sortDir })
          .limit(type === 'all' ? limit : limit * page)
          .lean<SocietyLean[]>(),
        SocietyProfile.countDocuments(societyFilter),
      ]);
    }

    // ── Normalize to common ApplicationListItem shape ───────
    const agentItems: ApplicationListItem[] = agents.map((a) => ({
      _id: a._id.toString(),
      type: 'agent',
      displayName: a.displayName ?? 'Unnamed Agent',
      agencyOrCompany: a.agencyName ?? a.displayName ?? '—',
      city: a.city ?? '—',
      email: a.email ?? '—',
      status: (a.status ?? 'pending') as AppStatus,
      submittedAt: a.submittedForReviewAt
        ? new Date(a.submittedForReviewAt).toISOString()
        : null,
      createdAt: a.createdAt.toISOString(),
      agentType: a.agentType,
    }));

    const developerItems: ApplicationListItem[] = developers.map((d) => ({
      _id: d._id.toString(),
      type: 'developer',
      displayName: d.companyName ?? 'Unnamed Company',
      agencyOrCompany: d.companyName ?? '—',
      city: d.city ?? '—',
      email: d.email ?? '—',
      status: (d.status ?? 'pending') as AppStatus,
      submittedAt: null,
      createdAt: d.createdAt.toISOString(),
      developerType: d.developerType,
    }));

    const societyItems: ApplicationListItem[] = societies.map((s) => ({
      _id: s._id.toString(),
      type: 'society',
      displayName: s.societyName ?? 'Unnamed Society',
      agencyOrCompany: s.societyName ?? '—',
      city: s.city ?? '—',
      email: s.officeEmail ?? '—',
      status: (s.status ?? 'pending') as AppStatus,
      submittedAt: s.submittedAt
        ? new Date(s.submittedAt).toISOString()
        : null,
      createdAt: s.createdAt.toISOString(),
      authority: s.authority,
      nocNumber: s.nocNumber,
    }));

    // ── Merge and paginate ──────────────────────────────────
    let merged: ApplicationListItem[];
    let total: number;

    if (type === 'all') {
      merged = [...agentItems, ...developerItems, ...societyItems].sort(
        (a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return sortDir === 1 ? aTime - bTime : bTime - aTime;
        }
      );
      total = agentTotal + developerTotal + societyTotal;

      // Apply pagination after merge
      const startIdx = (page - 1) * limit;
      merged = merged.slice(startIdx, startIdx + limit);
    } else if (type === 'agent') {
      merged = agentItems.slice((page - 1) * limit, page * limit);
      total = agentTotal;
    } else if (type === 'developer') {
      merged = developerItems.slice((page - 1) * limit, page * limit);
      total = developerTotal;
    } else {
      // society
      merged = societyItems.slice((page - 1) * limit, page * limit);
      total = societyTotal;
    }

    // ── Counts (always all-time, ignore current filters) ────
    const [
      pendingAgents,
      approvedAgents,
      rejectedAgents,
      infoReqAgents,
      pendingDevs,
      approvedDevs,
      rejectedDevs,
      infoReqDevs,
      pendingSocieties,
      approvedSocieties,
      rejectedSocieties,
      infoReqSocieties,
      totalAgents,
      totalDevs,
      totalSocieties,
    ] = await Promise.all([
      AgentProfile.countDocuments({ isDeleted: false, status: 'pending' }),
      AgentProfile.countDocuments({ isDeleted: false, status: 'approved' }),
      AgentProfile.countDocuments({ isDeleted: false, status: 'rejected' }),
      AgentProfile.countDocuments({ isDeleted: false, status: 'info_required' }),
      DeveloperProfile.countDocuments({ isDeleted: false, status: 'pending' }),
      DeveloperProfile.countDocuments({ isDeleted: false, status: 'approved' }),
      DeveloperProfile.countDocuments({ isDeleted: false, status: 'rejected' }),
      DeveloperProfile.countDocuments({ isDeleted: false, status: 'info_required' }),
      SocietyProfile.countDocuments({ status: 'pending' }),
      SocietyProfile.countDocuments({ status: 'approved' }),
      SocietyProfile.countDocuments({ status: 'rejected' }),
      SocietyProfile.countDocuments({ status: 'info_required' }),
      AgentProfile.countDocuments({ isDeleted: false }),
      DeveloperProfile.countDocuments({ isDeleted: false }),
      SocietyProfile.countDocuments({}),
    ]);

    const counts: Counts = {
      all: totalAgents + totalDevs + totalSocieties,
      pending: pendingAgents + pendingDevs + pendingSocieties,
      approved: approvedAgents + approvedDevs + approvedSocieties,
      rejected: rejectedAgents + rejectedDevs + rejectedSocieties,
      info_required: infoReqAgents + infoReqDevs + infoReqSocieties,
      agents: totalAgents,
      developers: totalDevs,
      societies: totalSocieties,
    };

    res.status(200).json({
      success: true,
      applications: merged,
      counts,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
      requestId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';

    await logSecurityEvent({
      type: 'system_error',
      severity: 'high',
      userId: auth.id,
      req,
      metadata: {
        endpoint: '/api/admin/applications',
        errorMessage: message,
      },
    }).catch(() => {
      /* never throw from error handler */
    });

    res.status(500).json({
      success: false,
      message: 'Failed to load applications.',
      requestId,
    });
  }
}