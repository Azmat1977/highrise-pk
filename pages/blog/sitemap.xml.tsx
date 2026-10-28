//C:\dev\highrise-pk\pages\blog\sitemap.xml.tsx
import { GetServerSideProps } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: Array<{
    loc: string;
    title?: string;
    caption?: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildUrlElement(url: SitemapUrl): string {
  let element = `  <url>
    <loc>${escapeXml(url.loc)}</loc>`;

  if (url.lastmod) {
    element += `
    <lastmod>${url.lastmod}</lastmod>`;
  }

  if (url.changefreq) {
    element += `
    <changefreq>${url.changefreq}</changefreq>`;
  }

  if (url.priority !== undefined) {
    element += `
    <priority>${url.priority.toFixed(1)}</priority>`;
  }

  // Image sitemap extension
  if (url.images && url.images.length > 0) {
    for (const image of url.images) {
      element += `
    <image:image>
      <image:loc>${escapeXml(image.loc)}</image:loc>`;
      
      if (image.title) {
        element += `
      <image:title>${escapeXml(image.title)}</image:title>`;
      }
      
      if (image.caption) {
        element += `
      <image:caption>${escapeXml(image.caption)}</image:caption>`;
      }
      
      element += `
    </image:image>`;
    }
  }

  element += `
  </url>`;

  return element;
}

function generateSitemap(urls: SitemapUrl[]): string {
  const urlElements = urls.map(buildUrlElement).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
    http://www.google.com/schemas/sitemap-image/1.1
    http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">
${urlElements}
</urlset>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT (empty - we return XML)
// ─────────────────────────────────────────────────────────────────────────────

export default function BlogSitemap() {
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER SIDE
// ─────────────────────────────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    await dbConnect();

    const urls: SitemapUrl[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // 1. MAIN BLOG PAGE
    // ─────────────────────────────────────────────────────────────────────────
    urls.push({
      loc: `${SITE_URL}/blog`,
      lastmod: formatDate(new Date()),
      changefreq: 'daily',
      priority: 0.9,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ALL PUBLISHED BLOG POSTS
    // ─────────────────────────────────────────────────────────────────────────
    const blogs = await Blog.find({
      status: 'published',
      publishedAt: { $lte: new Date() },
    })
      .sort({ publishedAt: -1 })
      .select('slug title publishedAt updatedAt image category tags')
      .lean();

    for (const blog of blogs) {
      const blogUrl: SitemapUrl = {
        loc: `${SITE_URL}/blog/${blog.slug}`,
        lastmod: formatDate(new Date(blog.updatedAt || blog.publishedAt)),
        changefreq: 'weekly',
        priority: 0.8,
      };

      // Add featured image
      if (blog.image?.url) {
        blogUrl.images = [
          {
            loc: blog.image.url,
            title: blog.title,
            caption: `Featured image for: ${blog.title}`,
          },
        ];
      }

      urls.push(blogUrl);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CATEGORY PAGES
    // ─────────────────────────────────────────────────────────────────────────
    const categories = await Blog.aggregate([
      { $match: { status: 'published', publishedAt: { $lte: new Date() } } },
      { $group: { _id: '$category', count: { $sum: 1 }, lastPost: { $max: '$publishedAt' } } },
      { $match: { _id: { $ne: null } } },
    ]).exec();

    for (const cat of categories) {
      if (cat._id) {
        const categorySlug = cat._id.toLowerCase().replace(/\s+/g, '-');
        urls.push({
          loc: `${SITE_URL}/blog/category/${categorySlug}`,
          lastmod: formatDate(new Date(cat.lastPost)),
          changefreq: 'weekly',
          priority: 0.7,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. TAG PAGES
    // ─────────────────────────────────────────────────────────────────────────
    const tags = await Blog.aggregate([
      { $match: { status: 'published', publishedAt: { $lte: new Date() } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 }, lastPost: { $max: '$publishedAt' } } },
      { $match: { count: { $gte: 2 } } }, // Only tags with 2+ articles
      { $sort: { count: -1 } },
      { $limit: 100 }, // Top 100 tags
    ]).exec();

    for (const tag of tags) {
      if (tag._id) {
        const tagSlug = tag._id.toLowerCase().replace(/\s+/g, '-');
        urls.push({
          loc: `${SITE_URL}/blog/tag/${tagSlug}`,
          lastmod: formatDate(new Date(tag.lastPost)),
          changefreq: 'weekly',
          priority: 0.6,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. AUTHOR PAGES
    // ─────────────────────────────────────────────────────────────────────────
    const authors = await Blog.aggregate([
      { $match: { status: 'published', publishedAt: { $lte: new Date() } } },
      { 
        $group: { 
          _id: { $ifNull: ['$authorName', '$author'] },
          count: { $sum: 1 }, 
          lastPost: { $max: '$publishedAt' } 
        } 
      },
      { $match: { _id: { $ne: null }, count: { $gte: 1 } } },
    ]).exec();

    for (const author of authors) {
      if (author._id) {
        const authorSlug = author._id.toLowerCase().replace(/\s+/g, '-');
        urls.push({
          loc: `${SITE_URL}/blog/author/${authorSlug}`,
          lastmod: formatDate(new Date(author.lastPost)),
          changefreq: 'weekly',
          priority: 0.6,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE & SEND
    // ─────────────────────────────────────────────────────────────────────────
    const sitemap = generateSitemap(urls);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write(sitemap);
    res.end();

    return { props: {} };

  } catch {
    // Return minimal valid sitemap on error
    const errorSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.write(errorSitemap);
    res.end();

    return { props: {} };
  }
};
