/**
 * Global test setup — database safety guard.
 *
 * Every test in this suite mocks `@/lib/dbConnect`, models, rate limiting and
 * Redis, so no real I/O should ever occur. This guard is defence-in-depth: if a
 * future test forgets to mock, the process refuses to run against anything that
 * looks like a production database.
 */

const uri = process.env.MONGODB_URI;

if (process.env.NODE_ENV === 'production') {
  throw new Error('[test-setup] Refusing to run the test suite with NODE_ENV=production.');
}

if (uri && /^mongodb(\+srv)?:\/\//i.test(uri)) {
  const looksLikeTestDb = /(localhost|127\.0\.0\.1|_test\b|\btest_|-test)/i.test(uri);
  if (!looksLikeTestDb) {
    throw new Error(
      '[test-setup] Refusing to run tests: MONGODB_URI does not look like a test database. ' +
        'Tests must use mocks, never a real cluster.',
    );
  }
}
