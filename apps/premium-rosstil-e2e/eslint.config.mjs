import playwright from 'eslint-plugin-playwright'
import baseConfig from '../../eslint.config.mjs'

export default [
  {
    ignores: ['out-tsc/**', 'test-output/**'],
  },
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      // Эти правила слишком строгие для E2E тестов
      'playwright/no-conditional-in-test': 'off', // Условия нужны для разных браузеров/платформ
      'playwright/no-conditional-expect': 'off', // Иногда expect зависит от условия
      'playwright/no-wait-for-timeout': 'off', // Иногда нужно ждать анимации
      'playwright/no-wait-for-selector': 'off', // waitForSelector - валидный паттерн
      'playwright/no-force-option': 'off', // Иногда элементы частично скрыты
      'playwright/expect-expect': 'off', // Не все тесты требуют явных assertions
      'playwright/no-skipped-test': 'off', // Пропуск тестов - нормальная практика
      '@typescript-eslint/no-non-null-assertion': 'off', // В тестах ! допустим после expect проверок
    },
  },
]
