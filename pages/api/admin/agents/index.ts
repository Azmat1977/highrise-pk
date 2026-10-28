// pages/api/admin/agents/index.ts
// Highrise.pk — Admin Agent List API
// GET: paginated agent list with counts + search + filter
// Access: Admin only

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import AgentProfile from '@/models/AgentProfile';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentListItem {
  _id: string;
  displayName: string;
  agentType: string;
  agencyName?: string;
  city: string;
  status: string;
  verificationLevel: string;
  slug?: string;
  email: string;
  isPremium: boolean;
  trustScore: { overall: number };
  badges: string[];
  documents: {
    profilePhoto?: { url: string };
  };
  agencyLogo?: { url: string };
  createdAt: string;
  isDeleted: boolean;
}

interface Counts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  trash: number;
}

interface ListResponse {
  success: boolean;
  agents?: AgentListItem[];
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

// ─── Query validation ─────────────────────────────────────────────────────────

const QuerySchema = z.object({
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
  status:  z.enum(['draft','pending','approved','rejected','suspended','info_required']).optional(),
  deleted: z.enum(['true','false']).default('false'),
  search:  z.string().trim().max(100).optional(),
});

// ─── Security headers ─────────────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse>
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, message: 'Method not allowed', requestId });
    return;
  }

  // ── Rate limit ──────────────────────────────────────────────────────────────
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

  // ── Auth ────────────────────────────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── DB ──────────────────────────────────────────────────────────────────────
  await dbConnect();

  try {
    // ── Validate query ────────────────────────────────────────────────────────
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        requestId,
      });
      return;
    }

    const { page, limit, status, deleted, search } = parsed.data;
    const isTrash = deleted === 'true';

    // ── Build filter ──────────────────────────────────────────────────────────
    const filter: Record<string, unknown> = {
      isDeleted: isTrash,
    };

    if (status) {
      filter['status'] = status;
    }

    if (search) {
      filter['$or'] = [
        { displayName: { $regex: search, $options: 'i' } },
        { agencyName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // ── Parallel: counts + paginated list ─────────────────────────────────────
    const [
      allCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      suspendedCount,
      trashCount,
      total,
      agents,
    ] = await Promise.all([
      AgentProfile.countDocuments({ isDeleted: false }),
      AgentProfile.countDocuments({ isDeleted: false, status: 'pending' }),
      AgentProfile.countDocuments({ isDeleted: false, status: 'approved' }),
      AgentProfile.countDocuments({ isDeleted: false, status: 'rejected' }),
      AgentProfile.countDocuments({ isDeleted: false, status: 'suspended' }),
      AgentProfile.countDocuments({ isDeleted: true }),
      AgentProfile.countDocuments(filter),
      AgentProfile.find(filter)
        .select(
          'displayName agentType agencyName city status verificationLevel ' +
          'slug email isPremium trustScore badges documents.profilePhoto ' +
          'agencyLogo createdAt isDeleted'
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<AgentListItem[]>(),
    ]);

    const counts: Counts = {
      all:       allCount,
      pending:   pendingCount,
      approved:  approvedCount,
      rejected:  rejectedCount,
      suspended: suspendedCount,
      trash:     trashCount,
    };

    res.status(200).json({
      success: true,
      agents,
      counts,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
      requestId,
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to load agents.',
      requestId,
    });
  }
}