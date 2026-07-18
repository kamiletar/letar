import { resolve } from 'node:path'

import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'

// animatrona-tracker локально слушает PORT из apps/animatrona-tracker/.env.local (порт dev-сервера
// 3009, см. PLAN.md «Конфигурация») — НЕ путать с production-портом 3010 (docker-compose.production.yml).
const baseURL = process.env['BASE_URL'] || 'http://localhost:3009'

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),

  globalSetup: resolve(__dirname, './src/global-setup.ts'),

  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 2,

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
  },

  webServer: {
    command: 'bun nx dev animatrona-tracker',
    url: baseURL,
    reuseExistingServer: true,
    cwd: workspaceRoot,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
