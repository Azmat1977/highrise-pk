import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'relevance' | 'newest' | 'oldest' | 'popular';
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Sanitize search query
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeQuery(query: string): string {
  if (!query) return '';
  // Remove special regex characters, trim, limit length
  return query
    .replace(/[.*+?^${}()|[\]\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Parse request params
// ─────────────────────────────────────────────────────────────────────────────

function parseFilters(req: NextApiRequest): SearchFilters {
  const {
    q,
    query,
    category,
    tags,
    author,
    dateFrom,
    dateTo,
    sort = 'relevance',
    page = '1',
    limit = String(DEFAULT_LIMIT),
  } = req.query;

  // Parse tags (can be comma-separated or array)
  let parsedTags: string[] = [];
  if (tags) {
    if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => String(t).trim()).filter(Boolean);
    } else {
      parsedTags = String(tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }

  return {
    query: sanitizeQuery(String(q || query || '')),
    category: category ? String(category).trim() : undefined,
    tags: parsedTags.length > 0 ? parsedTags : undefined,
    author: author ? String(author).trim() : undefined,
    dateFrom: dateFrom ? String(dateFrom) : undefined,
    dateTo: dateTo ? String(dateTo) : undefined,
    sort: ['relevance', 'newest', 'oldest', 'popular'].includes(String(sort))
      ? (String(sort) as SearchFilters['sort'])
      : 'relevance',
    page: Math.max(1, parseInt(String(page), 10) || 1),
    limit: Math.min(MAX_LIMIT, Math.max(1, parseInt(String(limit), 10) || DEFAULT_LIMIT)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const filters = parseFilters(req);
    const { query, category, tags, author, dateFrom, dateTo, sort, page, limit } = filters;

    // ─────────────────────────────────────────────────────────────────────────
    // BUILD QUERY
    // ─────────────────────────────────────────────────────────────────────────

    const matchConditions: Record<string, any> = {
      status: 'published',
      publishedAt: { $lte: new Date() },
    };

    // Text search
    let useTextScore = false;
    if (query && query.length >= 2) {
      // Try text search first, fallback to regex
      try {
        matchConditions.$text = { $search: query };
        useTextScore = true;
      } catch {
        // Fallback to regex search
        const searchRegex = new RegExp(query, 'i');
        matchConditions.$or = [
          { title: searchRegex },
          { excerpt: searchRegex },
          { content: searchRegex },
          { tags: searchRegex },
        ];
      }
    }

    // Category filter
    if (category) {
      matchConditions.category = new RegExp(`^${category.replace(/-/g, '[\\s-]')}$`, 'i');
    }

    // Tags filter
    if (tags && tags.length > 0) {
      matchConditions.tags = {
        $in: tags.map((tag) => new RegExp(tag.replace(/-/g, '[\\s-]'), 'i')),
      };
    }

    // Author filter
    if (author) {
      const authorRegex = new RegExp(author.replace(/-/g, '[\\s-]'), 'i');
      matchConditions.$or = [
        { author: authorRegex },
        { authorName: authorRegex },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchConditions.publishedAt = matchConditions.publishedAt || {};
      if (dateFrom) {
        matchConditions.publishedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        matchConditions.publishedAt.$lte = new Date(dateTo);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUILD SORT
    // ─────────────────────────────────────────────────────────────────────────

    let sortOption: Record<string, any> = { publishedAt: -1 };

    switch (sort) {
      case 'relevance':
        if (useTextScore) {
          sortOption = { score: { $meta: 'textScore' }, publishedAt: -1 };
        }
        break;
      case 'newest':
        sortOption = { publishedAt: -1 };
        break;
      case 'oldest':
        sortOption = { publishedAt: 1 };
        break;
      case 'popular':
        sortOption = { views: -1, publishedAt: -1 };
        break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EXECUTE QUERY
    // ─────────────────────────────────────────────────────────────────────────

    const skip = ((page || 1) - 1) * (limit || DEFAULT_LIMIT);

    // Build projection
    const projection: Record<string, any> = {
      title: 1,
      slug: 1,
      excerpt: 1,
      category: 1,
      author: 1,
      authorName: 1,
      publishedAt: 1,
      image: 1,
      readTime: 1,
      views: 1,
      tags: 1,
      featured: 1,
    };

    if (useTextScore) {
      projection.score = { $meta: 'textScore' };
    }

    // Get results
    let resultsQuery = Blog.find(matchConditions, projection)
      .sort(sortOption)
      .skip(skip)
      .limit(limit || DEFAULT_LIMIT)
      .lean();

    // Get total count
    const [results, totalCount] = await Promise.all([
      resultsQuery.exec(),
      Blog.countDocuments(matchConditions),
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // FORMAT RESPONSE
    // ─────────────────────────────────────────────────────────────────────────

    const articles = results.map((article: any) => ({
      _id: article._id.toString(),
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || '',
      category: article.category || 'General',
      author: article.authorName || article.author || 'Highrise Team',
      publishedAt: article.publishedAt?.toISOString() || null,
      image: article.image?.url || null,
      readTime: article.readTime || '5 min read',
      views: article.views || 0,
      tags: article.tags || [],
      featured: article.featured || false,
      relevanceScore: article.score || null,
    }));

    const totalPages = Math.ceil(totalCount / (limit || DEFAULT_LIMIT));

    // ─────────────────────────────────────────────────────────────────────────
    // GET FILTER OPTIONS (for UI)
    // ─────────────────────────────────────────────────────────────────────────

    const [categories, popularTags] = await Promise.all([
      Blog.distinct('category', {
        status: 'published',
        publishedAt: { $lte: new Date() },
        category: { $ne: null },
      }),
      Blog.aggregate([
        { $match: { status: 'published', publishedAt: { $lte: new Date() } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).exec(),
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // SEND RESPONSE
    // ─────────────────────────────────────────────────────────────────────────

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    return res.status(200).json({
      success: true,
      query: query || null,
      filters: {
        category: category || null,
        tags: tags || [],
        author: author || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      },
      sort,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: (page || 1) < totalPages,
      },
      results: articles,
      filterOptions: {
        categories: categories.filter(Boolean).sort(),
        popularTags: popularTags.map((t: any) => ({
          tag: t._id,
          count: t.count,
        })),
      },
    });

  } catch {
    return res.status(500).json({
      success: false,
      message: 'Search failed. Please try again.',
    });
  }
}
