import { loadEnvConfig } from '@next/env'
import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'

import { ADMIN_STORAGE_STATE, USER_STORAGE_STATE } from './src/fixtures/storage-state'

// Загружаем переменные окружения через @next/env из директории premium-rosstil
// Это загружает .env, .env.local, .env.development и т.д.
loadEnvConfig(path.join(workspaceRoot, 'apps/premium-rosstil'))

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:3000'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  globalSetup: path.resolve(__dirname, './src/global-setup.ts'),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'on-first-retry',
    /* Таймаут навигации — Next.js динамическая компиляция при cold start */
    navigationTimeout: 60000,
    /* Таймаут действий — формы с debounce и async validation */
    actionTimeout: 15000,
  },
  /* Таймаут теста — React SSR + гидрация на cold start */
  timeout: 60000,
  /* Глобальный таймаут — предотвращает зависание CI */
  globalTimeout: process.env.CI ? 30 * 60 * 1000 : undefined,
  /* Timeout for expect assertions — Chakra UI анимации + async renders */
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      // Допуск 1% различий в пикселях (для антиалиасинга и шрифтов)
      maxDiffPixelRatio: 0.01,
    },
  },
  /* Retry on failure */
  retries: process.env.CI ? 2 : 0,
  /* Количество воркеров - ограничиваем чтобы не перегрузить dev сервер */
  workers: 3,
  /* Reporter */
  reporter: [['html', { open: 'never' }], ['list']],
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bun nx run premium-rosstil:dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    // === Тесты без авторизации (guest) ===
    {
      name: 'guest-chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--memory-pressure-off'],
        },
      },
      testMatch: /\.guest\.spec\.ts$/,
    },

    // === Тесты с авторизацией администратора ===
    {
      name: 'admin-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_STORAGE_STATE,
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--memory-pressure-off'],
        },
      },
      testMatch: /\.admin\.spec\.ts$/,
    },

    // === Тесты с авторизацией пользователя ===
    {
      name: 'user-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: USER_STORAGE_STATE,
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--memory-pressure-off'],
        },
      },
      testMatch: /\.user\.spec\.ts$/,
    },

    // === Тесты уведомлений (требуют отдельной логики) ===
    {
      name: 'notifications-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /04-notifications\/.*/,
    },

    // === Статические страницы (не требуют авторизации) ===
    {
      name: 'static-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /05-static\/.*/,
    },

    // === Интеграционные тесты (могут требовать разные роли) ===
    {
      name: 'integration-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: USER_STORAGE_STATE,
      },
      testMatch: /07-integration\/.*/,
    },

    // === Мобильные тесты ===
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
      testMatch: /08-mobile\/.*/,
    },

    // === Visual Regression тесты (скриншоты ключевых страниц) ===
    {
      name: 'visual-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /09-visual\/.*/,
    },
    // Другие браузеры (раскомментировать при необходимости)
    // {
    //   name: 'admin-firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     storageState: ADMIN_STORAGE_STATE,
    //   },
    //   testMatch: /\.admin\.spec\.ts$/,
    //   dependencies: [],
    // },
    // {
    //   name: 'admin-webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //     storageState: ADMIN_STORAGE_STATE,
    //   },
    //   testMatch: /\.admin\.spec\.ts$/,
    //   dependencies: [],
    // },
  ],
})
