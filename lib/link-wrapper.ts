// lib/link-wrapper.ts
// SERVER ONLY — wraps links in campaign HTML with tracking redirect URLs
// Every <a href="..."> becomes /api/track/click?url=...&token=...

const SITE_URL = process.env.NEXTAUTH_URL || 'https://highrise.pk';

// URLs that should NOT be wrapped (unsubscribe, system links)
const SKIP_URL_PATTERNS = [
  '/api/track/',           // Already a tracking URL
  '/api/newsletter/unsubscribe',
  '/api/leads/unsubscribe',
  'mailto:',
  'tel:',
  '#',                     // Anchor links
];

/**
 * Wrap a single URL with the tracking redirect.
 *
 * @param originalUrl  - The destination URL
 * @param campaignId   - Campaign MongoDB ID
 * @param token        - Per-recipient crypto token
 */
export function wrapUrl(
  originalUrl: string,
  campaignId: string,
  token: string
): string {
  // Skip system/unsubscribe/anchor links
  for (const pattern of SKIP_URL_PATTERNS) {
    if (originalUrl.startsWith(pattern) || originalUrl.includes(pattern)) {
      return originalUrl;
    }
  }

  // Skip empty or invalid URLs
  if (!originalUrl || originalUrl.trim() === '') return originalUrl;

  const trackUrl = new URL(`${SITE_URL}/api/track/click`);
  trackUrl.searchParams.set('cid',   campaignId);
  trackUrl.searchParams.set('token', token);
  trackUrl.searchParams.set('url',   originalUrl);

  return trackUrl.toString();
}

/**
 * Wrap ALL links in an HTML email string with tracking URLs.
 * Uses regex to find all <a href="..."> patterns.
 * Preserves all other attributes on the <a> tag.
 *
 * @param html        - Complete email HTML string
 * @param campaignId  - Campaign MongoDB ID
 * @param token       - Per-recipient crypto token
 */
export function wrapLinksInHtml(
  html: string,
  campaignId: string,
  token: string
): string {
  if (!html) return html;

  // Match href="..." or href='...' — handles both quote styles
  // Captures: [fullMatch, quoteChar, url, restOfTag]
  return html.replace(
    /(<a\s[^>]*?)href=(["'])(.*?)\2/gi,
    (match, before, quote, url) => {
      const wrappedUrl = wrapUrl(url.trim(), campaignId, token);
      return `${before}href=${quote}${wrappedUrl}${quote}`;
    }
  );
}

/**
 * Extract all unique URLs from an HTML string.
 * Used for analytics — finding all links in a campaign.
 *
 * @param html - Email HTML content
 */
export function extractUrlsFromHtml(html: string): string[] {
  if (!html) return [];

  const urls: string[] = [];
  const regex = /href=(["'])(.*?)\1/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const url = match[2].trim();
    // Skip system links
    if (
      url &&
      !SKIP_URL_PATTERNS.some((p) => url.startsWith(p) || url.includes(p)) &&
      !urls.includes(url)
    ) {
      urls.push(url);
    }
  }

  return urls;
}