import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:3013'

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
    // Принудительно русская локаль — иначе Chromium/WebKit шлют Accept-Language: en-US и
    // next-intl (localePrefix: 'as-needed', defaultLocale: 'ru') отдаёт английский контент на
    // "/" вместо ожидаемого русского (тот же паттерн, что и в aboi-e2e).
    locale: 'ru-RU',
  },
  /* Run your local dev server before starting the tests */
  webServer: {
    // Nx-проект называется "time" (см. apps/time/project.json), не "@letar/time" (это имя
    // package.json) — старый вызов падал на s3 с "project not found" при staging-прогоне.
    command: 'bun nx run time:dev',
    // url ДОЛЖЕН совпадать с baseURL — иначе reuseExistingServer не видит уже поднятый
    // staging-контейнер (BASE_URL=https://time-stage.s3...) и пытается поднять локальный dev,
    // который не существует на e2e-раннере (см. PLAN.md §18.7, находка BlackCove).
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
