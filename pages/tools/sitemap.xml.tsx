// pages/tools/sitemap.xml.tsx
// Tools hub sitemap — static tool pages + all 12 area converter SEO pages
// No DB queries needed — purely static
// Cache: 24hr CDN (tools rarely change)

import React from 'react';
import type { GetServerSideProps } from 'next';

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://highrise.pk'
).replace(/\/+$/, '');

// ─── Types ────────────────────────────────────────────────────────────────────

interface SitemapUrl {
  loc:         string;
  lastmod?:    string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?:   number;
}

// ─── Area Converter SEO Combos (all 12 locked V5.6.0) ────────────────────────

const AREA_CONVERTER_COMBOS: string[] = [
  'marla-to-sqft',
  'sqft-to-marla',
  'marla-to-sqm',
  'sqm-to-marla',
  'kanal-to-marla',
  'marla-to-kanal',
  'kanal-to-sqft',
  'sqft-to-kanal',
  'sqft-to-sqm',
  'sqm-to-sqft',
  'kanal-to-sqm',
  'sqm-to-kanal',
];

// ─── XML Helpers ──────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

function buildUrlElement(url: SitemapUrl): string {
  let el = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;
  if (url.lastmod)             el += `\n    <lastmod>${url.lastmod}</lastmod>`;
  if (url.changefreq)          el += `\n    <changefreq>${url.changefreq}</changefreq>`;
  if (url.priority !== undefined) {
    el += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
  }
  el += `\n  </url>`;
  return el;
}

function generateSitemap(urls: SitemapUrl[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(buildUrlElement).join('\n')}
</urlset>`;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ToolsSitemap(): React.ReactElement | null {
  return null;
}

// ─── Server-Side Generation ───────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const today = new Date().toISOString().split('T')[0];

  const urls: SitemapUrl[] = [

    // ── Tools Hub ────────────────────────────────────────────────────────────
    {
      loc:        `${SITE_URL}/tools`,
      lastmod:    today,
      changefreq: 'weekly',
      priority:   0.9,
    },

    // ── 5 Live Tools ─────────────────────────────────────────────────────────
    {
      loc:        `${SITE_URL}/tools/verify-society`,
      lastmod:    today,
      changefreq: 'weekly',
      priority:   0.9,
    },
    {
      loc:        `${SITE_URL}/tools/price-estimator`,
      lastmod:    today,
      changefreq: 'weekly',
      priority:   0.8,
    },
    {
      loc:        `${SITE_URL}/tools/construction-calculator`,
      lastmod:    today,
      changefreq: 'weekly',
      priority:   0.8,
    },
    {
      loc:        `${SITE_URL}/tools/area-unit-converter`,
      lastmod:    today,
      changefreq: 'weekly',
      priority:   0.8,
    },
    {
      loc:        `${SITE_URL}/tools/home-loan-calculator`,
      lastmod:    today,
      changefreq: 'weekly',
      priority:   0.8,
    },

    // ── 12 Area Converter SEO Landing Pages ───────────────────────────────────
    // Lower priority — utility pages, not commercial intent
    ...AREA_CONVERTER_COMBOS.map((combo) => ({
      loc:        `${SITE_URL}/tools/area-unit-converter/${combo}`,
      lastmod:    today,
      changefreq: 'monthly' as const,
      priority:   0.5,
    })),
  ];

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Tools are static — cache 24hrs
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Sitemap-Count', String(urls.length));
  res.write(generateSitemap(urls));
  res.end();

  return { props: {} };
};