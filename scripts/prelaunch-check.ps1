# Highrise.pk — Production Certification Gate (Batch 2)
# Run from project root after scripts/batch2-refresh-dependencies.ps1.
# Environment values are never printed by Highrise validation scripts.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Fail([string]$Message) {
  Write-Host "FAIL: $Message" -ForegroundColor Red
  exit 1
}

function Run-Step([string]$Title, [scriptblock]$Action) {
  Write-Host "`n=== $Title ===" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host '=== Highrise.pk Batch 2 Production Certification ===' -ForegroundColor Cyan

$requiredFiles = @(
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'middleware.ts',
  'next.config.js',
  '.env.local',
  '.env.production.local',
  'scripts/validate-production-env.mjs',
  'scripts/highrise-source-security-check.mjs'
)
$missing = @($requiredFiles | Where-Object { -not (Test-Path $_) })
if ($missing.Count -gt 0) { Fail "Missing required file(s): $($missing -join ', ')" }

$nodeRaw = node -p "process.versions.node"
if ($LASTEXITCODE -ne 0) { Fail 'Node.js is not available in PATH.' }
$nodeParts = $nodeRaw.Split('.')
if ([int]$nodeParts[0] -ne 22 -or [int]$nodeParts[1] -lt 13) {
  Fail "Node.js 22.13+ (below 23) is required. Found $nodeRaw."
}
$npmRaw = npm -v
if ($LASTEXITCODE -ne 0) { Fail 'npm is not available in PATH.' }
if ([int]($npmRaw.Split('.')[0]) -ne 10) { Fail "npm 10.x is required. Found $npmRaw." }
Write-Host "Node: v$nodeRaw" -ForegroundColor Green
Write-Host "npm:  $npmRaw" -ForegroundColor Green

$env:NODE_ENV = 'production'
Run-Step 'Environment validation' { npm run verify:env -- --production }
Run-Step 'Source security regression gate' { npm run verify:source }

Run-Step 'Installed dependency integrity' { npm list --depth=0 }
Run-Step 'Production dependency audit (moderate+ blocks)' { npm audit --omit=dev --audit-level=moderate }
Run-Step 'Full dependency audit (high/critical blocks)' { npm audit --audit-level=high }

Run-Step 'ESLint — zero warnings' { npm run lint:strict }
Run-Step 'TypeScript — no emit' { npm run typecheck }

if (Test-Path '.next') { Remove-Item '.next' -Recurse -Force }
Run-Step 'Next.js production build' { npm run build }

if (-not (Test-Path '.next/BUILD_ID')) {
  Fail 'Next.js build command returned successfully but .next/BUILD_ID was not created.'
}

Write-Host "`n=== AUTOMATED CERTIFICATION PASS ===" -ForegroundColor Green
Write-Host 'Highrise passed environment, source-security, dependency, lint, typecheck and production-build gates.'
Write-Host 'Do not deploy until the manual role/auth/property/upload/email smoke-test checklist is also completed.'
