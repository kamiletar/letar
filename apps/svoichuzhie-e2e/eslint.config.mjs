import playwright from 'eslint-plugin-playwright'
import baseConfig from '../../eslint.config.mjs'

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      'playwright/no-skipped-test': 'off',
      'playwright/no-wait-for-timeout': 'off',
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      'playwright/no-force-option': 'off',
      'playwright/expect-expect': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
      'playwright/no-wait-for-selector': 'off',
      'playwright/no-networkidle': 'off',
      'playwright/prefer-web-first-assertions': 'off',
      'playwright/missing-playwright-await': 'off',
      curly: 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_|config' }],
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
]
