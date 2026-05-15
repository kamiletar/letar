import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig } from '@playwright/test'

/**
 * Конфигурация Playwright для E2E тестов Electron-приложения Label Printer Desktop.
 *
 * Особенности:
 * - Тестируем Next.js renderer через HTTP (не Electron напрямую)
 * - Приложение запускается в режиме dev на порту 8888
 * - Используем Chromium для эмуляции Electron WebView
 */

const baseURL = process.env['BASE_URL'] || 'http://localhost:8888'

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  // Таймаут для каждого теста
  timeout: 60000,
  // Таймаут для assertions
  expect: {
    timeout: 10000,
  },
  // Повторы при неудаче
  retries: process.env.CI ? 2 : 0,
  // Количество воркеров
  workers: 1,
  // Репортеры
  reporter: [['html', { open: 'never' }], ['list']],
  // Общие настройки
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // Эмулируем viewport как у desktop app
    viewport: { width: 1280, height: 800 },
  },
  // Запуск dev-сервера Electron перед тестами
  webServer: {
    command: 'bun nx run label-printer-desktop:dev',
    url: baseURL,
    reuseExistingServer: true,
    cwd: workspaceRoot,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
})
