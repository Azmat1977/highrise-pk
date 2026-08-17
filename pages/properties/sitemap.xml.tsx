// File: pages/properties/sitemap.xml.tsx
// COMPLETE REPLACEMENT
// Enterprise property sitemap — Google Image Sitemap extension,
// city/category/listing-type landing pages, verified-priority weighting

import React from "react";
import crypto from "crypto";
import type { GetServerSideProps } from "next";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import { PUBLIC_PROPERTY_FILTER } from "@/lib/property/publicProperty";

// ─── Configuration ───────────────────────────────────────────────────────────

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://highrise.pk"
).replace(/\/+$/, "");

const MAX_PROPERTIES = 5000;
const MAX_CITIES = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SitemapImage {
  loc: string;
  title?: string;
  caption?: string;
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  images?: SitemapImage[];
}

interface PropertyDoc {
  _id: { toString(): string };
  slug?: string;
  title?: string;
  city?: string;
  propertyType?: string;
  listingType?: string;
  isVerified?: boolean;
  images?: { url?: string }[];
  updatedAt?: Date;
  createdAt?: Date;
}

interface CityAggregateResult {
  _id: string;
  count: number;
  lastUpdate: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date | undefined | null): string {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  return d.toISOString().split("T")[0];
}

function isValidUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

function buildUrlElement(url: SitemapUrl): string {
  let element = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;

  if (url.lastmod) {
    element += `\n    <lastmod>${url.lastmod}</lastmod>`;
  }
  if (url.changefreq) {
    element += `\n    <changefreq>${url.changefreq}</changefreq>`;
  }
  if (url.priority !== undefined) {
    element += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
  }

  if (url.images?.length) {
    for (const image of url.images) {
      if (!isValidUrl(image.loc)) continue;
      element += `\n    <image:image>\n      <image:loc>${escapeXml(image.loc)}</image:loc>`;
      if (image.title) {
        element += `\n      <image:title>${escapeXml(image.title)}</image:title>`;
      }
      if (image.caption) {
        element += `\n      <image:caption>${escapeXml(image.caption)}</image:caption>`;
      }
      element += `\n    </image:image>`;
    }
  }

  element += `\n  </url>`;
  return element;
}

function generateSitemap(urls: SitemapUrl[]): string {
  const urlElements = urls.map(buildUrlElement).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
    http://www.google.com/schemas/sitemap-image/1.1
    http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">
${urlElements}
</urlset>`;
}

function generateErrorSitemap(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/properties</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;
}

// ─── Component (Next.js requires a default export — no UI) ───────────────────

export default function PropertiesSitemap(): React.ReactElement | null {
  return null;
}

// ─── Server-side sitemap generator ────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);

  try {
    await dbConnect();

    const urls: SitemapUrl[] = [];

    // ── 1. MAIN PROPERTIES PAGE ─────────────────────────────────────────────
    // Find the most recent property update to use as the page's lastmod
    const latestProperty = (await Property.findOne(PUBLIC_PROPERTY_FILTER)
      .sort({ updatedAt: -1 })
      .select("updatedAt")
      .lean()) as { updatedAt?: Date } | null;

    urls.push({
      loc: `${SITE_URL}/properties`,
      lastmod: formatDate(latestProperty?.updatedAt ?? new Date()),
      changefreq: "daily",
      priority: 1.0,
    });

    // ── 2. CATEGORY LANDING PAGES (residential / commercial / plots) ────────
    const categories: { slug: string; label: string }[] = [
      { slug: "residential", label: "Residential" },
      { slug: "commercial",  label: "Commercial"  },
      { slug: "plots",       label: "Plots"       },
    ];

    for (const cat of categories) {
      urls.push({
        loc: `${SITE_URL}/properties?propertyCategory=${cat.slug}`,
        lastmod: formatDate(new Date()),
        changefreq: "daily",
        priority: 0.9,
      });
    }

    // ── 3. LISTING TYPE LANDING PAGES (sale / rent / installment) ───────────
    const listingTypes: string[] = ["full_payment", "rent", "installment"];

    for (const lt of listingTypes) {
      urls.push({
        loc: `${SITE_URL}/properties?listingType=${lt}`,
        lastmod: formatDate(new Date()),
        changefreq: "daily",
        priority: 0.9,
      });
    }

    // ── 4. INDIVIDUAL PROPERTIES ────────────────────────────────────────────
    const properties = (await Property.find(PUBLIC_PROPERTY_FILTER)
      .sort({ updatedAt: -1 })
      .select(
        "slug title city propertyType listingType isVerified images updatedAt createdAt"
      )
      .limit(MAX_PROPERTIES)
      .lean()) as unknown as PropertyDoc[];

    for (const property of properties) {
      const slugOrId = property.slug ?? property._id.toString();
      const firstImage = property.images?.[0]?.url;

      const propertyUrl: SitemapUrl = {
        loc: `${SITE_URL}/property/${slugOrId}`,
        lastmod: formatDate(property.updatedAt ?? property.createdAt),
        changefreq: "weekly",
        // Verified listings get higher priority (trust-first SEO)
        priority: property.isVerified ? 0.9 : 0.7,
      };

      if (firstImage && isValidUrl(firstImage)) {
        propertyUrl.images = [
          {
            loc: firstImage,
            title: property.title ?? "Property on Highrise.pk",
            caption: `${property.title ?? "Property"} – ${property.city ?? "Pakistan"}`,
          },
        ];
      }

      urls.push(propertyUrl);
    }

    // ── 5. CITY-FILTERED LANDING PAGES ──────────────────────────────────────
    const cities = (await Property.aggregate([
      {
        $match: PUBLIC_PROPERTY_FILTER,
      },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
          lastUpdate: { $max: "$updatedAt" },
        },
      },
      { $match: { _id: { $nin: [null, ""] } } },
      { $sort: { count: -1 } },
      { $limit: MAX_CITIES },
    ]).exec()) as CityAggregateResult[];

    for (const city of cities) {
      if (!city._id) continue;
      urls.push({
        loc: `${SITE_URL}/properties?city=${encodeURIComponent(city._id)}`,
        lastmod: formatDate(city.lastUpdate),
        changefreq: "daily",
        priority: 0.8,
      });
    }

    // ── EMIT XML ─────────────────────────────────────────────────────────────
    const sitemap = generateSitemap(urls);

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    // CDN: 1 hour fresh, 24h stale-while-revalidate
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Sitemap-Count", String(urls.length));

    res.write(sitemap);
    res.end();

    return { props: {} };
  } catch {
    // Fallback sitemap (always return valid XML — never 500 on /sitemap.xml)
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300");
    res.setHeader("X-Sitemap-Status", "fallback");

    res.write(generateErrorSitemap());
    res.end();

    return { props: {} };
  }
};