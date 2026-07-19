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
    // Реальный фикс от игнорирования BASE_URL — apps/time-e2e/project.json с explicit
    // executor '@nx/playwright:playwright' (см. файл рядом, как у aboi-e2e/grandslamcup-e2e).
    // Без project.json таргет e2e собирается through inferred createNodes @nx/playwright/plugin,
    // который регексом разбирает command ЛЮБОЙ формы ("nx run x:y" и короткую "nx x y" тоже) и
    // добавляет dependsOn на dev-таск — Nx поднимает его ДО проверки reuseExistingServer/url.
    // Explicit executor в project.json полностью обходит эту инференс-ветку (найдено 2026-07-19
    // по репорту BlackCove, PLAN.md §18.7).
    command: 'bun nx run time:dev',
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
