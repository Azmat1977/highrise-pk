# Highrise.pk — Section 01 Property WP9 Automated Certification

## Purpose

WP9 is not a new feature package. It is the automated evidence layer that must prove the cumulative Property implementation is internally coherent before WP10 browser/manual certification.

WP9 is deliberately **fail-closed**. Missing source, incomplete WP8 integration, sensitive-field leakage, active legacy mutation routes, TypeScript/lint/security failures, dependency audit failures, or a failed production build all prevent certification.

## Required order

1. WP1–WP7 cumulative Property source is present.
2. WP8 is actually merged into that same tree (not merely present as `WP8_RECOVERED_DELTA`).
3. Run the static/contract phases.
4. Run canonical environment/source-security/dependency/lint/type/build gates.
5. Preserve JSON + Markdown evidence outside the live project.
6. Only a clean WP9 result allows WP10 to begin.

## Automated phases

### A. Prerequisite integrity
- verifies canonical Property modules exist;
- verifies critical Property API routes exist;
- verifies Lead model supports Owner routing;
- blocks recovered-only/not-integrated WP8 state.

### B. Lifecycle contracts
- draft → pending → under_review → verified/rejected/flagged semantics;
- material verified edits return through re-review policy;
- owner-lock states remain centralized;
- legacy state remains compatibility, not publication authority.

### C. Public visibility regression
- verified-only publication;
- deleted/flagged/restricted inventory excluded;
- discovery/detail/sitemap/Favorites/Recently Viewed use canonical policy rather than private local status guesses.

### D. Taxonomy + serializer parity
- residential/commercial/plots discovery groups;
- Property subtype support;
- Pakistan-market plot aliases;
- canonical mutation normalization;
- public multi-type/category serialization parity.

### E. Sensitive projection
- central public-safe DTO exists;
- public/detail/card/decision/SEO surfaces are scanned for unguarded private fields;
- no hard-coded Cloudinary API secret in Property APIs.

### F. Route retirement / collision
- known historical direct moderation routes must be removed or explicit 410 retirements;
- legacy form/filter candidates are reference-scanned;
- case-insensitive API collisions fail.

### G. WP8 communication integration
- narrow inquiry/callback/site-visit contract;
- no client recipient overrides;
- Developer → Agent → Owner accountable routing;
- inactive accountable actor fails closed;
- recipient dashboard filter binds user ID + role;
- Owner is a real Lead recipient role;
- Property page does not submit recipient IDs;
- Property-scoped communication endpoint exists;
- generic routes cannot remain an obvious Property routing bypass.

### H. Canonical quality gates
The runner attempts the hardened project scripts where present and requires:
- production environment validation if configured;
- source-security gate if configured;
- `npm audit --omit=dev --audit-level=high`;
- strict lint;
- TypeScript no-emit check (project script preferred, otherwise `npx tsc --noEmit`);
- clean production `npm run build`.

WP9 never upgrades dependencies or edits `.env` by itself.

## How to install into the cumulative isolated/canonical tree

Copy:

- `scripts/wp9/`
- `scripts/run-property-wp9.ps1`

Optionally add the package.json script in `patches/package-json-WP9.patch` after exact-context review.

Do not use this package to overwrite Property business logic. It is a certification harness.

## Windows execution

From the project root after WP8 integration:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-property-wp9.ps1
```

The report folder should remain outside the canonical live source, e.g. `C:\Highrise Updates & Backups\Property WP9 Reports`.

## Exit rule

A WP9 PASS does **not** certify Section 01 by itself.

The sequence remains:

**WP9 automated PASS → WP10 manual/browser/role/API certification → Section 01 Property certificate.**
