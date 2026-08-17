import { readIfExists, result, summary } from './lib/common.mjs';
import { PUBLIC_CONSUMERS } from './wp9-config.mjs';

export function testPublicVisibility(root) {
  const policy = readIfExists(root, 'lib/property/publicProperty.ts');
  const tests = [];

  tests.push(result('PUB-001', /verified/i.test(policy), 'Public policy requires verified state', 'lib/property/publicProperty.ts'));
  tests.push(result('PUB-002', /isDeleted|deleted/i.test(policy), 'Public policy excludes deleted Property', 'lib/property/publicProperty.ts'));
  tests.push(result('PUB-003', /isFlagged|flagged/i.test(policy), 'Public policy excludes flagged/restricted Property', 'lib/property/publicProperty.ts'));

  for (const rel of PUBLIC_CONSUMERS) {
    const source = readIfExists(root, rel);
    if (!source) {
      tests.push(result(`PUB-MISSING-${rel}`, false, `Public consumer missing: ${rel}`, rel));
      continue;
    }
    const canonical = /PUBLIC_PROPERTY_FILTER|publicProperty|isPropertyPublic|propertyService|propertyDecisionState/i.test(source);
    const legacyOnly = /status\s*:\s*['\"](?:approved|available)['\"]/.test(source) && !canonical;
    tests.push(result(`PUB-CANON-${rel}`, canonical && !legacyOnly, `Public consumer uses canonical publication semantics: ${rel}`, rel));
  }

  return { name: 'public-visibility', results: tests, summary: summary(tests) };
}
