import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'website'],
    pool: 'threads', // Required for coverage to work with mocks
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'tests/',
        'website/',
        'examples/',
        '*.config.*',
        'dist/',
        'coverage/',
        'src/cli/**', // CLI runs on import, difficult to test
        'src/types.ts', // Type definitions only
        '**/*.d.ts',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
