// pages/projects/sitemap.xml.tsx

import { GetServerSideProps } from 'next';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';

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

    urls.push({
      loc: `${SITE_URL}/projects`,
      lastmod: formatDate(new Date()),
      changefreq: 'daily',
      priority: 0.9,
    });

    const projects = await Project.find({
      status: 'verified',
      isDeleted: { $ne: true },
    })
      .sort({ updatedAt: -1 })
      .select('slug projectName city areaName projectStatus images updatedAt createdAt')
      .limit(2000)
      .lean();

    for (const project of projects) {
      const projectUrl: SitemapUrl = {
        loc: `${SITE_URL}/projects/${project.slug || project._id}`,
        lastmod: formatDate(new Date(project.updatedAt || project.createdAt)),
        changefreq: 'weekly',
        priority: 0.8,
      };

      if (project.images?.[0]?.url) {
        projectUrl.images = [
          {
            loc: project.images[0].url,
            title: project.projectName,
            caption: `${String(project.projectName ?? '')} — ${String(project.city ?? 'Pakistan')}`,
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
