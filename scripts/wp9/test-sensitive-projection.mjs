import { readIfExists, result, summary, walk } from './lib/common.mjs';
import { PRIVATE_FIELD_PATTERNS } from './wp9-config.mjs';

const SENSITIVE_PUBLIC_FILES = [
  'lib/property/propertyPublicDto.ts',
  'lib/property/propertyDecisionState.ts',
  'pages/api/properties/by-slug/[slug].ts',
  'components/property/property-grid.tsx',
  'lib/seo/property-jsonld.ts',
];

export function testSensitiveProjection(root) {
  const tests = [];
  const dto = readIfExists(root, 'lib/property/propertyPublicDto.ts');
  tests.push(result('PII-DTO-EXISTS', Boolean(dto), 'Central public Property DTO exists', 'lib/property/propertyPublicDto.ts'));
  tests.push(result('PII-DTO-SCRUB', /delete|omit|pick|projection|scrub|safe/i.test(dto), 'Public DTO contains explicit least-privilege/scrubbing behavior', 'lib/property/propertyPublicDto.ts'));

  for (const rel of SENSITIVE_PUBLIC_FILES) {
    const source = readIfExists(root, rel);
    if (!source) {
      tests.push(result(`PII-MISSING-${rel}`, false, `Sensitive public surface missing: ${rel}`, rel));
      continue;
    }
    for (const pattern of PRIVATE_FIELD_PATTERNS) {
      const hit = pattern.test(source);
      const obviouslyDefensive = hit && /delete|omit|exclude|strip|never|no direct|redact|safe/i.test(source);
      tests.push(result(`PII-${rel}-${pattern.source}`, !hit || obviouslyDefensive, `No unguarded sensitive-field projection in ${rel}: /${pattern.source}/`, rel));
    }
  }

  const publicFiles = walk(root, 'pages/api/properties').filter((rel) => rel.endsWith('.ts') || rel.endsWith('.tsx'));
  const hardcodedSecretLeaks = [];
  for (const rel of publicFiles) {
    const source = readIfExists(root, rel);
    if (/CLOUDINARY_API_SECRET\s*[:=]\s*['\"][^'\"]+['\"]/.test(source)) hardcodedSecretLeaks.push(rel);
  }
  tests.push(result('PII-NO-CLOUDINARY-SECRET', hardcodedSecretLeaks.length === 0, 'Property API source contains no hard-coded Cloudinary API secret', hardcodedSecretLeaks));

  return { name: 'sensitive-projection', results: tests, summary: summary(tests) };
}
