import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'path'

// IMOT запускается на порту 3001
const baseURL = process.env['BASE_URL'] || 'http://localhost:3001'

// Пути к storage state (абсолютные для корректной работы при CWD != e2e dir)
const CLIENT_STORAGE_STATE = resolve(__dirname, 'playwright/.auth/client.json')
const SPECIALIST_STORAGE_STATE = resolve(__dirname, 'playwright/.auth/specialist.json')
const ADMIN_STORAGE_STATE = resolve(__dirname, 'playwright/.auth/admin.json')

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),

  // Глобальный setup: создание тестовых пользователей + авторизация
  globalSetup: resolve(__dirname, './src/global-setup.ts'),

  // Таймауты
  globalTimeout: 600_000, // 10 минут
  timeout: 60_000,
  expect: { timeout: 15_000 },

  // Параллелизм
  workers: 2,
  retries: process.env.CI ? 1 : 0,

  use: {
    baseURL,
    trace: 'on-first-retry',
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    launchOptions: {
      args: ['--disable-dev-shm-usage'],
    },
  },

  webServer: {
    command: 'bun nx run imot:dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },

  projects: [
    // Тесты без авторизации (landing, auth flows)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /\.(client|specialist|admin)\.spec\.ts$/,
    },
    // Тесты роли CLIENT
    {
      name: 'client-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: CLIENT_STORAGE_STATE,
      },
      testMatch: /\.client\.spec\.ts$/,
    },
    // Тесты роли SPECIALIST
    {
      name: 'specialist-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: SPECIALIST_STORAGE_STATE,
      },
      testMatch: /\.specialist\.spec\.ts$/,
    },
    // Тесты роли ADMIN
    {
      name: 'admin-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_STORAGE_STATE,
      },
      testMatch: /\.admin\.spec\.ts$/,
    },
  ],
})
