import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig } from '@playwright/test'

/**
 * Конфигурация Playwright для E2E тестов Animatrona Player (animatrona-folder-player).
 *
 * В отличие от `animatrona-e2e` — только один режим: полные Electron-тесты с IPC и native
 * dialogs. У приложения нет фиксированного dev-порта (standalone-плеер без сервера/БД), поэтому
 * `dev-chromium`/`webServer` не заводим — только `electron` и `smoke`.
 */

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),

  timeout: 120000,
  expect: {
    timeout: 15000,
  },

  retries: process.env.CI ? 3 : 1,

  // Один воркер — Electron-тесты используют изолированный --user-data-dir на процесс,
  // но параллельный запуск нескольких упакованных Electron-инстансов на одной машине флакует.
  workers: 1,

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: { mode: 'on-first-retry', size: { width: 1280, height: 800 } },
    viewport: { width: 1280, height: 800 },
  },

  reporter: [['html', { open: 'never' }], ['list'], ['json', { outputFile: 'test-results/results.json' }]],

  projects: [
    {
      name: 'electron',
      testMatch: /\.electron\.spec\.ts$/,
    },
    {
      name: 'smoke',
      testMatch: /01-smoke\/.*/,
    },
  ],
})
