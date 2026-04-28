// Flat config (ESLint v9). Keep rules tight enough to enforce CLAUDE.md §5,
// loose enough that CI doesn't bikeshed style.
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/infra/db/migrations/**', 'tests/setup.ts'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType:  'module',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      // CLAUDE.md §5 — hard rules. New code must comply; pre-Week-6 violations
      // are warnings until cleaned up so lint passes in CI without rewrites.
      '@typescript-eslint/no-explicit-any':           'error',
      '@typescript-eslint/no-non-null-assertion':     'warn',
      '@typescript-eslint/no-unused-vars':            ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // General correctness
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'eqeqeq':     ['error', 'always'],

      // We use Result/throw deliberately — don't enforce JS-style throws
      '@typescript-eslint/no-throw-literal': 'off',
    },
  },
]
