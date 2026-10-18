import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Phase 2B · route-integrity regression tests.
 *
 * These assert the *static* facts of this batch: primary navigation no longer
 * points at routes that do not exist, legacy auth URLs map onto the real
 * /login flows, and no source file still redirects users to the nonexistent
 * /auth/login or /auth/register pages.
 */

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, 'pages');

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function collectPageRoutes(): Set<string> {
  const routes = new Set<string>();
  for (const file of walkFiles(PAGES_DIR)) {
    let rel = path.relative(PAGES_DIR, file).replace(/\\/g, '/');
    rel = rel.replace(/\.(ts|tsx|js|jsx)$/, '');
    rel = rel.replace(/\/index$/, '');
    routes.add(rel === 'index' ? '/' : `/${rel}`);
  }
  return routes;
}

const PAGE_ROUTES = collectPageRoutes();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Extract statically-known internal (`/…`) link destinations from source. */
function staticInternalLinks(source: string): string[] {
  const found: string[] = [];
  const re = /(?:href|url|to)\s*[:=]\s*["']([^"']*)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const value = match[1];
    if (!value.startsWith('/')) continue;
    if (value.startsWith('//')) continue;
    if (value.includes('${')) continue; // dynamic template literal
    if (value.startsWith('/_next')) continue;
    const clean = value.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    found.push(clean);
  }
  return found;
}

describe('Phase 2B · primary navigation targets exist', () => {
  const navFiles = [
    'components/layout/header.tsx',
    'components/layout/footer.tsx',
    'components/shared/SafeDealSidebarCard.tsx',
  ];

  for (const file of navFiles) {
    it(`${file} has no dead internal links`, () => {
      const missing = staticInternalLinks(read(file)).filter(
        (href) => !PAGE_ROUTES.has(href),
      );
      expect(missing).toEqual([]);
    });
  }
});

describe('Phase 2B · dead navigation entries removed', () => {
  it('header no longer links to /safedeal or the four missing admin tools', () => {
    const header = read('components/layout/header.tsx');
    for (const dead of [
      '"/safedeal"',
      '"/admin/providers"',
      '"/admin/labour"',
      '"/admin/safedeal"',
      '"/admin/homevisit"',
    ]) {
      expect(header).not.toContain(dead);
    }
  });

  it('SafeDealSidebarCard keeps only real contact actions', () => {
    const card = read('components/shared/SafeDealSidebarCard.tsx');
    expect(card).not.toContain('/safedeal');
    expect(card).toContain('https://wa.me/');
  });

  it('footer Cookies link reuses the privacy-policy disclosure', () => {
    const footer = read('components/layout/footer.tsx');
    expect(footer).toContain('href="/privacy-policy#cookies"');
    expect(footer).not.toContain('href="/cookies"');
  });

  it('privacy policy exposes the #cookies anchor', () => {
    const page = read('pages/privacy-policy.tsx');
    expect(page).toMatch(/id:\s*'cookies'/);
    expect(page).toContain('id={section.id}');
  });

  it('login page points Forgot password at the supported flow', () => {
    const login = read('pages/login.tsx');
    expect(login).toContain('/login?mode=forgot');
    expect(login).not.toContain('href="/forgot-password"');
  });

  it('dashboard registration link uses the in-place signup flow', () => {
    expect(read('pages/dashboard.tsx')).not.toContain('href="/register"');
  });

  it('society onboarding consent links use the real legal pages', () => {
    const society = read('pages/onboarding/society.tsx');
    expect(society).toContain('href="/terms-of-service"');
    expect(society).toContain('href="/privacy-policy"');
    expect(society).not.toContain('href="/terms"');
    expect(society).not.toContain('href="/privacy"');
  });

  it('blog RSS autodiscovery points at the real feed endpoint', () => {
    const slug = read('pages/blog/[slug].tsx');
    expect(slug).toContain('href="/api/blogs/rss"');
    expect(slug).not.toContain('/blog/rss.xml');
  });

  it('society dashboard block stat is not a link to a missing page', () => {
    expect(read('pages/society/dashboard.tsx')).not.toContain('/society/blocks');
  });

  it('blog tag page does not link to a missing /newsletter page', () => {
    expect(read('pages/blog/tag/[tag].tsx')).not.toContain('href="/newsletter"');
  });
});

describe('Phase 2B · canonical auth routes', () => {
  it('no source file redirects to the nonexistent /auth/login or /auth/register', () => {
    const offenders: string[] = [];
    const re = /["'`]\/auth\/(login|register)/;
    for (const dir of ['pages', 'components', 'lib']) {
      for (const file of walkFiles(path.join(ROOT, dir))) {
        const source = fs.readFileSync(file, 'utf8');
        if (re.test(source)) offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('guards preserve the intended destination via callbackUrl', () => {
    expect(read('components/AdminGuard.tsx')).toContain(
      '/login?callbackUrl=${encodeURIComponent(router.asPath)}',
    );
    expect(read('components/DeveloperGuard.tsx')).toContain(
      '/login?callbackUrl=${returnUrl}',
    );
  });

  it('sign-out lands on the real /login page (no loop through /auth/login)', () => {
    expect(read('components/admin/AdminLayout.tsx')).toContain(
      "signOut({ callbackUrl: '/login' })",
    );
    expect(read('components/developer/DeveloperLayout.tsx')).toContain(
      'signOut({ callbackUrl: "/login" })',
    );
  });

  it('admin approval email links to the real login page', () => {
    const approve = read('pages/api/admin/developers/[developerId]/approve.ts');
    expect(approve).toContain('${siteUrl}/login');
    expect(approve).not.toContain('${siteUrl}/auth/login');
  });
});

describe('Phase 2B · legacy auth URL mapping', () => {
  it('next.config redirects legacy auth URLs onto the /login flows', () => {
    const cfg = read('next.config.js');
    expect(cfg).toMatch(
      /source:\s*'\/register',\s*destination:\s*'\/login\?mode=signup'/,
    );
    expect(cfg).toMatch(
      /source:\s*'\/forgot-password',\s*destination:\s*'\/login\?mode=forgot'/,
    );
    expect(cfg).toMatch(
      /source:\s*'\/reset-password',\s*destination:\s*'\/login\?mode=forgot'/,
    );
  });

  it('redirect-backed auth paths stay in the middleware public allowlist', () => {
    const middleware = read('middleware.ts');
    const start = middleware.indexOf('const PUBLIC_EXACT_PATHS');
    const block = middleware.slice(start, middleware.indexOf('PUBLIC_PREFIXES', start));
    for (const kept of ['"/login"', '"/register"', '"/forgot-password"', '"/reset-password"']) {
      expect(block).toContain(kept);
    }
  });

  it('stale, page-less public allowlist entries were removed', () => {
    const middleware = read('middleware.ts');
    const start = middleware.indexOf('const PUBLIC_EXACT_PATHS');
    const block = middleware.slice(start, middleware.indexOf('PUBLIC_PREFIXES', start));
    for (const dead of [
      '"/faq"',
      '"/help"',
      '"/careers"',
      '"/news"',
      '"/press"',
      '"/advertise"',
      '"/partner"',
      '"/search"',
      '"/verify-email"',
    ]) {
      expect(block).not.toContain(dead);
    }
  });

  it('NextAuth no longer points verifyRequest at a missing page', () => {
    expect(read('pages/api/auth/[...nextauth].ts')).not.toContain('/verify-email');
  });
});
