// pages/api/admin/properties/verify.ts
// ═══════════════════════════════════════════════════════════════
// 410 GONE — This endpoint has been replaced.
//
// All verification actions are now handled via:
//   PATCH /api/properties/[id]
//   body: { action: string, ...actionParams }
//
// Available actions (admin only):
//   { action: 'verify' }
//     → under_review → verified
//
//   { action: 'reject', rejectionReason: string (min 10 chars) }
//     → pending/under_review → rejected
//
//   { action: 'flag', flagReason: string, internalNotes: string }
//     → under_review/verified → flagged
//
//   { action: 'unflag', internalNotes: string }
//     → flagged → under_review
//
//   { action: 'feature' }
//     → verified only → isFeatured: true
//
//   { action: 'unfeature' }
//     → isFeatured: false
//
// Lifecycle state machine is enforced.
// Self-verification is blocked.
// All actions logged via logSecurityEvent().
// ═══════════════════════════════════════════════════════════════
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  _req: NextApiRequest,
  res:  NextApiResponse
): void {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(410).json({
    success: false,
    message: 'This endpoint has been removed.',
    redirect: '/api/properties/[id]',
    actions: {
      verify:   { method: 'PATCH', body: { action: 'verify' } },
      reject:   { method: 'PATCH', body: { action: 'reject', rejectionReason: 'string (min 10 chars)' } },
      flag:     { method: 'PATCH', body: { action: 'flag', flagReason: 'string', internalNotes: 'string' } },
      unflag:   { method: 'PATCH', body: { action: 'unflag', internalNotes: 'string' } },
      feature:  { method: 'PATCH', body: { action: 'feature' } },
      unfeature:{ method: 'PATCH', body: { action: 'unfeature' } },
    },
  });
}