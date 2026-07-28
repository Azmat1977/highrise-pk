// pages/api/properties/view/[slugOrId].ts
// ═══════════════════════════════════════════════════════════════
// 410 GONE — This endpoint has been replaced.
//
// Use: GET /api/properties/by-slug/[slug]
//
// Supports:
//   - Lookup by slug (canonical)
//   - Lookup by ObjectId (backward compat)
//   - Preview mode (owner/admin)
//   - Contact gating (showPhoneOnListing)
//   - Trust score + True cost in response
// ═══════════════════════════════════════════════════════════════
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  _req: NextApiRequest,
  res:  NextApiResponse
): void {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(410).json({
    success:  false,
    message:  'This endpoint has been removed.',
    redirect: '/api/properties/by-slug/[slug]',
  });
}