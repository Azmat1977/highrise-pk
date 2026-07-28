// pages/developers/sitemap.xml.tsx

import React from 'react';
import type { GetServerSideProps } from 'next';
import dbConnect from '@/lib/dbConnect';
import DeveloperProfile from '@/models/DeveloperProfile';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://highrise.pk';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ChangeFreq =
  | 'always' | 'hourly' | 'daily'
  | 'weekly' | 'monthly' | 'yearly' | 'never';

interface SitemapUrl {
  loc:         string;
  lastmod?:    string;
  changefreq?: ChangeFreq;
  priority?:   number;
}

interface DeveloperLean {
  slug?:      string;
  updatedAt?: Date;
  createdAt?: Date;
}

// ─────────────────────────────────────────────
// XML Helpers
// ─────────────────────────────────────────────

function escapeXml(text: string): string {
  return text
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
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
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(buildUrlElement),
    '</urlset>',
  ].join('\n');
}

// ─────────────────────────────────────────────
// Fallback sitemap (on error)
// ─────────────────────────────────────────────

function fallbackSitemap(): string {
  return generateSitemap([
    {
      loc:        `${SITE_URL}/developers`,
      changefreq: 'weekly',
      priority:   0.8,
    },
  ]);
}

// ─────────────────────────────────────────────
// Page component — renders nothing (XML only)
// ─────────────────────────────────────────────

export default function DevelopersSitemap(): null {
  return null;
}

// ─────────────────────────────────────────────
// getServerSideProps — builds & streams XML
// ─────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    await dbConnect();

    const urls: SitemapUrl[] = [];

    // Directory index page
    urls.push({
      loc:        `${SITE_URL}/developers`,
      lastmod:    formatDate(new Date()),
      changefreq: 'weekly',
      priority:   0.8,
    });

    // Only approved, non-deleted developers with valid slugs
    const developers = await DeveloperProfile
      .find({
        status:    'approved',
        isDeleted: { $ne: true },
        slug:      { $exists: true, $ne: '' },
      })
      .sort({ updatedAt: -1 })
      .select('slug updatedAt createdAt')
      .limit(1000)
      .lean<DeveloperLean[]>();

    for (const dev of developers) {
      // Skip any developer without a valid slug — never expose _id in URLs
      if (!dev.slug || typeof dev.slug !== 'string') continue;

      const lastModDate = dev.updatedAt ?? dev.createdAt ?? new Date();

      urls.push({
        loc:        `${SITE_URL}/developers/${escapeXml(dev.slug)}`,
        lastmod:    formatDate(new Date(lastModDate)),
        changefreq: 'monthly',
        priority:   0.7,
      });
    }

    const sitemap = generateSitemap(urls);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    res.write(sitemap);
    res.end();

    return { props: {} };

  } catch {
    // Silent fail — serve minimal valid sitemap
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    res.write(fallbackSitemap());
    res.end();

    return { props: {} };
  }
};