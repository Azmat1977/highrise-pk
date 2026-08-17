import { exists, readIfExists, result, summary, walk } from './lib/common.mjs';
import { LEGACY_FORM_CANDIDATES, LEGACY_PROPERTY_ROUTE_CANDIDATES } from './wp9-config.mjs';

export function scanRouteRetirement(root) {
  const tests = [];

  for (const rel of LEGACY_PROPERTY_ROUTE_CANDIDATES) {
    if (!exists(root, rel)) {
      tests.push(result(`ROUTE-RETIRED-${rel}`, true, `Legacy route removed: ${rel}`, rel));
      continue;
    }
    const source = readIfExists(root, rel);
    tests.push(result(`ROUTE-410-${rel}`, /410|gone|retired|replacement/i.test(source), `Legacy route is explicit retirement/410 rather than an active competing mutation path: ${rel}`, rel));
  }

  for (const rel of LEGACY_FORM_CANDIDATES) {
    if (!exists(root, rel)) {
      tests.push(result(`FORM-RETIRED-${rel}`, true, `Legacy/unreferenced Property form/filter absent: ${rel}`, rel));
      continue;
    }
    const normalized = rel.replaceAll('\\', '/');
    const filename = normalized.split('/').pop().replace(/\.[^.]+$/, '');
    const refs = walk(root).filter((candidate) => {
      if (candidate === normalized) return false;
      const source = readIfExists(root, candidate);
      return source.includes(filename) || source.includes(normalized.replace(/\.(tsx?|jsx?)$/, ''));
    });
    tests.push(result(`FORM-REF-${rel}`, refs.length === 0, `Legacy candidate has no active source references before retirement: ${rel}`, refs, refs.length ? 'warning' : 'error'));
  }

  const apiFiles = walk(root, 'pages/api').filter((rel) => /\.(ts|js)$/.test(rel));
  const caseMap = new Map();
  for (const rel of apiFiles) {
    const key = rel.toLowerCase();
    const list = caseMap.get(key) || [];
    list.push(rel);
    caseMap.set(key, list);
  }
  const collisions = [...caseMap.values()].filter((list) => list.length > 1);
  tests.push(result('ROUTE-CASE-COLLISIONS', collisions.length === 0, 'No case-insensitive API route collisions exist', collisions));

  return { name: 'route-retirement', results: tests, summary: summary(tests) };
}
