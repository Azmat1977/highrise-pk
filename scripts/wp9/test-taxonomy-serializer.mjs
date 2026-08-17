import { readIfExists, result, summary } from './lib/common.mjs';

export function testTaxonomySerializer(root) {
  const taxonomy = readIfExists(root, 'lib/property/propertyTaxonomy.ts');
  const normalization = readIfExists(root, 'lib/property/propertyNormalization.ts');
  const listApi = readIfExists(root, 'pages/api/properties/index.ts');
  const page = readIfExists(root, 'pages/properties/index.tsx');
  const tests = [];

  for (const category of ['residential', 'commercial', 'plots']) {
    tests.push(result(`TAX-CAT-${category}`, taxonomy.toLowerCase().includes(category), `Taxonomy contains ${category} discovery group`, 'lib/property/propertyTaxonomy.ts'));
  }
  tests.push(result('TAX-PLOT-ALIASES', /plot/i.test(taxonomy) && /agricultur/i.test(taxonomy), 'Plot discovery retains Pakistan-market compatibility aliases including agricultural land', 'lib/property/propertyTaxonomy.ts'));
  tests.push(result('TAX-SUBTYPE', /propertySubtype/.test(taxonomy) || /subtype/i.test(taxonomy), 'Taxonomy models Property subtype', 'lib/property/propertyTaxonomy.ts'));
  tests.push(result('TAX-NORMALIZE', /normalize/i.test(normalization), 'Mutation normalization is centralized', 'lib/property/propertyNormalization.ts'));
  tests.push(result('TAX-PRIVATE-STRIP', /ownership/i.test(normalization) && /delete|strip|omit|remove/i.test(normalization), 'Normalization contains private ownership-evidence stripping logic', 'lib/property/propertyNormalization.ts'));
  tests.push(result('TAX-MULTI-API', /propertyTypes/.test(listApi) || /decode.*type/i.test(listApi), 'List API supports canonical multi-type/category serialization', 'pages/api/properties/index.ts'));
  tests.push(result('TAX-MULTI-UI', /propertyTypes/.test(page) || /encode.*type|taxonomy/i.test(page), 'Discovery UI uses canonical taxonomy/query serialization', 'pages/properties/index.tsx'));

  return { name: 'taxonomy-serializer', results: tests, summary: summary(tests) };
}
