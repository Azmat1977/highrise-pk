import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import { requireAdmin } from '@/lib/requireAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await dbConnect();

  try {
    const { status = 'all', page = '1', limit = '50' } = req.query;

    const query: any = {};
    if (status !== 'all') {
      query.status = status;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
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

  } catch (error: any) {
    console.error('Error fetching subscribers:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching subscribers',
      error: error.message,
    });
  }
}
