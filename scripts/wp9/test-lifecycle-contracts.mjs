import { readIfExists, result, summary } from './lib/common.mjs';

export function testLifecycleContracts(root) {
  const source = readIfExists(root, 'lib/property/propertyLifecycle.ts');
  const propertyModel = readIfExists(root, 'models/Property.ts');
  const tests = [];
  const statuses = ['draft', 'pending', 'under_review', 'verified', 'rejected', 'flagged'];

  for (const status of statuses) {
    tests.push(result(`LIFE-STATUS-${status}`, source.includes(status), `Lifecycle knows status: ${status}`, 'lib/property/propertyLifecycle.ts'));
  }

  tests.push(result('LIFE-MATERIAL-EDIT', /material/i.test(source) && /verified/i.test(source) && /draft/i.test(source), 'Verified material edits are represented in the central lifecycle contract', 'lib/property/propertyLifecycle.ts'));
  tests.push(result('LIFE-OWNER-LOCK', /under_review/i.test(source) && /flagged/i.test(source), 'Owner-edit lock states are represented centrally', 'lib/property/propertyLifecycle.ts'));
  tests.push(result('LIFE-SUBMIT', /submit/i.test(source) && /pending/i.test(source), 'Submit transition is represented centrally', 'lib/property/propertyLifecycle.ts'));
  tests.push(result('LIFE-LEGACY-DERIVED', /verification/i.test(propertyModel) && /status/i.test(propertyModel), 'Property model contains canonical verification state plus legacy compatibility state', 'models/Property.ts'));
  tests.push(result('LIFE-FLAG-CONSISTENCY', /isFlagged/.test(propertyModel) && /flagged/.test(propertyModel), 'Property model exposes both flag compatibility signal and canonical flagged status for synchronization checks', 'models/Property.ts'));

  return { name: 'lifecycle-contracts', results: tests, summary: summary(tests) };
}
