// pages/api/properties/update-coordinates.ts
// ═══════════════════════════════════════════════════════════════
// 410 GONE — This endpoint has been removed.
//
// Coordinates are now set by the client via map picker
// on the add-property form and sent directly to:
//
//   PATCH /api/properties/[id]
//   body: { coordinates: { lat: number, lng: number } }
//
// The Property model validates coordinates are within
// Pakistan boundaries before saving.
// ═══════════════════════════════════════════════════════════════
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  _req: NextApiRequest,
  res:  NextApiResponse
): void {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(410).json({
    success:  false,
    message:  'This endpoint has been removed. Set coordinates via PATCH /api/properties/[id] with { coordinates: { lat, lng } }.',
    redirect: '/api/properties/[id]',
  });
}