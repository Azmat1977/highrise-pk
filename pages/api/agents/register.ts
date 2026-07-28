// C:\dev\highrise-pk\pages\api\agent\register.ts
// DEPRECATED (enterprise hardening)
// This legacy endpoint allowed public agent registration with uploads and user role mutation.
// It is intentionally disabled to prevent privilege escalation and CNIC/PII leakage.
// Use instead:
// - UI: /onboarding/business?role=agent
// - API: /api/onboarding/business (session-only, CNIC gating, safe storage)

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

function setSecurityHeaders(res: NextApiResponse, requestId: string) {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

function getRequestId(req: NextApiRequest) {
  const hdr = req.headers["x-request-id"];
  if (typeof hdr === "string" && hdr.trim()) return hdr.trim();
  return crypto.randomUUID();
}

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = getRequestId(req);
  setSecurityHeaders(res, requestId);

  // We return 410 to clearly signal "gone" while not leaking anything.
  // Frontend should use onboarding flow.
  return res.status(410).json({
    success: false,
    message: "This endpoint is deprecated. Please use the onboarding flow.",
    next: "/onboarding/business?role=agent",
    requestId,
  });
}
