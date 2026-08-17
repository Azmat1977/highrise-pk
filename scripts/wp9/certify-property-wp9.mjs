import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, summary, writeJson, writeText } from './lib/common.mjs';
import { checkPrerequisites } from './check-prerequisites.mjs';
import { testLifecycleContracts } from './test-lifecycle-contracts.mjs';
import { testPublicVisibility } from './test-public-visibility.mjs';
import { testTaxonomySerializer } from './test-taxonomy-serializer.mjs';
import { testSensitiveProjection } from './test-sensitive-projection.mjs';
import { scanRouteRetirement } from './scan-route-retirement.mjs';
import { testWp8Integration } from './test-wp8-communication-integration.mjs';
import { runCanonicalQualityGates } from './run-canonical-quality-gates.mjs';

const args = parseArgs(process.argv.slice(2));
const startedAt = new Date().toISOString();
const phases = [];

const prerequisites = checkPrerequisites(args.root);
phases.push(prerequisites);

const prerequisitesPass = prerequisites.summary.failed === 0;
if (prerequisitesPass) {
  phases.push(testLifecycleContracts(args.root));
  phases.push(testPublicVisibility(args.root));
  phases.push(testTaxonomySerializer(args.root));
  phases.push(testSensitiveProjection(args.root));
  phases.push(scanRouteRetirement(args.root));
  phases.push(testWp8Integration(args.root));

  const staticFailures = phases.slice(1).reduce((sum, phase) => sum + phase.summary.failed, 0);
  if (staticFailures === 0 && !args.skipCanonicalBuild) {
    phases.push(runCanonicalQualityGates(args.root));
  }
}

const allResults = phases.flatMap((phase) => phase.results);
const totals = summary(allResults);
const certificationPass = prerequisitesPass && totals.failed === 0 && !args.skipCanonicalBuild && phases.some((phase) => phase.name === 'canonical-quality-gates');
const status = certificationPass ? 'PASS' : 'BLOCKED_OR_FAILED';
const report = {
  certification: 'HIGHRISE SECTION 01 — PROPERTY — WP9 AUTOMATED CERTIFICATION',
  status,
  root: args.root,
  startedAt,
  finishedAt: new Date().toISOString(),
  totals,
  prerequisitesPass,
  canonicalQualityGatesExecuted: phases.some((phase) => phase.name === 'canonical-quality-gates'),
  note: certificationPass
    ? 'WP9 automated certification passed. WP10 manual/browser certification is still required before Section 01 can be certified for launch.'
    : 'WP9 did not certify the Property subsystem. Resolve every failed prerequisite/static/build gate, rerun, and preserve the generated evidence.',
  phases,
};

fs.mkdirSync(args.reportDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(args.reportDir, `WP9_CERTIFICATION_${stamp}.json`);
const mdPath = path.join(args.reportDir, `WP9_CERTIFICATION_${stamp}.md`);
writeJson(jsonPath, report);

const lines = [
  '# Highrise.pk — Property WP9 Automated Certification',
  '',
  `Status: **${status}**`,
  `Target: \`${args.root}\``,
  `Checks: ${totals.passed}/${totals.total} passed; ${totals.failed} failed; ${totals.warnings} warning(s).`,
  '',
];
for (const phase of phases) {
  lines.push(`## ${phase.name}`, '', `Result: ${phase.summary.passed}/${phase.summary.total} passed; ${phase.summary.failed} failed; ${phase.summary.warnings} warning(s).`, '');
  for (const item of phase.results) lines.push(`- ${item.ok ? 'PASS' : item.severity === 'warning' ? 'WARN' : 'FAIL'} — ${item.id}: ${item.message}`);
  lines.push('');
}
lines.push('## Certification rule', '', certificationPass
  ? 'WP9 automated certification passed. **Do not mark Section 01 certified yet; WP10 manual certification remains mandatory.**'
  : '**No certification issued.** WP9 is fail-closed and cannot be passed by skipping the canonical quality/build phase or by testing only a recovered delta.', '');
writeText(mdPath, lines.join('\n'));

console.log(lines.join('\n'));
console.log(`\nJSON evidence: ${jsonPath}`);
console.log(`Markdown evidence: ${mdPath}`);
process.exitCode = certificationPass ? 0 : 1;
