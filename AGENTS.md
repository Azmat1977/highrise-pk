# AGENTS.md

Highrise.pk — Pakistani real-estate platform. Single Next.js **15 Pages Router** app (no separate backend/frontend): TypeScript strict, Mongoose 7.8 + MongoDB Atlas, NextAuth v4 (JWT), Upstash Redis, Cloudinary, Tailwind. Node 22.13.x / npm 10.x pinned via `engines`.

## Commands

- `npm run dev` — dev server
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — eslint (warnings are accepted debt); `npm run lint:strict` — errors only
- `npm run verify:code` — **standard pre-finish check**: source-security scan + typecheck + lint --quiet
- `npm run verify:env -- --production` — checks `.env.local` against the required list in `scripts/validate-production-env.mjs`
- `npm run build` / `npm run verify:production` — release gate (env + security + audit + typecheck + lint + build)
- **No test suite or test runner exists.** Do not invent test commands; verify with typecheck + lint (+ build when it matters).

`.env.local` is required for anything touching DB/auth. `lib/dbConnect.ts` **throws at import time** if `MONGODB_URI` is missing.

## Layout

- `pages/` — all routes; Pages Router only (`getServerSideProps`/`getStaticProps`, `next/head`; no App Router, no server components)
- `pages/api/` — API routes
- `components/` — PascalCase for newer components; some legacy files are kebab/lowercase (`property-card.tsx`, `footer.tsx`)
- `models/` — Mongoose schemas; `types/` — shared types (`types/projects.ts` is the locked contract for the projects listing page)
- `lib/` — server utilities (`dbConnect`, `requireAuth`, `rateLimit`, `security/*`); `lib/design-system/` — tokens/icons/typography used by newer pages
- `@/*` path alias maps to repo root

## Hard gotchas

- **Middleware is deny-by-default** (`middleware.ts`): any route not covered by `PUBLIC_EXACT_PATHS`, `PUBLIC_PREFIXES`, `PUBLIC_PROFILE_ROUTES` (`/agent|/developer|/society/[slug]`), or `ROUTE_RULES` redirects to `/login`. **New page routes must be registered in `middleware.ts` or they are unreachable.**
- **Build reads the DB**: `getStaticPaths`/`getStaticProps` in `pages/projects/[slug]`, `pages/developers/[slug]`, `pages/societies/[slug]` and the sitemaps call `dbConnect()` at build time — `npm run build` needs a reachable `MONGODB_URI`.
- **`next/image` remote hosts are restricted** to Cloudinary, Unsplash, ui-avatars, googleusercontent, and Google Maps hosts (`next.config.js` remotePatterns + CSP `img-src`). Arbitrary image URLs hard-fail. Use `utils/cloudinaryTransform.ts` for Cloudinary sizing.
- **Do not edit backup/artifact paths**: `_backup_v641_cleanup/`, `.highrise-backups/`, `highrise-auth-foundation*/`, `highrise-trusted-auth-sessions*/`, `highrise-signup-verification-v1/`, root `*.zip`, `highrise-*.txt` logs, `*-structure.txt` / `*-files.txt` / `*-tree.txt`. Stale copies, excluded from tsconfig and eslint.
- **API route house pattern**: Zod-validate input, `rateLimitApi(req)` / `rateLimitApiWrite(req)` (auto-skips when `RATE_LIMIT_DISABLED=1` or Upstash env vars are absent), `requireAuth`/`requireRole`/`requireAdmin` from `lib/requireAuth.ts` (DB-checked `tokenVersion` — middleware cannot check it), and `logSecurityEvent` from `lib/security/logSecurityEvent.ts` for security-relevant events.
- **Two overlapping role systems**: canonical authority roles (`user`/`editor`/`admin`/`superadmin`/...) plus legacy marketplace roles + capabilities (`agent`, `developer`, `society`, `property_owner`, `property_developer`, `housing_society`, ...). See `middleware.ts` and `lib/auth`.
- Cron endpoints listed in `vercel.json` (`/api/cron/send-scheduled-campaigns`, `/api/automation/process`) are protected by the `CRON_SECRET` bearer header.

## Conventions

- Brand palette is locked across the codebase: primary teal `#029bba`, navy `#004063`, dark hero `#001f2b`; design tokens in `tailwind.config.js` and `lib/design-system/tokens.ts`. Don't introduce new brand colors.
- Prices formatted as PKR in Lakh/Crore/Arab via `formatPKR` (`types/projects.ts`); areas in Marla/Kanal, not sqft-first.
- Pages render inside wide shells (`max-w-[1440px]`); shared primitives in `components/ui/` (Radix-based); inquiries go through `components/UniversalInquiryModal.tsx` — never expose phone/email directly.
- Certification/launch runbooks live in `docs/` (WP9/WP10, launch checklist); helper scripts in `scripts/` (PowerShell-first on Windows).
