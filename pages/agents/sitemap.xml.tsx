// pages/agents/sitemap.xml.tsx
// Agent public profile sitemap — server-side generated
// Uses status: 'approved' (not isVerified — banned field)
// Uses /agent/[slug] URLs (singular — public ISR route)
// Skips agents without slug — never exposes _id in URLs
// Cache: 1 hour CDN + 24 hour stale-while-revalidate

import React from 'react';
import { GetServerSideProps } from 'next';
import dbConnect from '@/lib/dbConnect';
import AgentProfile from '@/models/AgentProfile';

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://highrise.pk';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SitemapUrl {
  loc:          string;
  lastmod?:     string;
  changefreq?:  'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?:    number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
  if (!text) return '';
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
  if (url.priority !== undefined) el += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
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

// ─── Fallback Sitemap (error state) ──────────────────────────────────────────

function fallbackSitemap(): string {
  return generateSitemap([
    {
      loc:        `${APP_URL}/agents`,
      changefreq: 'weekly',
      priority:   0.8,
    },
  ]);
}

// ─── Page Component (renders nothing — XML only) ──────────────────────────────

export default function AgentsSitemapPage(): React.ReactElement | null {
  return null;
}

// ─── Server-Side Sitemap Generation ──────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    await dbConnect();

    const urls: SitemapUrl[] = [];

    // ── Directory Page ──────────────────────────────────────────────────────
    urls.push({
      loc:        `${APP_URL}/agents`,
      lastmod:    formatDate(new Date()),
      changefreq: 'weekly',
      priority:   0.8,
    });

    // ── Individual Agent Profiles ───────────────────────────────────────────
    // status: 'approved'   ← correct field (NOT isVerified)
    // isDeleted: false     ← soft-delete gate
    // slug required        ← never expose _id in URLs
    const agents = await AgentProfile.find(
      {
        status:    'approved',
        isDeleted: { $ne: true },
        slug:      { $exists: true, $ne: '' },
      },
      {
        slug:      1,
        updatedAt: 1,
        _id:       0,  // exclude _id — not needed
      }
    )
      .sort({ updatedAt: -1 })
      .limit(5000)
      .lean()
      .exec();

    for (const agent of agents as { slug?: string; updatedAt?: Date }[]) {
      // Skip if no slug — never fall back to _id
      if (!agent.slug) continue;

      urls.push({
        loc:        `${APP_URL}/agent/${escapeXml(agent.slug)}`,
        lastmod:    formatDate(agent.updatedAt ?? new Date()),
        changefreq: 'monthly',
        priority:   0.6,
      });
    }

    // ── Write Response ──────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    res.write(generateSitemap(urls));
    res.end();

    return { props: {} };

  } catch {
    // Silent fail — serve minimal valid sitemap
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=3600'
    );
    res.write(fallbackSitemap());
    res.end();

    return { props: {} };
  }
};