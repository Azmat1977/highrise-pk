param(
  [string]$ProjectRoot = "C:\dev\highrise-pk",
  [string]$ReportDir = "C:\Highrise Updates & Backups\Property WP9 Reports"
)

$ErrorActionPreference = "Stop"
Write-Host "=== Highrise.pk Property WP9 Automated Certification ===" -ForegroundColor Cyan
Write-Host "Target: $ProjectRoot"
Write-Host "Reports: $ReportDir"

if (-not (Test-Path $ProjectRoot)) {
  throw "Project root does not exist: $ProjectRoot"
}

Push-Location $ProjectRoot
try {
  node ".\scripts\wp9\certify-property-wp9.mjs" --root "$ProjectRoot" --report-dir "$ReportDir"
  if ($LASTEXITCODE -ne 0) {
    throw "WP9 did not certify. Read the generated report; do not continue to WP10 until every failed gate is resolved."
  }
} finally {
  Pop-Location
}
