# Highrise.pk — Batch 2 dependency refresh
# Run from project root AFTER applying Batch 2 files and backing up the project.
# This script intentionally removes generated dependency/build state and creates a fresh package-lock.json.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Fail([string]$Message) {
  Write-Host "FAIL: $Message" -ForegroundColor Red
  exit 1
}

Write-Host "=== Highrise.pk Batch 2 Dependency Refresh ===" -ForegroundColor Cyan

if (-not (Test-Path 'package.json')) { Fail 'Run this script from the Highrise project root.' }
if (-not (Test-Path 'scripts/highrise-source-security-check.mjs')) { Fail 'Batch 2 files are not fully applied.' }

$nodeRaw = node -p "process.versions.node"
if ($LASTEXITCODE -ne 0) { Fail 'Node.js is not available in PATH.' }
$nodeParts = $nodeRaw.Split('.')
$nodeMajor = [int]$nodeParts[0]
$nodeMinor = [int]$nodeParts[1]
if ($nodeMajor -ne 22 -or $nodeMinor -lt 13) {
  Fail "Node.js 22.13+ (but below 23) is required for this Batch 2 baseline. Found $nodeRaw."
}

$npmRaw = npm -v
if ($LASTEXITCODE -ne 0) { Fail 'npm is not available in PATH.' }
$npmMajor = [int]($npmRaw.Split('.')[0])
if ($npmMajor -ne 10) {
  Fail "npm 10.x is required for the deterministic Batch 2 baseline. Found $npmRaw."
}

Write-Host "Node: v$nodeRaw" -ForegroundColor Green
Write-Host "npm:  $npmRaw" -ForegroundColor Green

Write-Host "`nRunning source-security gate before dependency changes..." -ForegroundColor Cyan
node scripts/highrise-source-security-check.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (Test-Path '.next') {
  Write-Host 'Removing .next generated build output...'
  Remove-Item '.next' -Recurse -Force
}
if (Test-Path 'node_modules') {
  Write-Host 'Removing old node_modules...'
  Remove-Item 'node_modules' -Recurse -Force
}
if (Test-Path 'package-lock.json') {
  Write-Host 'Removing stale package-lock.json so npm can resolve the Batch 2 dependency contract...'
  Remove-Item 'package-lock.json' -Force
}

Write-Host "`nVerifying npm cache..." -ForegroundColor Cyan
npm cache verify
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nInstalling Batch 2 dependencies and generating a fresh package-lock.json..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path 'package-lock.json')) { Fail 'npm install completed without creating package-lock.json.' }

Write-Host "`nChecking direct dependency tree..." -ForegroundColor Cyan
npm list --depth=0
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nChecking production dependency advisories (moderate+ blocks)..." -ForegroundColor Cyan
npm audit --omit=dev --audit-level=moderate
if ($LASTEXITCODE -ne 0) {
  Fail 'Production dependency audit still has moderate/high/critical findings. Do not run npm audit fix --force; share the audit output for review.'
}

Write-Host "`nPASS: Fresh dependencies and package-lock.json are ready." -ForegroundColor Green
Write-Host 'Next run: powershell -ExecutionPolicy Bypass -File .\scripts\prelaunch-check.ps1'
