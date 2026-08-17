import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    success: false,
    message: 'This legacy endpoint has been retired. Use /api/comments/:id/reply.',
    code: 'ENDPOINT_RETIRED',
  });
}
