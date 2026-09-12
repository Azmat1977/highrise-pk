// pages/api/users/index.ts
// SECURITY: Legacy user-listing endpoint retired (S3 audit — unauthenticated
// full-collection dump). Admin user management lives under /api/admin/*.
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    success: false,
    code: 'ENDPOINT_RETIRED',
    message: 'This endpoint has been retired for security reasons.',
  });
}
