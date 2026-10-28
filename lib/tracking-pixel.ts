// lib/tracking-pixel.ts
// SERVER ONLY — generates tracking pixel HTML and GIF buffer
// Injected at bottom of each campaign email

import crypto from 'crypto';

// ─── Constants ────────────────────────────────────────────────
const SITE_URL = process.env.NEXTAUTH_URL || 'https://highrise.pk';

/**
 * Generate a crypto-secure token for a recipient.
 * Used to authenticate open/click events without exposing IDs.
 * 32 bytes = 64 hex chars = effectively unguessable.
 */
export function generateTrackingToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Build the tracking pixel <img> tag HTML.
 * Injected just before </body> in each email.
 *
 * @param campaignId  - MongoDB ObjectId string of campaign
 * @param token       - Per-recipient crypto token
 */
export function buildTrackingPixelHtml(
  campaignId: string,
  token: string
): string {
  const pixelUrl = `${SITE_URL}/api/track/open?cid=${encodeURIComponent(campaignId)}&token=${encodeURIComponent(token)}`;

  // 1x1 transparent pixel — must be <img> not CSS background
  // Width/height=1 prevents Gmail clipping
  // border=0 for Outlook compatibility
  return `<img src="${pixelUrl}" width="1" height="1" border="0" alt="" style="display:block;width:1px;height:1px;border:0;margin:0;padding:0;" />`;
}

/**
 * Returns a 1x1 transparent GIF as a Buffer.
 * Served by /api/track/open when pixel is loaded.
 *
 * This is the smallest valid GIF possible (35 bytes).
 */
export function getTransparentPixelBuffer(): Buffer {
  // Minimal 1x1 transparent GIF (GIF89a format)
  return Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
}

/**
 * Inject tracking pixel into completed email HTML.
 * Inserts just before </body> for maximum compatibility.
 *
 * @param html        - Complete email HTML string
 * @param campaignId  - Campaign MongoDB ID
 * @param token       - Per-recipient crypto token
 */
export function injectTrackingPixel(
  html: string,
  campaignId: string,
  token: string
): string {
  const pixelHtml = buildTrackingPixelHtml(campaignId, token);

  // Insert before </body> — most reliable position
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelHtml}\n</body>`);
  }

  // Fallback: append at end
  return html + pixelHtml;
}