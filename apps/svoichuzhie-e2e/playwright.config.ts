import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'path'

// svoichuzhie запускается на порту 3021
const baseURL = process.env['BASE_URL'] || 'http://localhost:3021'

const ADMIN_STORAGE_STATE = resolve(__dirname, 'playwright/.auth/admin.json')
const FAN_STORAGE_STATE = resolve(__dirname, 'playwright/.auth/fan.json')

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),

  globalSetup: resolve(__dirname, './src/global-setup.ts'),

  globalTimeout: 900_000, // 15 минут
  timeout: 60_000,
  expect: { timeout: 15_000 },

  workers: 2,
  retries: process.env.CI ? 1 : 0,

  use: {
    baseURL,
    trace: 'on-first-retry',
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    launchOptions: {
      args: ['--disable-dev-shm-usage', '--disable-background-timer-throttling', '--memory-pressure-off'],
    },
  },

  /* Dev-сервер с CDEK_MOCK_MODE=true — детерминированные тесты без сети */
  webServer: {
    command: 'CDEK_MOCK_MODE=true bun nx run svoichuzhie:dev',
    url: 'http://localhost:3021',
    reuseExistingServer: true,
    cwd: workspaceRoot,
    env: { CDEK_MOCK_MODE: 'true' },
  },

  projects: [
    // Анонимные тесты (smoke, theme, subscription, fanclub, merch)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /\.(admin|fan)\.spec\.ts$/,
    },
    // Тесты под авторизованным admin
    {
      name: 'authenticated-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_STORAGE_STATE,
      },
      testMatch: /\.admin\.spec\.ts$/,
    },
    // Тесты под авторизованным фанатом (участник фан-клуба)
    {
      name: 'fan-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: FAN_STORAGE_STATE,
      },
      testMatch: /\.fan\.spec\.ts$/,
    },
  ],
})
