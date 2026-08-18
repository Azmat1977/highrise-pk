//C:\dev\highrise-pk\pages\api\admin\cloudinary-config.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, sendRateLimitResponse, setRateLimitHeaders } from '@/lib/rateLimit';

/**
 * Legacy endpoint retained only to make old admin clients fail safely.
 * Direct browser Cloudinary upload presets were retired in Batch 2.
 * All uploads must go through POST /api/upload so file validation,
 * authorization, rate limiting, ownership tagging, and server-side
 * Cloudinary credentials are enforced in one place.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── Rate limit (First) ───────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  return res.status(410).json({
    success: false,
    code: 'DIRECT_UPLOAD_RETIRED',
    message: 'Direct Cloudinary browser uploads are retired. Use the protected Highrise upload service.',
  });
}
