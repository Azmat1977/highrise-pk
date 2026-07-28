// pages/robots.txt.tsx

import { GetServerSideProps } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${SITE_URL}/sitemap.xml

# Disallow admin and auth pages
Disallow: /admin/
Disallow: /api/
Disallow: /login
Disallow: /register
Disallow: /saved-properties
Disallow: /dashboard/
Disallow: /my-properties/
Disallow: /add-property/
Disallow: /edit-property/
Disallow: /account/
Disallow: /profile/

# Disallow deep filtered pages (prevent crawl waste)
# Allow specific SEO-friendly query params, block rest
Disallow: /*?*
Allow: /properties?city=
Allow: /properties?propertyCategory=
Allow: /properties?listingType=
Allow: /properties?sort=
Allow: /properties?propertyType=

# Crawl-delay for polite crawling
Crawl-delay: 1

# Google specific
User-agent: Googlebot
Allow: /
Allow: /properties
Allow: /projects
Allow: /developers
Allow: /agents
Allow: /blog
Allow: /societies
Allow: /risk-alerts
Allow: /tools
Allow: /tools/
Allow: /about
Allow: /contact
Allow: /privacy-policy
Allow: /terms-of-service

# Image sitemap for property images
User-agent: Googlebot-Image
Allow: /
Allow: /properties
Allow: /projects
Allow: /societies

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /

# Block common bad bots
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /
`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, s-maxage=86400');
  res.write(robotsTxt);
  res.end();

  return { props: {} };
};

export default function Robots() {
  return null;
}
