import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'path'

// For CI, you may want to set BASE_URL to the deployed application.
// driving-school runs on port 3003
const baseURL = process.env['BASE_URL'] || 'http://localhost:3003'

// Пути к файлам состояния авторизации (абсолютные для корректной работы при CWD != e2e dir)
const INSTRUCTOR_STORAGE_STATE = resolve(__dirname, 'playwright/.auth/instructor.json')
const STUDENT_STORAGE_STATE = resolve(__dirname, 'playwright/.auth/student.json')
const SCHOOL_ADMIN_STORAGE_STATE = resolve(__dirname, 'playwright/.auth/school-admin.json')
const OWNER_STORAGE_STATE = resolve(__dirname, 'playwright/.auth/owner.json')

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

  // Глобальный setup: создание тестовых пользователей в БД и авторизация
  globalSetup: resolve(__dirname, './src/global-setup.ts'),

  // Таймауты
  // Таймаут для всего сьюта: 30 минут (~1944 тестов × все проекты)
  globalTimeout: 1_800_000,
  // Таймаут для каждого теста — 60s (было ~30s по умолчанию)
  timeout: 60_000,
  // Таймаут для expect — 15s (было ~5s по умолчанию)
  expect: { timeout: 15_000 },

  // Ограничение workers для стабильности (меньше = меньше RAM)
  workers: 2,

  // Ретраи для нестабильных тестов
  retries: process.env.CI ? 1 : 0,

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    // Увеличенные таймауты для navigation и action
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    // Оптимизация памяти: флаги для Chrome
    launchOptions: {
      args: ['--disable-dev-shm-usage', '--disable-background-timer-throttling', '--memory-pressure-off'],
    },
  },
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bun nx run driving-school:dev',
    url: 'http://localhost:3003',
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    // ============================================
    // === SHARDS (для выборочного запуска по модулям) ===
    // ============================================
    // Запуск: nx e2e driving-school-e2e -- --project=shard-core
    // Экономит RAM при отладке отдельных модулей

    // Shard: core (auth, profiles, errors) — файлы 00-03
    {
      name: 'shard-core',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /0[0-3]-.*\.spec\.ts$/,
    },

    // Shard: schedule (schedule, lessons, connections) — файлы 04-07
    {
      name: 'shard-schedule',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /0[4-7]-.*\.spec\.ts$/,
    },

    // Shard: school (school admin functions) — файлы 08, 09, 19, 22, 25, 27, 30
    // Исключаем ролевые тесты (.owner., .instructor., .student., .school-admin.)
    {
      name: 'shard-school',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /(08|09|19|22|25|27|30)-.*\.spec\.ts$/,
      testIgnore: /\.(instructor|student|school-admin|owner)\.spec\.ts$/,
    },

    // Shard: platform (settings, theory, exams, reviews, search, support, chats, owner, legal) — файлы 10-18
    // Исключаем ролевые тесты (.owner., .instructor., .student., .school-admin.)
    {
      name: 'shard-platform',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /1[0-8]-.*\.spec\.ts$/,
      testIgnore: /\.(instructor|student|school-admin|owner)\.spec\.ts$/,
    },

    // Shard: features (lesson types, balance, progress, cars, license, mobile) — файлы 20-26
    {
      name: 'shard-features',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /2[0-6]-.*\.spec\.ts$/,
    },

    // Shard: integrations (calendar sync, connected accounts, VK OAuth, webhooks) — файлы 74-77
    // Исключаем ролевые тесты (.school-admin.)
    {
      name: 'shard-integrations',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /7[4-7]-.*\.spec\.ts$/,
      testIgnore: /\.(instructor|student|school-admin|owner)\.spec\.ts$/,
    },

    // Shard: journeys (real business process flows) — файлы 78-82
    {
      name: 'shard-journeys',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /(78|79|80|81|82)-journey.*\.spec\.ts$/,
    },

    // ============================================
    // === ОСНОВНЫЕ ПРОЕКТЫ (по ролям) ===
    // ============================================

    // === Тесты без авторизации ===
    // Storage state создаётся в globalSetup
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /\.(instructor|student|school-admin|owner)\.spec\.ts$/,
    },

    // === Тесты с авторизацией инструктора ===
    {
      name: 'instructor-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: INSTRUCTOR_STORAGE_STATE,
      },
      testMatch: /\.instructor\.spec\.ts$/,
      // Storage state создаётся в globalSetup — не нужна зависимость от setup
    },

    // === Тесты с авторизацией ученика ===
    {
      name: 'student-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STUDENT_STORAGE_STATE,
      },
      testMatch: /\.student\.spec\.ts$/,
    },

    // === Тесты с авторизацией школьного администратора ===
    {
      name: 'school-admin-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: SCHOOL_ADMIN_STORAGE_STATE,
      },
      testMatch: /\.school-admin\.spec\.ts$/,
    },

    // === Тесты с авторизацией владельца платформы ===
    {
      name: 'owner-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: OWNER_STORAGE_STATE,
      },
      testMatch: /\.owner\.spec\.ts$/,
    },

    // === Мобильные тесты (Phase 7: Mobile UX) ===
    {
      name: 'mobile-portrait',
      use: {
        ...devices['iPhone 13'],
        storageState: STUDENT_STORAGE_STATE,
      },
      testMatch: '**/26-mobile-ux.spec.ts',
    },
    {
      name: 'mobile-landscape',
      use: {
        viewport: { width: 667, height: 375 },
        storageState: STUDENT_STORAGE_STATE,
      },
      testMatch: '**/26-mobile-ux.spec.ts',
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Air'],
        storageState: STUDENT_STORAGE_STATE,
      },
      testMatch: '**/26-mobile-ux.spec.ts',
    },
    // Uncomment for other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
})
