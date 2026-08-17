param([string]$EvidenceDir="C:\Highrise Updates & Backups\Property WP10 Evidence")
$ErrorActionPreference="Stop"
Write-Host "=== Highrise.pk Property WP10 Manual Certification ==="
if(-not (Test-Path $EvidenceDir)){
  node .\scripts\wp10\init-evidence.mjs $EvidenceDir
  Write-Host "Evidence initialized. Execute the matrix before validation."
  exit 0
}
$evidence=Join-Path $EvidenceDir "WP10_EVIDENCE.json"
if(-not (Test-Path $evidence)){
  node .\scripts\wp10\init-evidence.mjs $EvidenceDir
  exit 0
}
node .\scripts\wp10\validate-evidence.mjs $evidence
