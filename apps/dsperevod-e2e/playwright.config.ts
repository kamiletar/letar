import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'

// For CI, you may want to set BASE_URL to the deployed application.
// Порт dsperevod — 3019 (apps/dsperevod/.env: PORT=3019).
const baseURL = process.env['BASE_URL'] || 'http://localhost:3019'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Run your local dev server before starting the tests (staging-раннер передаёт BASE_URL —
   * реальный staging-контейнер уже поднят, reuseExistingServer:true пропускает spawn команды).
   * Health-check на голый baseURL, не на подпуть — так у остальных HARD_GATED-приложений
   * (svoichuzhie-e2e, driving-school-e2e), путь `/sign-up` вносил лишний хоп (редирект/TLS),
   * из-за которого проверка reuse иногда не срабатывала на staging. */
  webServer: {
    command: 'bun nx run dsperevod:dev',
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

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
})
