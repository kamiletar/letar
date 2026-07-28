/**
 * Глобальный setup для E2E тестов svoichuzhie
 *
 * Локально/CI: создаёт тестовых пользователей напрямую в БД (см. helpers/db.helpers.ts).
 * На staging: staging-раннер не имеет доступа к DATABASE_URL приложения (другая БД/сеть) —
 * вместо прямой записи используется dev-session endpoint через @letar/e2e-testing (тот же
 * паттерн, что и в driving-school-e2e). Триггер — DEV_SESSION_TOKEN в окружении: staging-раннер
 * прокидывает его явно, локальный прогон — нет.
 */
import { devSessionLogin, requireDevSessionToken, storagePaths } from '@letar/e2e-testing'
import { chromium, type FullConfig } from '@playwright/test'
import { mkdirSync } from 'fs'
import { resolve } from 'path'
import { testAdmin, testFan } from './fixtures/test-data'
import { createTestUser, disconnectDb, ensureFanMember } from './helpers/db.helpers'

const E2E_ROOT = resolve(__dirname, '..')

const ADMIN_PATHS = storagePaths(E2E_ROOT, 'admin.json')
const FAN_PATHS = storagePaths(E2E_ROOT, 'fan.json')
const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3021'

async function stagingGlobalSetup(): Promise<void> {
  const token = requireDevSessionToken()

  console.log('\n[E2E Setup:staging] Авторизация через dev-session...')
  await devSessionLogin({ baseURL: BASE_URL, email: testAdmin.email, redirect: '/admin', token, paths: ADMIN_PATHS })
  // postLoginPath — приложение само создаёт FanMember по сохранённому в dev-session
  // consentPersonal: true (см. app/fanclub/page.tsx), отдельного шага в БД не нужно.
  // password — 10-auth.spec.ts проверяет РЕАЛЬНЫЙ вход по email+паролю (не dev-session cookie),
  // без него dev-session заводит User без единой записи Account, и /sign-in/email для testFan
  // всегда падает ("Credential account not found", PLAN.md §18.7 batch2).
  await devSessionLogin({
    baseURL: BASE_URL,
    email: testFan.email,
    redirect: '/fanclub',
    token,
    paths: FAN_PATHS,
    postLoginPath: '/fanclub?verified=true',
    password: testFan.password,
  })
  console.log('[E2E Setup:staging] Готово ✓\n')
}

async function localGlobalSetup(): Promise<void> {
  console.log('\n[E2E Setup] Создание тестовых пользователей...')

  // 1. Создаём пользователей в БД
  const adminId = await createTestUser({ ...testAdmin, role: 'ADMIN' })
  const fanId = await createTestUser({ ...testFan, role: 'USER' })
  await ensureFanMember(fanId)
  await disconnectDb()

  console.log(`  Admin ID: ${adminId}`)
  console.log(`  Fan ID:   ${fanId}`)

  // 2. Логиним admin и fan, сохраняем storage states
  console.log('\n[E2E Setup] Авторизация пользователей...')
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await loginAndSave(page, testAdmin.email, testAdmin.password, ADMIN_PATHS)
    // Очищаем cookies перед следующим входом
    await context.clearCookies()
    await loginAndSave(page, testFan.email, testFan.password, FAN_PATHS)
  } finally {
    await browser.close()
  }

  console.log('\n[E2E Setup] Готово ✓\n')
}

async function loginAndSave(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
  email: string,
  password: string,
  paths: string[]
): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { timeout: 45_000 })
  await page.waitForSelector('input[type="email"]', { timeout: 25_000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(fanclub|admin)/, { timeout: 45_000 })

  const state = await page.context().storageState()
  for (const p of paths) {
    mkdirSync(resolve(p, '..'), { recursive: true })
    require('fs').writeFileSync(p, JSON.stringify(state, null, 2))
  }
  console.log(`  ✓ Storage state saved: ${paths[0]}`)
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  if (process.env.DEV_SESSION_TOKEN) {
    return stagingGlobalSetup()
  }
  return localGlobalSetup()
}
