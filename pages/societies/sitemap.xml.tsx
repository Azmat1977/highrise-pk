// pages/societies/sitemap.xml.tsx
// Verified Society directory sitemap — Google Image Sitemap extension
// Includes: directory page + individual society pages + city filters
// Cache: 1hr CDN + 24hr stale-while-revalidate

import React from 'react';
import type { GetServerSideProps } from 'next';
import dbConnect from '@/lib/dbConnect';
import Society from '@/models/Society';

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://highrise.pk'
).replace(/\/+$/, '');

const MAX_SOCIETIES = 2000;
const MAX_CITIES    = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SitemapImage {
  loc:      string;
  title?:   string;
  caption?: string;
}

interface SitemapUrl {
  loc:         string;
  lastmod?:    string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?:   number;
  images?:     SitemapImage[];
}

interface SocietyDoc {
  _id:        { toString(): string };
  slug?:      string;
  name?:      string;
  city?:      string;
  nocStatus?: string;
  coverImage?: { url?: string };
  updatedAt?: Date;
  createdAt?: Date;
}

interface CityAggregateResult {
  _id:        string;
  count:      number;
  lastUpdate: Date;
}

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

function formatDate(date: Date | undefined | null): string {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  return d.toISOString().split('T')[0];
}

function isValidUrl(url: string): boolean {
  return Boolean(url) && (url.startsWith('http://') || url.startsWith('https://'));
}

function buildUrlElement(url: SitemapUrl): string {
  let el = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;

  if (url.lastmod)             el += `\n    <lastmod>${url.lastmod}</lastmod>`;
  if (url.changefreq)          el += `\n    <changefreq>${url.changefreq}</changefreq>`;
  if (url.priority !== undefined) {
    el += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
  }

  if (url.images?.length) {
    for (const img of url.images) {
      if (!isValidUrl(img.loc)) continue;
      el += `\n    <image:image>\n      <image:loc>${escapeXml(img.loc)}</image:loc>`;
      if (img.title)   el += `\n      <image:title>${escapeXml(img.title)}</image:title>`;
      if (img.caption) el += `\n      <image:caption>${escapeXml(img.caption)}</image:caption>`;
      el += `\n    </image:image>`;
    }
  }

  el += `\n  </url>`;
  return el;
}

function generateSitemap(urls: SitemapUrl[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
    http://www.google.com/schemas/sitemap-image/1.1
    http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">
${urls.map(buildUrlElement).join('\n')}
</urlset>`;
}

function fallbackSitemap(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/societies</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function SocietiesSitemap(): React.ReactElement | null {
  return null;
}

// ─── Server-Side Generation ───────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    await dbConnect();

    const urls: SitemapUrl[] = [];

    // ── 1. MAIN SOCIETIES DIRECTORY ──────────────────────────────────────────
    const latestSociety = await Society
      .findOne({ isActive: true, isDeleted: { $ne: true } })
      .sort({ updatedAt: -1 })
      .select('updatedAt')
      .lean() as { updatedAt?: Date } | null;

    urls.push({
      loc:        `${SITE_URL}/societies`,
      lastmod:    formatDate(latestSociety?.updatedAt ?? new Date()),
      changefreq: 'daily',
      priority:   0.9,
    });

    // ── 2. NOC STATUS FILTER PAGES ────────────────────────────────────────────
    // High-value SEO landing pages — buyers actively search by NOC status
    const nocStatuses = ['approved', 'pending', 'under_review'];
    for (const status of nocStatuses) {
      urls.push({
        loc:        `${SITE_URL}/societies?nocStatus=${status}`,
        lastmod:    formatDate(new Date()),
        changefreq: 'weekly',
        priority:   0.7,
      });
    }

    // ── 3. INDIVIDUAL SOCIETY PAGES ───────────────────────────────────────────
    const societies = await Society
      .find({
        isActive:  true,
        isDeleted: { $ne: true },
        slug:      { $exists: true, $ne: '' },
      })
      .sort({ updatedAt: -1 })
      .select('slug name city nocStatus coverImage updatedAt createdAt')
      .limit(MAX_SOCIETIES)
      .lean() as unknown as SocietyDoc[];

    for (const society of societies) {
      if (!society.slug) continue;

      // NOC-approved societies get highest priority — trust-first SEO
      const isApproved  = society.nocStatus === 'approved';
      const lastModDate  = society.updatedAt ?? society.createdAt;

      const societyUrl: SitemapUrl = {
        loc:        `${SITE_URL}/societies/${escapeXml(society.slug)}`,
        lastmod:    formatDate(lastModDate),
        changefreq: isApproved ? 'monthly' : 'weekly',
        priority:   isApproved ? 0.9 : 0.7,
      };

      const coverUrl = society.coverImage?.url;
      if (coverUrl && isValidUrl(coverUrl)) {
        societyUrl.images = [{
          loc:     coverUrl,
          title:   society.name ?? 'Society on Highrise.pk',
          caption: `${society.name ?? 'Society'} — ${society.city ?? 'Pakistan'} | NOC ${society.nocStatus ?? 'status'}`,
        }];
      }

      urls.push(societyUrl);
    }

    // ── 4. CITY-FILTERED LANDING PAGES ────────────────────────────────────────
    const cities = await Society.aggregate([
      {
        $match: {
          isActive:  true,
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id:        '$city',
          count:      { $sum: 1 },
          lastUpdate: { $max: '$updatedAt' },
        },
      },
      { $match: { _id: { $nin: [null, ''] } } },
      { $sort:  { count: -1 } },
      { $limit: MAX_CITIES },
    ]).exec() as CityAggregateResult[];

    for (const city of cities) {
      if (!city._id) continue;
      urls.push({
        loc:        `${SITE_URL}/societies?city=${encodeURIComponent(city._id)}`,
        lastmod:    formatDate(city.lastUpdate),
        changefreq: 'weekly',
        priority:   0.8,
      });
    }

    // ── EMIT XML ──────────────────────────────────────────────────────────────
    const sitemap = generateSitemap(urls);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Sitemap-Count', String(urls.length));
    res.write(sitemap);
    res.end();

    return { props: {} };

  } catch {
    // Silent fail — always serve valid XML
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    res.write(fallbackSitemap());
    res.end();

    return { props: {} };
  }
};