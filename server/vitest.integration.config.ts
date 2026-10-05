import { defineConfig } from 'vitest/config';

// Integration tests run the real SQL against PostgreSQL, in a schema of their
// own. They are slower and need DATABASE_URL, so they are a separate command:
//   npm run test:integration -w server
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    // The files share one schema, so they must not run at the same time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
