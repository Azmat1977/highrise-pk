// pages/api/favorites/remove.ts
// Legacy endpoint - redirects to /toggle for backward compatibility

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('X-Deprecated', 'true');
  res.setHeader('X-Redirect-To', '/api/favorites/toggle');
  
  return res.status(308).json({
    success: false,
    message: 'This endpoint is deprecated. Please use POST /api/favorites/toggle instead.',
    deprecationNotice: {
      deprecated: '/api/favorites/remove',
      replacement: '/api/favorites/toggle',
      migration: 'POST /api/favorites/toggle with same body format. It auto-detects add/remove.',
    },
  });
}
