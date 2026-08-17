import path from 'node:path';
import { exists, readIfExists, result, summary } from './lib/common.mjs';
import { REQUIRED_CANONICAL_MODULES, REQUIRED_PROPERTY_ROUTES, WP8_INTEGRATION_EXPECTATIONS } from './wp9-config.mjs';

export function checkPrerequisites(root) {
  const results = [];
  results.push(result('PRE-001', exists(root, 'package.json'), 'package.json exists', 'package.json'));
  results.push(result('PRE-002', exists(root, 'models/Property.ts'), 'models/Property.ts exists', 'models/Property.ts'));
  results.push(result('PRE-003', exists(root, 'models/Lead.ts'), 'models/Lead.ts exists', 'models/Lead.ts'));

  for (const rel of REQUIRED_CANONICAL_MODULES) {
    results.push(result(`PRE-MOD-${rel}`, exists(root, rel), `Canonical module exists: ${rel}`, rel));
  }
  for (const rel of REQUIRED_PROPERTY_ROUTES) {
    results.push(result(`PRE-ROUTE-${rel}`, exists(root, rel), `Required Property route exists: ${rel}`, rel));
  }
  for (const rel of WP8_INTEGRATION_EXPECTATIONS) {
    results.push(result(`PRE-WP8-${rel}`, exists(root, rel), `WP8 integration target exists: ${rel}`, rel));
  }

  const lead = readIfExists(root, 'models/Lead.ts');
  results.push(result(
    'PRE-WP8-OWNER-ROLE',
    /['\"]owner['\"]/.test(lead) && /assignedToRole/.test(lead),
    'Lead recipient role supports Owner explicitly after WP8 merge',
    'models/Lead.ts',
  ));

  const recoveredStatus = readIfExists(root, 'WP8_RECOVERED_DELTA/WP8_BUILD_STATUS.md') || readIfExists(root, 'WP8_BUILD_STATUS.md');
  const looksRecoveredOnly = /NOT YET INTEGRATED|RECOVERED DELTA/i.test(recoveredStatus);
  results.push(result(
    'PRE-WP8-INTEGRATED',
    !looksRecoveredOnly,
    looksRecoveredOnly
      ? 'WP8 status still says recovered delta / not integrated; WP9 certification must stop.'
      : 'No recovered-only WP8 status marker blocks certification.',
    recoveredStatus ? 'WP8_BUILD_STATUS.md' : 'no recovered-only marker',
  ));

  return { name: 'prerequisites', results, summary: summary(results) };
}

if (import.meta.url === `file://${path.resolve(process.argv[1]).replaceAll('\\', '/')}`) {
  const root = path.resolve(process.argv[2] || process.cwd());
  const report = checkPrerequisites(root);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.summary.failed ? 1 : 0;
}
