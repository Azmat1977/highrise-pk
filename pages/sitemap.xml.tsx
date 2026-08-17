/**
 * Canonical sitemap index for Highrise.pk.
 *
 * Keep the root sitemap small and delegate each content domain to its own
 * sitemap. This avoids duplicate URL declarations and lets each domain use
 * its own database query/caching policy.
 */
import type { GetServerSideProps } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk').replace(/\/+$/, '');

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return char;
    }
  });
}

const SITEMAPS = [
  '/static-sitemap.xml',
  '/properties/sitemap.xml',
  '/projects/sitemap.xml',
  '/developers/sitemap.xml',
  '/agents/sitemap.xml',
  '/societies/sitemap.xml',
  '/blog/sitemap.xml',
  '/tools/sitemap.xml',
] as const;

export default function SitemapIndex(): null {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const entries = SITEMAPS.map(
    (path) => `  <sitemap>\n    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>\n  </sitemap>`,
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
};
