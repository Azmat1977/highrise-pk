import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
  type: 'post' | 'category' | 'tag' | 'author' | 'page';
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { format = 'xml' } = req.query;

  try {
    await dbConnect();

    const entries: SitemapEntry[] = [];

    // Main blog page
    entries.push({
      loc: `${SITE_URL}/blog`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 0.9,
      type: 'page',
    });

    // All published posts
    const blogs = await Blog.find({
      status: 'published',
      publishedAt: { $lte: new Date() },
    })
      .sort({ publishedAt: -1 })
      .select('slug publishedAt updatedAt')
      .lean();

    for (const blog of blogs) {
      entries.push({
        loc: `${SITE_URL}/blog/${blog.slug}`,
        lastmod: new Date(blog.updatedAt || blog.publishedAt).toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.8,
        type: 'post',
      });
    }

    // Categories
    const categories = await Blog.distinct('category', {
      status: 'published',
      publishedAt: { $lte: new Date() },
      category: { $ne: null },
    });

    for (const cat of categories) {
      if (cat) {
        entries.push({
          loc: `${SITE_URL}/blog/category/${cat.toLowerCase().replace(/\s+/g, '-')}`,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: 0.7,
          type: 'category',
        });
      }
    }

    // Tags (aggregated)
    const tags = await Blog.aggregate([
      { $match: { status: 'published', publishedAt: { $lte: new Date() } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $match: { count: { $gte: 2 } } },
      { $limit: 100 },
    ]).exec();

    for (const tag of tags) {
      if (tag._id) {
        entries.push({
          loc: `${SITE_URL}/blog/tag/${tag._id.toLowerCase().replace(/\s+/g, '-')}`,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: 0.6,
          type: 'tag',
        });
      }
    }

    // Return JSON or XML
    if (format === 'json') {
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({
        success: true,
        count: entries.length,
        entries,
      });
    }

    // Default: XML
    const xml = generateXml(entries);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);

  } catch {
    return res.status(500).json({ success: false, message: 'Failed to generate sitemap' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// XML GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

function generateXml(entries: SitemapEntry[]): string {
  const urlElements = entries
    .map(
      (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
