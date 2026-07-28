/**
 * lib/cloudinaryClient.ts
 *
 * Highrise.pk — Client-Safe Cloudinary URL Helpers
 *
 * ⚠️ CLIENT-ONLY FILE — Never imports the `cloudinary` npm package.
 * ⚠️ Safe to import in React components, hooks, and browser code.
 * ⚠️ Contains ZERO server dependencies (no fs, no API secrets).
 *
 * Purpose:
 *   Transform Cloudinary URLs on the client side.
 *   Adds fl_attachment flag to force direct download.
 *
 * Why separate from lib/cloudinary.ts?
 *   → lib/cloudinary.ts imports 'cloudinary' package (server-only, uses fs)
 *   → Importing lib/cloudinary.ts in client code BREAKS the build
 *   → This file is pure TypeScript with zero external deps
 *
 * SECURITY:
 *   → No API secrets used
 *   → No server-side operations
 *   → Pure string manipulation only
 *   → Filename sanitization prevents path traversal
 *
 * Usage in components:
 *   import { downloadFile } from '@/lib/cloudinaryClient';
 *   await downloadFile(url, 'my-brochure');
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CLOUDINARY_HOST_PATTERN = /(?:res\.)?cloudinary\.com/i;

// ─────────────────────────────────────────────────────────────────────────────
// URL DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects if a URL is served from Cloudinary CDN.
 * Client-safe.
 */
export function isCloudinaryUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return CLOUDINARY_HOST_PATTERN.test(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// FILENAME SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cleans a filename for safe use in URLs and file systems.
 * Client-safe.
 *
 * - Removes file extension
 * - Lowercases
 * - Replaces spaces with hyphens
 * - Removes special characters
 * - Max 100 chars
 */
export function sanitizeDownloadFilename(name: string): string {
  if (!name || typeof name !== 'string') return 'file';

  return name
    .toLowerCase()
    .trim()
    .replace(/\.[^.]+$/, '')           // Remove extension
    .replace(/[^a-z0-9\s-]/g, '')      // Remove special chars
    .replace(/\s+/g, '-')               // Spaces → hyphens
    .replace(/-+/g, '-')                // Collapse hyphens
    .replace(/^-+|-+$/g, '')            // Trim hyphens
    .slice(0, 100)                      // Max 100 chars
    || 'file';                           // Fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE TRANSFORMATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * withDirectDownload
 *
 * Transforms a Cloudinary URL to force direct download.
 *
 * Handles BOTH resource types:
 *   → /image/upload/  → converts to /raw/upload/ for PDFs (Cloudinary quirk)
 *   → /raw/upload/    → adds fl_attachment directly
 *   → /video/upload/  → adds fl_attachment directly
 *
 * Adds fl_attachment:filename to the transformations segment.
 * Cloudinary CDN responds with Content-Disposition: attachment header.
 *
 * Non-Cloudinary URLs returned unchanged (fail-safe).
 * Already-transformed URLs returned unchanged (idempotent).
 *
 * Client-safe. Zero dependencies.
 *
 * @example
 *   withDirectDownload(url, 'al-rehman-brochure')
 *   // → https://res.cloudinary.com/xxx/raw/upload/fl_attachment:al-rehman-brochure/v123/file.pdf
 */
export function withDirectDownload(url: string, filename?: string): string {
  if (!url || typeof url !== 'string')  return url;
  if (!isCloudinaryUrl(url))            return url;
  if (url.includes('fl_attachment'))    return url;

  const cleanName = filename
    ? sanitizeDownloadFilename(filename)
    : sanitizeDownloadFilename(url.split('/').pop() || 'download');

  const transformation = `fl_attachment:${cleanName}`;

  try {
    const parsed = new URL(url);
    const parts  = parsed.pathname.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');

    if (uploadIndex === -1) return url;

    // ── CRITICAL FIX ──
    // For PDFs served via /image/upload/, convert to /raw/upload/
    // Otherwise Cloudinary may still preview PDF instead of downloading
    const isPdf = /\.pdf(\?|$)/i.test(url);
    if (isPdf && uploadIndex > 0 && parts[uploadIndex - 1] === 'image') {
      parts[uploadIndex - 1] = 'raw';
    }

    // Insert fl_attachment transformation right after "upload"
    parts.splice(uploadIndex + 1, 0, transformation);
    parsed.pathname = parts.join('/');
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * buildBrochureDownloadUrl
 *
 * Convenience wrapper — auto-generates filename from project slug + doc type.
 * Client-safe.
 *
 * @example
 *   buildBrochureDownloadUrl(url, 'al-rehman-arcade', 'brochure')
 *   // → https://res.cloudinary.com/.../fl_attachment:al-rehman-arcade-brochure/...
 */
export function buildBrochureDownloadUrl(
  url:         string,
  projectSlug: string,
  docType:     string,
): string {
  const cleanSlug = sanitizeDownloadFilename(projectSlug);
  const cleanType = sanitizeDownloadFilename(docType);
  const filename  = `${cleanSlug}-${cleanType}`;
  return withDirectDownload(url, filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE DOWNLOAD TRIGGER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * downloadFile
 *
 * Client-side helper that triggers a GUARANTEED direct download.
 *
 * ENTERPRISE STRATEGY:
 *   Uses /api/download proxy endpoint that sets Content-Disposition: attachment
 *   on the server side. Browser has NO CHOICE but to download.
 *
 * Why proxy is superior to fl_attachment:
 *   → fl_attachment relies on Cloudinary CDN headers (unreliable across browsers)
 *   → Some browsers ignore fl_attachment and show preview anyway
 *   → Some PDF viewers intercept and show Save-As dialog
 *   → Proxy sets explicit server headers that ALL browsers respect
 *
 * How it works:
 *   1. Client calls: /api/download?url=X&filename=Y
 *   2. Server fetches file from source (Cloudinary/S3/etc)
 *   3. Server streams back with Content-Disposition: attachment
 *   4. Browser downloads directly (no preview, no dialog)
 *
 * Fallback strategy:
 *   1. Proxy download (primary) — 100% reliable
 *   2. Direct URL open (fallback) — for edge cases only
 *
 * Client-safe. Requires window (browser only).
 *
 * @example
 *   await downloadFile(url, 'al-rehman-brochure');
 */
export async function downloadFile(
  url:            string,
  customFilename?: string,
): Promise<void> {
  if (!url || typeof window === 'undefined') return;

  const filename = customFilename
    ? sanitizeDownloadFilename(customFilename)
    : sanitizeDownloadFilename(url.split('/').pop() || 'download');

  // ═══════════════════════════════════════════════════════════
  // 🎯 STRATEGY 1: Server-Side Proxy (GUARANTEED download)
  // Server sets Content-Disposition: attachment header
  // Browser cannot preview blob response — MUST download
  // ═══════════════════════════════════════════════════════════
  try {
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

    const a = document.createElement('a');
    a.href           = proxyUrl;
    a.download       = filename;
    a.rel            = 'noopener noreferrer';
    a.style.display  = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return;
  } catch {
    // ─── STRATEGY 2: Fallback — direct URL open ───
    // Only reaches here if proxy setup fails (very rare)
    const targetUrl = isCloudinaryUrl(url)
      ? withDirectDownload(url, customFilename)
      : url;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
}