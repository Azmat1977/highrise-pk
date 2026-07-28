// pages/static-sitemap.xml.tsx

import { GetServerSideProps } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

function escapeXml(text: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildUrlElement(url: SitemapUrl): string {
  let element = `  <url>
    <loc>${escapeXml(url.loc)}</loc>`;
  if (url.lastmod) element += `\n    <lastmod>${url.lastmod}</lastmod>`;
  if (url.changefreq) element += `\n    <changefreq>${url.changefreq}</changefreq>`;
  if (url.priority !== undefined) element += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
  element += `\n  </url>`;
  return element;
}

function generateSitemap(urls: SitemapUrl[]): string {
  const urlElements = urls.map(buildUrlElement).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

export default function StaticSitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    const urls: SitemapUrl[] = [
      {
        loc: `${SITE_URL}/`,
        lastmod: formatDate(new Date()),
        changefreq: 'daily',
        priority: 1.0,
      },
      {
        loc: `${SITE_URL}/about`,
        lastmod: formatDate(new Date()),
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: `${SITE_URL}/contact`,
        lastmod: formatDate(new Date()),
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: `${SITE_URL}/privacy-policy`,
        lastmod: formatDate(new Date()),
        changefreq: 'yearly',
        priority: 0.3,
      },
      {
        loc: `${SITE_URL}/terms-of-service`,
        lastmod: formatDate(new Date()),
        changefreq: 'yearly',
        priority: 0.3,
      },
      {
        loc: `${SITE_URL}/properties`,
        lastmod: formatDate(new Date()),
        changefreq: 'daily',
        priority: 0.9,
      },
      {
        loc: `${SITE_URL}/projects`,
        lastmod: formatDate(new Date()),
        changefreq: 'daily',
        priority: 0.8,
      },
      {
        loc: `${SITE_URL}/developers`,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: 0.7,
      },
      {
        loc: `${SITE_URL}/agents`,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: 0.7,
      },
      {
        loc: `${SITE_URL}/blog`,
        lastmod: formatDate(new Date()),
        changefreq: 'daily',
        priority: 0.8,
      },

      // ── V5.7.0 New Pages ─────────────────────────────────────────────────
      {
        loc: `${SITE_URL}/societies`,
        lastmod: formatDate(new Date()),
        changefreq: 'daily',
        priority: 0.9,
      },
      {
        loc: `${SITE_URL}/risk-alerts`,
        lastmod: formatDate(new Date()),
        changefreq: 'daily',
        priority: 0.8,
      },
      {
        loc: `${SITE_URL}/tools`,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: 0.9,
      },
      {
        loc: `${SITE_URL}/tools/verify-society`,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: 0.9,
      },
      {
        loc: `${SITE_URL}/tools/price-estimator`,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: 0.8,
      },
      {
        loc: `${SITE_URL}/tools/construction-calculator`,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: 0.8,
      },
      {
        loc: `${SITE_URL}/tools/area-unit-converter`,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: 0.8,
      },
      {
        loc: `${SITE_URL}/tools/home-loan-calculator`,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: 0.8,
      },
    ];


    const sitemap = generateSitemap(urls);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.write(sitemap);
    res.end();

    return { props: {} };
  } catch (error) {
    console.error('Static Sitemap Error:', error);

    const errorSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.write(errorSitemap);
    res.end();

    return { props: {} };
  }
};
