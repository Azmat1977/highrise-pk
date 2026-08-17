# WP10 — Manual / Browser / Role / API Certification

WP10 proves behaviors that static checks cannot: browser behavior, MongoDB transitions, Cloudinary cleanup, role isolation, object-ID attacks, keyboard/focus behavior, communication routing and public privacy.

## Prerequisite
A clean **WP9 automated PASS** is mandatory for final certification. The framework may be prepared earlier, but execution remains non-certifying while WP9 is blocked/failed.

## Coverage
**112 required cases** across eight categories:
1. Lifecycle
2. Roles & Authorization
3. Listing Types & Taxonomy
4. Media & Evidence
5. Discovery & Decision State
6. Communication & Safety
7. SEO, Browser & UX
8. Direct API Abuse & Privacy

## Evidence rule
A visual check alone is insufficient for security/data-integrity tests. Capture the required evidence listed per test: screenshots/video, network response, page source, DB state, audit record, cleanup queue, Cloudinary state, URL/canonical/sitemap or console/performance evidence.

Never store passwords, session cookies, access tokens, real CNIC files, private signed URLs, API keys, MongoDB URIs or Cloudinary secrets in evidence.

## Status rule
- PASS — expected behavior reproduced with evidence.
- FAIL — behavior contradicts expected result.
- BLOCKED — prerequisite/fixture/environment unavailable.
- NA_WITH_JUSTIFICATION — only if feature is intentionally removed/unsupported and public/API behavior proves that removal.
- NOT_RUN — not tested.

## Final exit
Certification requires WP9 PASS, zero FAIL/BLOCKED/NOT_RUN, justified N/A only, evidence for every PASS, and recorded source fingerprint + tested base URL.
