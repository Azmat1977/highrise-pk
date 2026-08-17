# WP10 Windows Runbook

Use the integrated local/staging build for destructive tests.

Project root:
`C:\dev\highrise-pk`

Evidence folder outside source:
`C:\Highrise Updates & Backups\Property WP10 Evidence`

## 1 — Confirm WP9 PASS first
Do not issue final WP10 certification without a clean WP9 report.

## 2 — Initialize evidence
From the project root after copying the WP10 helper scripts:

```powershell
node .\scripts\wp10\init-evidence.mjs "C:\Highrise Updates & Backups\Property WP10 Evidence"
```

## 3 — Record execution identity
In `WP10_EVIDENCE.json`, record base URL, source fingerprint/commit, WP9 report path/status, and disposable fixture IDs/names (never secrets).

## 4 — Execute category by category
Recommended order:
Lifecycle → Roles → Taxonomy → Media → Discovery → Communication → API abuse/privacy → SEO/browser/accessibility.

Save evidence under folders named by test ID, e.g.
`C:\Highrise Updates & Backups\Property WP10 Evidence\evidence\A06\`

## 5 — Validate
```powershell
node .\scripts\wp10\validate-evidence.mjs "C:\Highrise Updates & Backups\Property WP10 Evidence\WP10_EVIDENCE.json"
```

## 6 — Generate certificate only after PASS
```powershell
node .\scripts\wp10\generate-certificate.mjs "C:\Highrise Updates & Backups\Property WP10 Evidence\WP10_EVIDENCE.json" "C:\Highrise Updates & Backups\Property WP10 Evidence\HIGHRISE_PROPERTY_SECTION01_CERTIFICATE.md"
```
