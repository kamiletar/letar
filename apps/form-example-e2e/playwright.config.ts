import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env['BASE_URL'] || 'http://localhost:3022'

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'bun nx run form-example:dev',
    // baseURL, не хардкод localhost — иначе readiness-проверка стучится в localhost:3022,
    // не видит там ничего (даже когда передан реальный staging/prod BASE_URL) и тихо поднимает
    // локальный dev-сервер вместо прогона против настоящего окружения (найдено BlackCove
    // 2026-08-12 на первом e2e-прогоне staging, PLAN-INFRA.md §18.7 M2).
    url: baseURL,
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
