import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';

type TrendingBlog = {
  _id: string;
  title: string;
  slug: string;
  category: string;
  readTime?: string;
  views?: number;
  commentCount?: number;
  shareCount?: number;
  likeCount?: number;
  trendingScore: number;
  publishedAt?: string | null;
  createdAt?: string | null;
  image?: {
    url?: string;
    public_id?: string;
  };
};

type TrendingResponse =
  | {
      success: true;
      blogs: TrendingBlog[];
    }
  | {
      success: false;
      message: string;
    };

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 10;

function getRecencyBoost(publishedAt?: Date | string | null) {
  if (!publishedAt) return 0;

  const publishedTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedTime)) return 0;

  const now = Date.now();
  const diffDays = Math.floor((now - publishedTime) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return 120;
  if (diffDays <= 30) return 60;
  if (diffDays <= 90) return 25;
  return 0;
}

function calculateTrendingScore(post: any) {
  const views = Number(post?.views || 0);
  const commentCount = Number(post?.commentCount || 0);
  const shareCount = Number(post?.shareCount || 0);
  const likeCount = Number(post?.likeCount || 0);
  const recencyBoost = getRecencyBoost(post?.publishedAt || post?.createdAt || null);

  return (
    views * 1 +
    commentCount * 8 +
    shareCount * 12 +
    likeCount * 5 +
    recencyBoost
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrendingResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    await dbConnect();

    const rawLimit = Number(req.query.limit || DEFAULT_LIMIT);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const now = new Date();
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);

    const baseQuery = {
      status: 'published',
      isDeleted: { $ne: true },
      publishedAt: { $lte: now },
    };

    const candidateBlogs = await Blog.find({
      ...baseQuery,
      publishedAt: { $gte: last90Days, $lte: now },
    })
      .select(
        'title slug category readTime views commentCount shareCount likeCount publishedAt createdAt image'
      )
      .lean();

    const scoredRecentBlogs = (candidateBlogs || [])
      .map((post: any) => ({
        ...post,
        trendingScore: calculateTrendingScore(post),
      }))
      .sort((a, b) => {
        if (b.trendingScore !== a.trendingScore) {
          return b.trendingScore - a.trendingScore;
        }

        const aDate = new Date(a.publishedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.publishedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, limit);

    let blogs = scoredRecentBlogs;

    if (scoredRecentBlogs.length < limit) {
      const excludeIds = scoredRecentBlogs.map((post: any) => post._id);

      const fallbackBlogsRaw = await Blog.find({
        ...baseQuery,
        _id: { $nin: excludeIds },
      })
        .sort({ views: -1, publishedAt: -1 })
        .limit(limit - scoredRecentBlogs.length)
        .select(
          'title slug category readTime views commentCount shareCount likeCount publishedAt createdAt image'
        )
        .lean();

      const fallbackBlogs = (fallbackBlogsRaw || []).map((post: any) => ({
        ...post,
        trendingScore: calculateTrendingScore(post),
      }));

      blogs = [...scoredRecentBlogs, ...fallbackBlogs];
    }

    const formattedBlogs: TrendingBlog[] = blogs.map((post: any) => ({
      _id: String(post._id),
      title: post.title || '',
      slug: post.slug || '',
      category: post.category || 'General',
      readTime: post.readTime || '5 min read',
      views: Number(post.views || 0),
      commentCount: Number(post.commentCount || 0),
      shareCount: Number(post.shareCount || 0),
      likeCount: Number(post.likeCount || 0),
      trendingScore: Number(post.trendingScore || 0),
      publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
      createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
      image: post.image
        ? {
            url: post.image.url || '',
            public_id: post.image.public_id || '',
          }
        : undefined,
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      success: true,
      blogs: formattedBlogs,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch trending blogs',
    });
  }
}
