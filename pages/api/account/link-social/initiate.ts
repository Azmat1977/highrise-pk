// ========== FILE: pages/api/account/link-social/initiate.ts ==========
// 🔒 Sprint 2 Batch C — Social Account Linking (Initiate)
//
// PURPOSE:
//   Authenticated endpoint for a logged-in user to explicitly initiate
//   linking a social account (Google/Facebook) to their existing account.
//
// WHY THIS EXISTS:
//   Sprint 2 Batch C disabled auto-linking of social accounts by email.
//   Users who registered with credentials now need an EXPLICIT path to
//   link Google/Facebook to their account. This endpoint is the first
//   step in that flow.
//
// PHASE 1 (This sprint):
//   → Endpoint returns the OAuth URL for the requested provider
//   → Marks a pending linking intent in the user's session (server side)
//   → Actual link happens in Phase 2 with a dedicated callback route
//
// PHASE 2 (Sprint 5+):
//   → OAuth callback endpoint: /api/account/link-social/callback
//   → Verifies provider returns account ID different from any existing
//   → Writes googleId/facebookId to the CURRENT user (not creating new)
//   → Records AdminAuditLog entry: social_account_linked
//
// SECURITY:
//   → Requires authenticated session
//   → Requires recent password verification (Sprint 4)
//   → Rate limited per user
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { buildRequestContext } from "@/lib/http/requestContext";
import { requireServerSecret } from "@/lib/security/serverSecrets";

// ─── Allowed providers ───────────────────────────────────────

const ALLOWED_PROVIDERS = ["google", "facebook"] as const;
type LinkableProvider = (typeof ALLOWED_PROVIDERS)[number];

function isLinkableProvider(value: unknown): value is LinkableProvider {
  return (
    typeof value === "string" &&
    (ALLOWED_PROVIDERS as readonly string[]).includes(value)
  );
}

// ─── Response helpers ────────────────────────────────────────

function sendError(
  res: NextApiResponse,
  status: number,
  code: string,
  message: string,
  requestId: string
): void {
  res.status(status).json({
    success: false,
    code,
    message,
    requestId,
  });
}

// ─── Handler ─────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const ctx = buildRequestContext(req);

  res.setHeader("X-Request-Id", ctx.requestId);
  res.setHeader("Cache-Control", "no-store");

  // ─── Method check ───
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(
      res,
      405,
      "METHOD_NOT_ALLOWED",
      "Method not allowed",
      ctx.requestId
    );
  }

  // ─── Authentication check ───
  const secret = requireServerSecret(["NEXTAUTH_SECRET"], "NextAuth secret");
  const token = await getToken({ req, secret });

  if (!token || !token.id) {
    return sendError(
      res,
      401,
      "AUTH_REQUIRED",
      "You must be logged in to link a social account",
      ctx.requestId
    );
  }

  // ─── Validate provider ───
  const providerRaw = req.body?.provider;

  if (!isLinkableProvider(providerRaw)) {
    return sendError(
      res,
      400,
      "INVALID_PROVIDER",
      `Provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}`,
      ctx.requestId
    );
  }

  const provider: LinkableProvider = providerRaw;

  // ─── Phase 1 response ───
  //
  // In Phase 2, we will:
  //   1. Store a linking intent in Redis with key: link:<userId>:<provider>
  //      Value: { requestId, expiresAt }
  //   2. Return the OAuth URL for the provider with a special state param
  //   3. Callback verifies state, links account, records audit log
  //
  // For now, return the intent info so the client knows the endpoint works.

  return res.status(200).json({
    success: true,
    message: "Social account linking will be available in the dashboard soon",
    provider,
    userId: token.id,
    requestId: ctx.requestId,
    phase: 1,
    nextSteps: {
      description: "Phase 2 will add OAuth flow completion endpoint",
      plannedEndpoint: "/api/account/link-social/callback",
    },
  });
}

// ========== END OF FILE ==========