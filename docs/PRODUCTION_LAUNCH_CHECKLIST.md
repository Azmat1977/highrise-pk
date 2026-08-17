# Highrise.pk Production Launch Checklist

## P0 — must pass before public launch

- [ ] Restore and review the real root `next.config.js`.
- [ ] Regenerate `package-lock.json` locally from the hardened `package.json`.
- [ ] `npm audit` has no unresolved exploitable production Critical/High findings, or every accepted exception is documented.
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run build` passes from a clean install.
- [ ] No `.env*`, private key, certificate, database dump, or user KYC file exists in the release archive.
- [ ] `public/uploads/` contains no user upload or identity document.
- [ ] MongoDB Atlas network access is restricted to the deployment environment as tightly as practical; database user has least privilege.
- [ ] Production rate limiting is enabled (`RATE_LIMIT_DISABLED=false`) and Upstash credentials are configured.
- [ ] Turnstile is configured and guest comment/signup abuse paths fail closed when the secret is missing.
- [ ] NextAuth secret is long/random; OAuth callback URLs use the production domain only.
- [ ] KYC/property encryption and hashing secrets are unique, strong, backed up securely, and never reused as login/auth secrets.
- [ ] Existing legacy public KYC assets in Cloudinary are migrated to authenticated delivery; database references retain their public IDs.
- [ ] SMTP TLS certificate verification is enabled and a production test email succeeds.
- [ ] Admin and verifier accounts use strong authentication; privileged 2FA policy is tested.
- [ ] Admin APIs return 401/403 to unauthenticated/non-admin requests even when called directly outside the UI.
- [ ] Owner/agent/developer/project/unit mutations reject cross-account object IDs (IDOR/BOLA tests).
- [ ] Property/project draft, rejected and suspended records cannot be fetched through public batch/detail/search endpoints.

## Authentication / role regression tests

- [ ] New user signup + OTP verification.
- [ ] Login + logout + expired session.
- [ ] Suspended/deleted account cannot continue with an old token.
- [ ] tokenVersion/force logout revokes existing sessions.
- [ ] Owner sees only owner operations.
- [ ] Agent sees only authorized agent/agency resources.
- [ ] Developer sees only own projects/units/documents.
- [ ] Society account sees only own society inventory.
- [ ] Admin/superadmin actions work only through server-side authorization.

## Property / project synchronization

- [ ] Property asset/listing status is consistent between dashboard, search, detail and shortlist endpoints.
- [ ] Project owner key is `Project.developerId` everywhere.
- [ ] Unit project key is `Unit.projectId` everywhere.
- [ ] Public unit counts include published inventory only.
- [ ] Unit status mutations write canonical `bookingInfo` / `soldInfo` fields only.
- [ ] Buyer CNIC is never stored in plaintext.
- [ ] Project payment plans and documents persist under the canonical Project schema.
- [ ] Private project documents return only short-lived authorized URLs.

## SEO / crawlability

- [ ] `/robots.txt` resolves from the dynamic route only (no `public/robots.txt` conflict).
- [ ] `/sitemap.xml` is a sitemap index and every child sitemap returns 200 XML.
- [ ] Public property route `/property/[slug]` is crawlable when verified/published.
- [ ] Public `/developers`, `/agents`, `/societies`, project and property routes do not redirect guests to login.
- [ ] Dashboards/admin pages are blocked from indexing.
- [ ] Canonicals point to one preferred URL.
- [ ] Removed or permanently deleted inventory returns an intentional 404/410 strategy.
- [ ] Structured data reflects visible page content.
- [ ] Search Console and analytics are connected only after production domain is final.

## UI / design consistency

Canonical brand tokens in the current baseline:

- Primary: `#029bba`
- Primary dark: `#017a8a`
- Secondary: `#004063`
- Success: `#10b981`
- Warning: `#f59e0b`
- Danger: `#ef4444`
- Background: `#f8f9fa`

- [ ] New buttons use shared button variants rather than one-off colors.
- [ ] Focus states are visible and keyboard usable.
- [ ] Mobile tap targets are at least ~44px where practical.
- [ ] Page headings, cards, forms and status badges use shared tokens.
- [ ] Hardcoded historical colors are migrated page-by-page; do not blind-replace all hex codes because charts/status semantics differ.
- [ ] Loading, empty, error and success states are visually consistent across dashboards.

## Deployment / operations

- [ ] Production environment variables are configured directly in the hosting provider, not committed.
- [ ] Error monitoring/log aggregation is enabled.
- [ ] MongoDB backup/restore procedure is tested.
- [ ] Cloudinary deletion/orphan cleanup procedure is tested.
- [ ] Cron endpoint accepts only the platform cron bearer secret/admin path.
- [ ] 404/500 pages and maintenance behavior are tested.
- [ ] HTTPS only; HSTS/CSP/security headers verified in the browser/network response.
- [ ] Run a final mobile + desktop smoke test on Chrome, Edge/Safari-compatible browser and an actual phone.
