/**
 * pages/sitemap.xml.ts
 *
 * Dynamic sitemap generator for Highrise.pk
 *
 * Includes:
 *   - Static pages (home, projects, developers, etc.)
 *   - Dynamic project pages (verified only)
 *   - Dynamic developer pages (approved only)
 *   - City filter pages
 *
 * Cached: 1 hour server-side
 * Access: https://highrise.pk/sitemap.xml
 */

import type { GetServerSideProps } from 'next';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';

// ============================================
// TYPES
// ============================================

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

// ============================================
// HELPERS
// ============================================

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk').replace(/\/+$/, '');

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function toISODate(date: Date | string | undefined): string {
  if (!date) return new Date().toISOString().split('T')[0];
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}

function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlsXml = urls
    .map((u) => {
      const loc = escapeXml(u.loc);
      const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
      const changefreq = u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : '';
      const priority = typeof u.priority === 'number' ? `\n    <priority>${u.priority.toFixed(1)}</priority>` : '';
      return `  <url>
    <loc>${loc}</loc>${lastmod}${changefreq}${priority}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/0.9">
${urlsXml}
</urlset>`;
}

// ============================================
// STATIC URLS (Always in sitemap)
// ============================================

const STATIC_URLS: SitemapUrl[] = [
  { loc: `${SITE_URL}/`,                    changefreq: 'daily',   priority: 1.0 },
  { loc: `${SITE_URL}/projects`,            changefreq: 'daily',   priority: 0.9 },
  { loc: `${SITE_URL}/properties`,          changefreq: 'daily',   priority: 0.9 },
  { loc: `${SITE_URL}/developers`,          changefreq: 'weekly',  priority: 0.8 },
  { loc: `${SITE_URL}/agents`,              changefreq: 'weekly',  priority: 0.7 },
  { loc: `${SITE_URL}/tools/tax-calculator`, changefreq: 'monthly', priority: 0.7 },
  { loc: `${SITE_URL}/tools/emi-calculator`, changefreq: 'monthly', priority: 0.7 },
  { loc: `${SITE_URL}/tools/area-converter`, changefreq: 'monthly', priority: 0.6 },
  { loc: `${SITE_URL}/tools/roi-calculator`, changefreq: 'monthly', priority: 0.6 },
  { loc: `${SITE_URL}/about`,               changefreq: 'monthly', priority: 0.5 },
  { loc: `${SITE_URL}/contact`,             changefreq: 'monthly', priority: 0.5 },
  { loc: `${SITE_URL}/terms`,               changefreq: 'yearly',  priority: 0.3 },
  { loc: `${SITE_URL}/privacy`,             changefreq: 'yearly',  priority: 0.3 },
];

// ============================================
// CITY URLS (Filter combinations)
// ============================================

const PAKISTANI_CITIES = [
  'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi',
  'Faisalabad', 'Multan', 'Peshawar', 'Quetta',
  'Hyderabad', 'Sialkot',
];

function getCityFilterUrls(): SitemapUrl[] {
  return PAKISTANI_CITIES.map((city) => ({
    loc: `${SITE_URL}/projects?city=${encodeURIComponent(city)}`,
    changefreq: 'daily' as const,
    priority: 0.7,
  }));
}

// ============================================
// PAGE COMPONENT (Placeholder — not rendered)
// ============================================

export default function Sitemap(): null {
  // Never rendered — getServerSideProps handles response
  return null;
}

// ============================================
// SERVER-SIDE RENDERING
// ============================================

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Security headers
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Cache: 1 hour server, 2 hours stale-while-revalidate
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=7200'
  );

  try {
    await dbConnect();

    // Fetch verified projects
    const projects = await Project.find({
      isVerified: true,
      status: 'verified',
      verificationStatus: 'verified',
      developerApprovalStatus: 'approved',
      isDeleted: { $ne: true },
    })
      .select('slug updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5000)
      .maxTimeMS(5000)
      .lean();

    // Build project URLs
    const projectUrls: SitemapUrl[] = (
      projects as Array<{ slug?: string; updatedAt?: Date }>
    )
      .filter((p) => p.slug)
      .map((p) => ({
        loc: `${SITE_URL}/projects/${p.slug}`,
        lastmod: toISODate(p.updatedAt),
        changefreq: 'weekly' as const,
        priority: 0.8,
      }));

    // Combine all URLs
    const allUrls: SitemapUrl[] = [
      ...STATIC_URLS,
      ...getCityFilterUrls(),
      ...projectUrls,
    ];

    const xml = generateSitemapXml(allUrls);

    res.write(xml);
    res.end();

    return { props: {} };
  } catch {
    // Graceful fallback — static URLs only
    const fallbackXml = generateSitemapXml([
      ...STATIC_URLS,
      ...getCityFilterUrls(),
    ]);

    res.write(fallbackXml);
    res.end();

    return { props: {} };
  }
};