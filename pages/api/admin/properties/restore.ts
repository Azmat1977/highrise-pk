// pages/api/admin/properties/restore.ts
// ═══════════════════════════════════════════════════════════════
// 410 GONE — This endpoint has been replaced.
//
// Restore a trashed property:
//   PATCH /api/properties/[id]/trash
//   body: { isDeleted: false, reason?: string }
//
// Works for both owner and admin.
// Triggers pre-save hooks (trustScore, status sync, etc.)
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
    redirect: '/api/properties/[id]/trash',
    usage: {
      method: 'PATCH',
      path:   '/api/properties/[id]/trash',
      body:   { isDeleted: false, reason: 'optional reason string' },
    },
  });
}