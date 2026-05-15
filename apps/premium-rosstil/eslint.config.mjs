import nextEslintPluginNext from '@next/eslint-plugin-next'
import nx from '@nx/eslint-plugin'
import playwright from 'eslint-plugin-playwright'
import baseConfig from '../../eslint.config.mjs'

export default [
  {
    ignores: [
      '.next/**',
      '**/out-tsc/**',
      'src/generated/**',
      'pla',
      'public/**',
      'prisma/**',
      'src/test-setup.tsx',
      'playwright-report/**/*',
    ],
  },
  ...nx.configs['flat/react-typescript'],
  { plugins: { '@next/next': nextEslintPluginNext } },
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx', '**/e2e/**'],
    rules: {
      // Next.js specific
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'off',
      // Project-specific overrides
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-useless-escape': 'off',
      // Disable rules not found in current eslint-plugin-react-hooks version
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Playwright e2e tests only
    files: ['**/e2e/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Подавляем предупреждения для E2E тестов
      'playwright/no-wait-for-timeout': 'off',
      'playwright/no-wait-for-selector': 'off',
      'playwright/no-conditional-expect': 'off',
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-skipped-test': 'off',
      'playwright/no-force-option': 'off',
      'playwright/expect-expect': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // Jest unit tests - disable playwright rules
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'playwright/no-standalone-expect': 'off',
    },
  },
]
