# Highrise.pk — Property WP10 Manual Certification Package

Date: 2026-08-12

This package builds the **WP10 manual/browser/role/API certification framework**. It does **not** claim that Section 01 has passed WP10.

The preserved roadmap requires:
**WP9 automated PASS → WP10 manual/browser/API PASS → final Section 01 Property certificate.**

## Package contents
- `templates/WP10_TEST_MATRIX.json` — authoritative matrix (**112 required cases**).
- `templates/WP10_TEST_MATRIX.csv` — spreadsheet-friendly matrix.
- `templates/WP10_EVIDENCE_TEMPLATE.json` — evidence workbook.
- `docs/WP10_MANUAL_CERTIFICATION.md`
- `docs/WP10_WINDOWS_RUNBOOK.md`
- `docs/WP10_API_ABUSE_PRIVACY.md`
- `docs/WP10_BROWSER_DEVICE_MATRIX.md`
- `scripts/wp10/init-evidence.mjs`
- `scripts/wp10/validate-evidence.mjs`
- `scripts/wp10/generate-certificate.mjs`
- `scripts/run-property-wp10.ps1`
- `scripts/verify-property-wp10-framework.mjs`

## Safety
Destructive cases (purge, report abuse, media failures) must use disposable local/staging fixtures, never real production customer data.

## Final wording
Only the certificate generator may emit:

> **HIGHRISE SECTION 01 — PROPERTY — CERTIFIED FOR VERIFIED CORE LAUNCH**

and only after WP9=PASS and all required WP10 evidence passes.
