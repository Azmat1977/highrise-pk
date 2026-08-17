import type { GetServerSideProps } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk').replace(/\/+$/, '');

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const robotsTxt = `User-agent: *
Allow: /

# Server/admin/auth/account surfaces
Disallow: /admin/
Disallow: /api/
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email
Disallow: /account/
Disallow: /saved-properties
Disallow: /shortlist/
Disallow: /add-property
Disallow: /edit-property/

# Private role dashboards. Keep /agent/<public-slug> crawlable.
Disallow: /agent/dashboard
Disallow: /agent/leads/
Disallow: /agent/listings
Disallow: /agent/profile
Disallow: /agent/register
Disallow: /agent/verify
Disallow: /developer/
Disallow: /owner/

# Search/filter pages are controlled with page-level canonical/noindex rules.
# Do not blanket-block query strings here; blocked URLs can still remain indexed
# without Google being able to read their canonical/noindex directives.

User-agent: Googlebot-Image
Allow: /properties/
Allow: /property/
Allow: /projects/
Allow: /societies/

User-agent: MJ12bot
Disallow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  res.write(robotsTxt);
  res.end();

  return { props: {} };
};

export default function Robots(): null {
  return null;
}
