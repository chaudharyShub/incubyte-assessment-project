import { configDefaults, defineConfig } from 'vitest/config';

// The default run: unit and API tests only. They use in-memory fakes, so they
// need no database and finish in seconds.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
  },
});
