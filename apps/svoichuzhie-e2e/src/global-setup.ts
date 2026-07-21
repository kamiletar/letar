/**
 * Глобальный setup для E2E тестов svoichuzhie
 *
 * Локально/CI: создаёт тестовых пользователей напрямую в БД (см. helpers/db.helpers.ts).
 * На staging: staging-раннер не имеет доступа к DATABASE_URL приложения (другая БД/сеть) —
 * вместо прямой записи используется dev-session endpoint (см. .claude/docs/e2e-testing.md
 * § «E2E-логин без OIDC на staging», тот же паттерн, что и в driving-school-e2e). Триггер —
 * DEV_SESSION_TOKEN в окружении: staging-раннер прокидывает его явно, локальный прогон — нет.
 */
import { chromium, type FullConfig } from '@playwright/test'
import { existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { testAdmin, testFan } from './fixtures/test-data'
import { createTestUser, disconnectDb, ensureFanMember } from './helpers/db.helpers'

const E2E_ROOT = resolve(__dirname, '..')

function storagePaths(filename: string): string[] {
  const configDirPath = resolve(E2E_ROOT, `playwright/.auth/${filename}`)
  const cwdPath = resolve(process.cwd(), `playwright/.auth/${filename}`)
  if (configDirPath === cwdPath) return [configDirPath]
  return [configDirPath, cwdPath]
}

const ADMIN_PATHS = storagePaths('admin.json')
const FAN_PATHS = storagePaths('fan.json')
const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3021'
const SESSION_COOKIE_SUFFIX = 'better-auth.session_token'

/**
 * Логин через dev-session (без записи в БД) + сохранение storage state.
 * `ensureFan: true` — дополнительно заходит на `/fanclub?verified=true`, чтобы приложение само
 * создало FanMember по сохранённому в dev-session `consentPersonal: true` (см. app/fanclub/page.tsx).
 */
async function devSessionLogin(email: string, redirect: string, paths: string[], ensureFan = false): Promise<void> {
  const token = process.env.DEV_SESSION_TOKEN
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const params = new URLSearchParams({ email, redirect, token: token! })
    await page.goto(`${BASE_URL}/api/auth/dev-session?${params.toString()}`)

    const cookies = await context.cookies()
    const sessionCookie = cookies.find((c) => c.name.endsWith(SESSION_COOKIE_SUFFIX))
    if (!sessionCookie) {
      throw new Error(
        `[globalSetup:staging] dev-session не установил cookie '*${SESSION_COOKIE_SUFFIX}' для ${email} — `
          + 'вероятно 403 (ALLOW_DEV_SESSION/DEV_SESSION_TOKEN не совпадают на сервере)',
      )
    }

    if (ensureFan) {
      await page.goto(`${BASE_URL}/fanclub?verified=true`)
    }

    for (const p of paths) {
      mkdirSync(resolve(p, '..'), { recursive: true })
      await context.storageState({ path: p })
    }
    console.log(`  ✓ [staging] Storage state saved: ${paths[0]}`)
  } finally {
    await browser.close()
  }
}

async function stagingGlobalSetup(): Promise<void> {
  if (!process.env.DEV_SESSION_TOKEN) {
    throw new Error('[globalSetup:staging] DEV_SESSION_TOKEN не задан — dev-session вернёт 403')
  }
  if (!existsSync(resolve(E2E_ROOT, 'playwright/.auth'))) {
    mkdirSync(resolve(E2E_ROOT, 'playwright/.auth'), { recursive: true })
  }

  console.log('\n[E2E Setup:staging] Авторизация через dev-session...')
  await devSessionLogin(testAdmin.email, '/admin', ADMIN_PATHS)
  await devSessionLogin(testFan.email, '/fanclub', FAN_PATHS, true)
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
  paths: string[],
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
