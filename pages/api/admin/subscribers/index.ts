import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    return res.status(429).json({ success: false, message: 'Too many requests' });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  await dbConnect();

  try {
    const { status = 'all', page = '1', limit = '50' } = req.query;

    const query: Record<string, unknown> = {};
    if (status !== 'all') {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [subscribers, total, activeCount, unsubscribedCount] = await Promise.all([
      NewsletterSubscriber.find(query)
        .sort({ subscribedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      NewsletterSubscriber.countDocuments(query),
      NewsletterSubscriber.countDocuments({ status: 'active' }),
      NewsletterSubscriber.countDocuments({ status: 'unsubscribed' }),
    ]);

    return res.status(200).json({
      success: true,
      subscribers,
      stats: {
        total: activeCount + unsubscribedCount,
        active: activeCount,
        unsubscribed: unsubscribedCount,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching subscribers',
    });
  }
}
