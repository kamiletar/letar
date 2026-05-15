import playwright from 'eslint-plugin-playwright'
import baseConfig from '../../eslint.config.mjs'

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      // E2E паттерны — документированы в E2E_PLAN.md v2.8
      // test.skip используется для conditional skips (MailHog, storage state, 404 pages)
      'playwright/no-skipped-test': 'off',
      // waitForTimeout документирован — UI анимации, Chakra state updates, debounce
      'playwright/no-wait-for-timeout': 'off',
      // conditionals нужны для graceful degradation (нет данных → skip)
      'playwright/no-conditional-in-test': 'off',
      // conditional expects с skip-логированием (console.log('⏭️ Skip: ...'))
      'playwright/no-conditional-expect': 'off',
      // force: true документирован — Chakra Radio/Button в step-анимации
      'playwright/no-force-option': 'off',
      // expect-expect: некоторые тесты проверяют graceful flows без assertions
      'playwright/expect-expect': 'off',
      // non-null assertions безопасны в тестах (проверены на предыдущих шагах)
      '@typescript-eslint/no-non-null-assertion': 'off',
      // console.log используется для skip-логирования
      'no-console': 'off',
      // waitForSelector используется в helpers и fixtures (legacy паттерн)
      'playwright/no-wait-for-selector': 'off',
      // networkidle в helpers для page ready checks
      'playwright/no-networkidle': 'off',
      // prefer-web-first-assertions: inputValue(), getAttribute() в legacy тестах
      'playwright/prefer-web-first-assertions': 'off',
      // missing-playwright-await: .catch(() => false) возвращает boolean, не Promise
      'playwright/missing-playwright-await': 'off',
      // curly: single-line if допустим в тестах
      curly: 'off',
      // unused vars в fixtures — config может быть зарезервирован
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_|config' }],
      // consistent-type-imports в setup файлах
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
]
