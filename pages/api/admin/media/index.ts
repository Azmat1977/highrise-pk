import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Media from '@/models/Media';
import { requireAdmin } from '@/lib/requireAuth';

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
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};

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
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { alt: { $regex: search, $options: 'i' } },
        { caption: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

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
  } catch (error: any) {
    console.error('Error fetching media:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching media',
      error: error.message,
    });
  }
}
