// pages/projects/sitemap.xml.tsx

import { GetServerSideProps } from 'next';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import { PAKISTAN_CITIES as CANONICAL_CITIES } from '@/lib/pakistanCities';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';

// Canonical city source — keeps sitemap URLs in sync with /in/[city] pages.
const PAKISTAN_CITIES: string[] = CANONICAL_CITIES;

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
  if (url.images && url.images.length > 0) {
    for (const image of url.images) {
      element += `\n    <image:image>\n      <image:loc>${escapeXml(image.loc)}</image:loc>`;
      if (image.title) element += `\n      <image:title>${escapeXml(image.title)}</image:title>`;
      if (image.caption) element += `\n      <image:caption>${escapeXml(image.caption)}</image:caption>`;
      element += `\n    </image:image>`;
    }
  }
  element += `\n  </url>`;
  return element;
}

function generateSitemap(urls: SitemapUrl[]): string {
  const urlElements = urls.map(buildUrlElement).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlElements}
</urlset>`;
}

export default function ProjectsSitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    await dbConnect();

    const urls: SitemapUrl[] = [];

    const today = formatDate(new Date());

    // 1. National Root Directory (Priority 1.0)
    urls.push({
      loc: `${SITE_URL}/projects`,
      lastmod: today,
      changefreq: 'daily',
      priority: 1.0,
    });

    // 2. All 23 Major Pakistani Cities (Priority 0.9)
    for (const city of PAKISTAN_CITIES) {
      const citySlug = slugify(city);
      urls.push({
        loc: `${SITE_URL}/projects/in/${citySlug}`,
        lastmod: today,
        changefreq: 'daily',
        priority: 0.9,
      });
    }

    // 3. Fetch verified, non-deleted projects for detail pages & locality aggregation
    const projects = await Project.find({
      status: 'verified',
      isDeleted: { $ne: true },
    })
      .sort({ updatedAt: -1 })
      .select('slug projectName city area areaName projectStatus featureImageUrl images updatedAt createdAt')
      .limit(2000)
      .lean();

    // 4. Extract distinct (city, locality) pairs that have real inventory (Priority 0.8)
    const localitySeen = new Set<string>();

    for (const project of projects) {
      const pCity = String(project.city ?? '').trim();
      const pArea = String(project.area || project.areaName || '').trim();

      if (pCity && pArea) {
        const citySlug = slugify(pCity);
        const locSlug = slugify(pArea);
        const uniqueKey = `${citySlug}/${locSlug}`;

        if (!localitySeen.has(uniqueKey)) {
          localitySeen.add(uniqueKey);
          urls.push({
            loc: `${SITE_URL}/projects/in/${citySlug}/${locSlug}`,
            lastmod: formatDate(new Date(project.updatedAt || project.createdAt || new Date())),
            changefreq: 'weekly',
            priority: 0.8,
          });
        }
      }
    }

    // 5. Individual Verified Project Detail Pages (Priority 0.7)
    for (const project of projects) {
      const projectUrl: SitemapUrl = {
        loc: `${SITE_URL}/projects/${project.slug || project._id}`,
        lastmod: formatDate(new Date(project.updatedAt || project.createdAt || new Date())),
        changefreq: 'weekly',
        priority: 0.7,
      };

      const primaryImg = project.featureImageUrl || project.images?.[0]?.url;
      if (primaryImg) {
        projectUrl.images = [
          {
            loc: primaryImg,
            title: project.projectName,
            caption: `${String(project.projectName ?? '')} - ${String(project.city ?? 'Pakistan')}`,
          },
        ];
      }

      urls.push(projectUrl);
    }

    const sitemap = generateSitemap(urls);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.write(sitemap);
    res.end();

    return { props: {} };
  } catch {
    const errorSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/projects</loc>
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
