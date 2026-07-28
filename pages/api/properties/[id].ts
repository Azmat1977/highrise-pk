// pages/api/properties/[id].ts
// ═══════════════════════════════════════════════════════════════
// 410 GONE — This endpoint has been replaced.
//
// GET    → GET  /api/properties/[id]/index  (by ObjectId)
// GET    → GET  /api/properties/by-slug/[slug] (by slug — preferred)
// PATCH  → PATCH /api/properties/[id]/index
//
// NOTE: This file must remain as a stub — do NOT delete it.
// Deleting it would make the [id]/ folder route inaccessible
// in Next.js Pages Router (route conflict resolution requires
// this file to exist as a passthrough stub).
// ═══════════════════════════════════════════════════════════════
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  _req: NextApiRequest,
  res:  NextApiResponse
): void {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(410).json({
    success: false,
    message: 'This endpoint has been replaced.',
    routes: {
      getBySlug:  'GET /api/properties/by-slug/[slug]',
      getById:    'GET /api/properties/[id]',
      update:     'PATCH /api/properties/[id]',
      trash:      'PATCH /api/properties/[id]/trash',
      permDelete: 'DELETE /api/properties/[id]/permanent-delete',
    },
  });
}