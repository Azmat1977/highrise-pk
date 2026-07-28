// pages/api/properties/add.ts
// ═══════════════════════════════════════════════════════════════
// 410 GONE — This endpoint has been replaced.
// Property creation: POST /api/properties
// ═══════════════════════════════════════════════════════════════
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  _req: NextApiRequest,
  res:  NextApiResponse
): void {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(410).json({
    success: false,
    message: 'This endpoint has been removed. Use POST /api/properties instead.',
    redirect: '/api/properties',
  });
}