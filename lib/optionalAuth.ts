import type { NextApiRequest } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import {
  isLegacyMarketplaceRole,
  normalizeRole,
  type LegacyMarketplaceRole,
  type Role,
} from '@/lib/auth';

export type OptionalUserRole = Role | LegacyMarketplaceRole;

export interface OptionalAuthResult {
  id: string;
  email?: string;
  name?: string;
  role: OptionalUserRole;
  authorityRole: Role;
  tokenVersion: number;
}

/**
 * Silent authentication for endpoints that are genuinely public but may expose
 * extra data to a logged-in owner/admin. Unlike requireAuth(), this helper never
 * writes an HTTP response. A missing, expired, revoked, deleted or suspended
 * session simply resolves to null and the caller must continue in public mode.
 */
export async function getOptionalAuth(
  req: NextApiRequest,
): Promise<OptionalAuthResult | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const token = await getToken({ req, secret });
    if (!token) return null;
    const tokenId = typeof token?.id === 'string'
      ? token.id
      : typeof token?.sub === 'string'
        ? token.sub
        : null;

    if (!tokenId) return null;

    await dbConnect();

    const user = await User.findById(tokenId)
      .select('name email role status isDeleted tokenVersion')
      .lean() as {
        _id: unknown;
        name?: string;
        email?: string;
        role?: unknown;
        status?: string;
        isDeleted?: boolean;
        tokenVersion?: number;
      } | null;

    if (!user || user.isDeleted || user.status !== 'active') return null;

    const dbTokenVersion = Number(user.tokenVersion ?? 0);
    const jwtTokenVersion = Number(token.tokenVersion ?? 0);
    if (dbTokenVersion !== jwtTokenVersion) return null;

    const authorityRole = normalizeRole(user.role);
    const role: OptionalUserRole = isLegacyMarketplaceRole(user.role)
      ? user.role
      : authorityRole;

    return {
      id: tokenId,
      email: user.email,
      name: user.name,
      role,
      authorityRole,
      tokenVersion: dbTokenVersion,
    };
  } catch {
    return null;
  }
}
