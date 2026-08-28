//C:\dev\highrise-pk\lib\requireAdmin.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getClientIp,
  requireAdmin as requireCanonicalAdmin,
  requirePermission,
  requireSuperAdmin as requireCanonicalSuperAdmin,
  type AuthToken,
} from "@/lib/requireAuth";

export type AdminToken = AuthToken & {
  authorityRole: "admin" | "superadmin";
  email: string;
};

function isAdminToken(token: AuthToken): token is AdminToken {
  return (
    (token.authorityRole === "admin" ||
      token.authorityRole === "superadmin") &&
    typeof token.email === "string" &&
    token.email.length > 0
  );
}

function sendInvariantError(res: NextApiResponse): null {
  res.status(500).json({
    success: false,
    error: "Authorization state is inconsistent",
    code: "AUTHORIZATION_STATE_ERROR",
  });
  return null;
}

export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AdminToken | null> {
  const token = await requireCanonicalAdmin(req, res);

  if (!token) {
    return null;
  }

  return isAdminToken(token) ? token : sendInvariantError(res);
}

export async function requireAdminPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredPermission: string,
): Promise<AdminToken | null> {
  const token = await requirePermission(
    req,
    res,
    requiredPermission,
  );

  if (!token) {
    return null;
  }

  if (!isAdminToken(token)) {
    res.status(403).json({
      success: false,
      error: "Admin access required",
      code: "ADMIN_REQUIRED",
    });
    return null;
  }

  return token;
}

export async function requireSuperAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AdminToken | null> {
  const token = await requireCanonicalSuperAdmin(req, res);

  if (!token) {
    return null;
  }

  return isAdminToken(token) ? token : sendInvariantError(res);
}

export { getClientIp };
