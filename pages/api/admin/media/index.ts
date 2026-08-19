import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Media from '@/models/Media';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';

function escapeRegex(input: string): string {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim().slice(0, 80);
}

type MediaListResponse = {
  success: boolean;
  message?: string;
  media?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts?: {
    all: number;
    images: number;
    documents: number;
    trash: number;
  };
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MediaListResponse>
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

  try {
    await dbConnect();

    const {
      page = '1',
      limit = '24',
      folder,
      type,        // 'image', 'document', 'all'
      search,
      deleted = 'false',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 24));
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = {};

    // Deleted filter
    if (deleted === 'true') {
      query.isDeleted = true;
    } else {
      query.isDeleted = { $ne: true };
    }

    // Folder filter
    if (folder && folder !== 'all') {
      query.folder = folder;
    }

    // Type filter
    if (type === 'image') {
      query.resourceType = 'image';
    } else if (type === 'document') {
      query.resourceType = 'raw';
    }

    // Search
    if (search && typeof search === 'string') {
      const safe = escapeRegex(search);
      if (safe.length >= 2) {
        query.$or = [
          { originalName: { $regex: safe, $options: 'i' } },
          { alt: { $regex: safe, $options: 'i' } },
          { caption: { $regex: safe, $options: 'i' } },
        ];
      }
    }

    const ALLOWED_SORT = ['createdAt', 'updatedAt', 'originalName', 'size'] as const;
    const sortField = (ALLOWED_SORT as readonly string[]).includes(String(sortBy))
      ? String(sortBy)
      : 'createdAt';
    const sortOptions: Record<string, 1 | -1> = {
      [sortField]: sortOrder === 'asc' ? 1 : -1,
    };

    // Execute query
    const [media, total] = await Promise.all([
      Media.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('uploadedBy', 'name email')
        .lean(),
      Media.countDocuments(query),
    ]);

    // Get counts
    const [allCount, imagesCount, documentsCount, trashCount] = await Promise.all([
      Media.countDocuments({ isDeleted: { $ne: true } }),
      Media.countDocuments({ isDeleted: { $ne: true }, resourceType: 'image' }),
      Media.countDocuments({ isDeleted: { $ne: true }, resourceType: 'raw' }),
      Media.countDocuments({ isDeleted: true }),
    ]);

    return res.status(200).json({
      success: true,
      media,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      counts: {
        all: allCount,
        images: imagesCount,
        documents: documentsCount,
        trash: trashCount,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching media',
    });
  }
}
