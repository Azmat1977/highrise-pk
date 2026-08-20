import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';
const SITE_NAME = 'Highrise.pk';
const SITE_DESCRIPTION = 'Pakistan\'s premier real estate platform - Expert insights, market trends, legal guides, and investment advice for property buyers, sellers, and investors.';
const FEED_LANGUAGE = 'en-us';
const FEED_TTL = 60; // Minutes before feed should be refreshed
const MAX_ITEMS = 50; // Maximum items in feed

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Escape XML special characters
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Strip HTML tags for plain text
// ─────────────────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Format date to RFC 822 (RSS standard)
// ─────────────────────────────────────────────────────────────────────────────

function formatRFC822(date: Date): string {
  return date.toUTCString();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generate GUID
// ─────────────────────────────────────────────────────────────────────────────

function generateGuid(slug: string): string {
  return `${SITE_URL}/blog/${slug}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    await dbConnect();

    // Optional category filter
    const { category } = req.query;
    
    // Build query
    const query: Record<string, any> = {
      status: 'published',
      publishedAt: { $lte: new Date() },
    };

    if (category && typeof category === 'string') {
      query.category = new RegExp(`^${category}$`, 'i');
    }

    // Fetch published blogs
    const blogs = await Blog.find(query)
      .sort({ publishedAt: -1 })
      .limit(MAX_ITEMS)
      .select('title slug excerpt content category author authorName publishedAt image readTime tags')
      .populate('authorId', 'name')
      .lean();

    // Get latest publish date for lastBuildDate
    const lastBuildDate = blogs.length > 0 && blogs[0].publishedAt
      ? new Date(blogs[0].publishedAt)
      : new Date();

    // Build RSS XML
    const rssXml = buildRssXml(blogs, lastBuildDate, category as string | undefined);

    // Set headers
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.status(200).send(rssXml);

  } catch {
    
    // Return valid XML error
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Error</title>
    <description>Unable to generate RSS feed</description>
  </channel>
</rss>`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD RSS XML
// ─────────────────────────────────────────────────────────────────────────────

function buildRssXml(
  blogs: any[],
  lastBuildDate: Date,
  category?: string
): string {
  const feedTitle = category
    ? `${escapeXml(category)} Articles - ${SITE_NAME}`
    : `${SITE_NAME} Blog`;

  const feedDescription = category
    ? `Latest ${category.toLowerCase()} articles and insights from ${SITE_NAME}`
    : SITE_DESCRIPTION;

  const feedUrl = category
    ? `${SITE_URL}/api/blogs/rss?category=${encodeURIComponent(category)}`
    : `${SITE_URL}/api/blogs/rss`;

  const items = blogs.map((blog) => buildItemXml(blog)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>${FEED_LANGUAGE}</language>
    <lastBuildDate>${formatRFC822(lastBuildDate)}</lastBuildDate>
    <ttl>${FEED_TTL}</ttl>
    <generator>Highrise.pk Blog Platform</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>${escapeXml(feedTitle)}</title>
      <link>${SITE_URL}</link>
      <width>144</width>
      <height>144</height>
    </image>
    
    <copyright>Copyright ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</copyright>
    <managingEditor>info@highrise.pk (${SITE_NAME} Editorial)</managingEditor>
    <webMaster>tech@highrise.pk (${SITE_NAME} Tech Team)</webMaster>
    
    <category>Real Estate</category>
    <category>Property</category>
    <category>Pakistan</category>
    <category>Investment</category>
    
${items}
  </channel>
</rss>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD ITEM XML
// ─────────────────────────────────────────────────────────────────────────────

function buildItemXml(blog: any): string {
  const title = escapeXml(blog.title || 'Untitled');
  const link = generateGuid(blog.slug);
  const guid = link;
  
  // Get description (excerpt or stripped content)
  const description = escapeXml(
    blog.excerpt || stripHtml(blog.content || '').substring(0, 300) + '...'
  );
  
  // Full content with CDATA
  const contentEncoded = blog.content
    ? `<content:encoded><![CDATA[${blog.content}]]></content:encoded>`
    : '';
  
  // Author
  const authorName = blog.authorId?.name || blog.authorName || blog.author || 'Highrise Team';
  const authorElement = `<dc:creator>${escapeXml(authorName)}</dc:creator>`;
  
  // Date
  const pubDate = blog.publishedAt
    ? formatRFC822(new Date(blog.publishedAt))
    : formatRFC822(new Date());
  
  // Category
  const categoryElement = blog.category
    ? `<category>${escapeXml(blog.category)}</category>`
    : '';
  
  // Tags as additional categories
  const tagElements = (blog.tags || [])
    .map((tag: string) => `<category>${escapeXml(tag)}</category>`)
    .join('\n      ');
  
  // Featured image
  let mediaElement = '';
  if (blog.image?.url) {
    const imageUrl = escapeXml(blog.image.url);
    mediaElement = `
      <enclosure url="${imageUrl}" type="image/jpeg" length="0"/>
      <media:content url="${imageUrl}" medium="image">
        <media:title>${title}</media:title>
      </media:content>`;
  }
  
  // Read time
  const readTime = blog.readTime || '5 min read';

  return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${guid}</guid>
      <description>${description}</description>
      ${contentEncoded}
      ${authorElement}
      <pubDate>${pubDate}</pubDate>
      ${categoryElement}
      ${tagElements}
      ${mediaElement}
      <comments>${link}#comments</comments>
    </item>`;
}
