import { resolve } from 'node:path'

import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'

// Ключница (auth-hub) локально слушает PORT из apps/auth-hub/.env (nx dev читает его же) —
// НЕ путать с портом 3010 из docker-compose.production.yml healthcheck (внутренний bind контейнера,
// не проброшен наружу в rollout-профиле).
const baseURL = process.env['BASE_URL'] || 'http://localhost:3014'
// Публичный UX-прогон не создаёт сессию администратора и не требует БД.
const publicOnly = process.env['AUTH_HUB_PUBLIC_ONLY'] === '1'

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),

  globalSetup: publicOnly ? undefined : resolve(__dirname, './src/global-setup.ts'),
  ...(publicOnly && { testMatch: '01-public.spec.ts' }),

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
    command: 'bun nx dev auth-hub',
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
