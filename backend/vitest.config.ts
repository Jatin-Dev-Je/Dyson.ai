import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals:      true,
    environment:  'node',
    setupFiles:   ['./tests/setup.ts'],
    testTimeout:  10_000,
    // Unit tests: everything under tests/unit/
    // Integration tests: everything under tests/integration/ (may need real DB)
    include:      ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines:      70,
        functions:  70,
        branches:   70,
        statements: 70,
      },
      include: [
        'src/modules/why/**',
        'src/modules/auth/**',
        'src/modules/ingestion/**',
        'src/modules/processing/**',
        'src/modules/graph/**',
        'src/modules/memory/**',
        'src/modules/search/**',
        'src/infra/**',
      ],
      exclude: [
        'src/**/*.types.ts',
        'src/**/*.schema.ts',
        'src/infra/db/migrations/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
