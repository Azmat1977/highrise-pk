import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Minimal Vitest configuration for the security regression suite.
 *
 * - Explicit imports only (no global test APIs; no tsconfig changes).
 * - The `@/*` alias mirrors tsconfig `paths` so route modules resolve.
 * - Tests live under `test/` (outside the source-security gate's scan roots).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    clearMocks: true,
  },
});
