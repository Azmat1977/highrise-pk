// pages/api/properties/delete.ts
// ═══════════════════════════════════════════════════════════════
// 410 GONE — This endpoint has been replaced.
// Trash/restore: PATCH /api/properties/[id]/trash
// ═══════════════════════════════════════════════════════════════
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  _req: NextApiRequest,
  res:  NextApiResponse
): void {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(410).json({
    success: false,
    message: 'This endpoint has been removed. Use PATCH /api/properties/[id]/trash instead.',
    redirect: '/api/properties/[id]/trash',
  });
}