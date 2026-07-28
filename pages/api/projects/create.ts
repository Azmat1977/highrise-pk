/**
 * pages/api/projects/create.ts
 *
 * ⛔ DEPRECATED — 410 Gone
 *
 * Project creation has moved to:
 *   POST /api/projects  →  pages/api/projects/index.ts
 *
 * Migration guide:
 *   - Send JSON body (not multipart/form-data)
 *   - Upload media first via POST /api/upload → get back { url, public_id }
 *   - Then POST /api/projects with JSON including featureImageUrl etc.
 *
 * V5.0.0 — Highrise.pk
 */

import type { NextApiRequest, NextApiResponse } from 'next';

type ApiResponse = {
  success: false;
  message: string;
  code: string;
  movedTo: string;
  migration: {
    method: string;
    endpoint: string;
    bodyFormat: string;
    mediaUpload: string;
    docs: string;
  };
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Sat, 01 Jan 2025 00:00:00 GMT');
  res.setHeader('Link', '</api/projects>; rel="successor-version"');

  res.status(410).json({
    success:  false,
    message:  'This endpoint has been permanently removed. Project creation has moved.',
    code:     'ENDPOINT_DEPRECATED',
    movedTo:  'POST /api/projects',
    migration: {
      method:      'POST',
      endpoint:    '/api/projects',
      bodyFormat:  'application/json',
      mediaUpload: 'POST /api/upload → returns { url, public_id } → include in project JSON',
      docs:        'https://highrise.pk/docs/api/projects',
    },
  });
}