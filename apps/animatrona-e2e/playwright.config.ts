import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig } from '@playwright/test'

/**
 * Конфигурация Playwright для E2E тестов Electron-приложения Animatrona.
 *
 * Два режима тестирования:
 * 1. dev-chromium: UI тесты через HTTP (быстрые, для разработки)
 * 2. electron: полные E2E тесты с IPC, native dialogs (перед релизом)
 *
 * Особенности:
 * - Увеличенные таймауты для FFmpeg операций
 * - Один воркер для избежания race conditions
 * - Запись видео при первом retry для отладки
 */

const DEV_SERVER_PORT = 3007
const baseURL = process.env['BASE_URL'] || `http://localhost:${DEV_SERVER_PORT}`

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),

  // Увеличенные таймауты для Electron + FFmpeg операций
  timeout: 120000,
  expect: {
    timeout: 15000,
  },

  // Ретраи в CI (Electron тесты могут быть flaky)
  retries: process.env.CI ? 3 : 1,

  // Один воркер для Electron (избегаем race conditions с БД)
  workers: 1,

  // Общие настройки
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: { mode: 'on-first-retry', size: { width: 1280, height: 800 } },
    viewport: { width: 1280, height: 800 },
  },

  // Репортеры
  reporter: [['html', { open: 'never' }], ['list'], ['json', { outputFile: 'test-results/results.json' }]],

  projects: [
    // Dev режим: UI тесты через HTTP (быстрые)
    {
      name: 'dev-chromium',
      testMatch: /\.dev\.spec\.ts$/,
      use: {
        browserName: 'chromium',
      },
    },

    // Electron режим: полные E2E тесты с IPC, dialogs
    {
      name: 'electron',
      testMatch: /\.electron\.spec\.ts$/,
      // Electron тесты не используют webServer — запускают приложение напрямую
    },

    // Smoke тесты (все из папки 01-smoke)
    {
      name: 'smoke',
      testMatch: /01-smoke\/.*/,
    },
  ],

  // Dev сервер для UI тестов (dev-chromium project)
  // Запускаем ТОЛЬКО Next.js renderer, не Electron.
  // Пропускаем через SKIP_DEV_WEBSERVER=1 при прогоне только electron/smoke проектов —
  // Playwright стартует webServer для ЛЮБОГО набора проектов независимо от --project
  // фильтра, а dev-сервер сейчас падает на несвязанном баге (shaka-player SSR).
  ...(process.env['SKIP_DEV_WEBSERVER']
    ? {}
    : {
      webServer: {
        command: 'cd apps/animatrona/renderer && next dev -p 3007 --webpack',
        url: baseURL,
        reuseExistingServer: true,
        cwd: workspaceRoot,
        timeout: 180000,
      },
    }),
})
