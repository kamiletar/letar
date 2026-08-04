import { loadEnvConfig } from '@next/env'
import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'

// Загружаем переменные окружения через @next/env из директории mandala
loadEnvConfig(path.join(workspaceRoot, 'apps/mandala'))

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:3004'

/**
 * Прогон идёт против локального `next dev`, а не собранного образа.
 *
 * Разница принципиальная: dev-сервер компилирует каждый маршрут и каждый route handler
 * по первому запросу. Холодный заход на страницу, Server Action с `redirect()` и особенно
 * `/api/upload` (тянет sharp) стабильно уходят за 10–20 секунд — это компиляция, а не
 * приложение. Замеры на этой машине: один и тот же прогон дважды подряд ронял РАЗНЫЕ тесты
 * (07:24 и 08:26 против 07:67, 08:77 и 09:81), а каждый из них поодиночке проходил.
 *
 * Поэтому дефолтные таймауты, подобранные под staging, локально умножаются. Ассерты при
 * этом не ослабляются — меняется только запас времени на компиляцию.
 */
const isLocalDevServer = !process.env['BASE_URL']

// Пути к файлам состояния авторизации
const ADMIN_STORAGE_STATE = 'playwright/.auth/admin.json'

/**
 * Конфигурация Playwright для E2E тестов mandala
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),

  // Общие настройки
  use: {
    baseURL,
    // Локаль браузера — русский (определяет Accept-Language header)
    locale: 'ru-RU',
    // Трассировка при повторных запусках
    trace: 'on-first-retry',
    // Скриншоты при ошибках
    screenshot: 'only-on-failure',
    // Видео при повторных запусках
    video: 'on-first-retry',
  },

  // Таймаут для каждого теста (локально — с запасом на компиляцию dev-сервера)
  timeout: isLocalDevServer ? 90000 : 30000,

  // Таймаут для expect assertions
  expect: {
    timeout: isLocalDevServer ? 15000 : 5000,
  },

  // Повторы при ошибках
  retries: process.env.CI ? 2 : 0,

  // Количество воркеров — 1: staging бьётся в единственный контейнер
  // mandala-staging-app (Next.js, single instance), несколько параллельных
  // воркеров создают гонку за Server Actions одного процесса — таймауты
  // навигации после redirect'а плавают от прогона к прогону на разных тестах
  workers: 1,

  // Репортеры
  reporter: [['html', { open: 'never' }], ['list']],

  // Запуск dev сервера перед тестами
  webServer: {
    command: 'bun nx run mandala:dev',
    url: baseURL,
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },

  projects: [
    // === Setup проект для seed данных и авторизации ===
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // === Тесты без авторизации (guest) ===
    {
      name: 'guest-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /\.guest\.spec\.ts$/,
    },

    // === Тесты с авторизацией администратора ===
    {
      name: 'admin-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_STORAGE_STATE,
      },
      testMatch: /\.admin\.spec\.ts$/,
      dependencies: ['setup'],
    },

    // === Тесты мобильного интерфейса ===
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
      testMatch: /\.mobile\.spec\.ts$/,
    },
    // Другие браузеры (раскомментировать при необходимости)
    // {
    //   name: 'guest-firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   testMatch: /\.guest\.spec\.ts$/,
    // },
    // {
    //   name: 'guest-webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   testMatch: /\.guest\.spec\.ts$/,
    // },
  ],
})
