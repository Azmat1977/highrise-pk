// pages/api/comments/[id]/upload-media.ts
// SECURITY: Legacy comment-media endpoint intentionally disabled.
// A future implementation must use authenticated Cloudinary uploads and comment ownership checks.

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Allow', []);
  return res.status(410).json({
    success: false,
    code: 'LEGACY_COMMENT_UPLOAD_DISABLED',
    message: 'Comment media upload is temporarily unavailable.',
  });
}
