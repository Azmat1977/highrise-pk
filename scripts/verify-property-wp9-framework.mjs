import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const expected = [
  'scripts/wp9/lib/common.mjs',
  'scripts/wp9/wp9-config.mjs',
  'scripts/wp9/check-prerequisites.mjs',
  'scripts/wp9/test-lifecycle-contracts.mjs',
  'scripts/wp9/test-public-visibility.mjs',
  'scripts/wp9/test-taxonomy-serializer.mjs',
  'scripts/wp9/test-sensitive-projection.mjs',
  'scripts/wp9/scan-route-retirement.mjs',
  'scripts/wp9/test-wp8-communication-integration.mjs',
  'scripts/wp9/run-canonical-quality-gates.mjs',
  'scripts/wp9/certify-property-wp9.mjs',
  'scripts/run-property-wp9.ps1',
  'docs/WP9_AUTOMATED_CERTIFICATION.md',
  'scripts/verify-property-wp9-framework.mjs',
];

const checks = [];
for (const rel of expected) checks.push([`file:${rel}`, fs.existsSync(path.join(root, rel))]);

const cert = fs.readFileSync(path.join(root, 'scripts/wp9/certify-property-wp9.mjs'), 'utf8');
checks.push(['fail-closed-certification', /BLOCKED_OR_FAILED/.test(cert) && /skipCanonicalBuild/.test(cert)]);
checks.push(['wp10-not-auto-certified', /WP10 manual/.test(cert)]);
checks.push(['canonical-quality-phase', /canonical-quality-gates/.test(cert)]);
checks.push(['wp8-integration-phase', /testWp8Integration/.test(cert)]);
checks.push(['privacy-phase', /testSensitiveProjection/.test(cert)]);
checks.push(['route-retirement-phase', /scanRouteRetirement/.test(cert)]);

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed += 1;
}
console.log(`\nWP9 framework verification: ${passed}/${checks.length} PASS`);
process.exitCode = passed === checks.length ? 0 : 1;
