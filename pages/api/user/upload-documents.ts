// pages/api/user/upload-documents.ts
// SECURITY: Legacy endpoint intentionally disabled.
// It accepted an arbitrary email address and could overwrite another user's documents.
// Use the authenticated /api/upload flow and the role-specific onboarding APIs instead.

import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Allow", []);
  return res.status(410).json({
    success: false,
    code: "LEGACY_UPLOAD_DISABLED",
    message: "This legacy upload endpoint has been retired.",
  });
}
