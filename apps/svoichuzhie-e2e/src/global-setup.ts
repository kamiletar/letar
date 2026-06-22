/**
 * Глобальный setup для E2E тестов svoichuzhie
 *
 * Выполняется один раз перед всеми тестами:
 * 1. Создаёт тестовых пользователей в БД
 * 2. Логинит admin и сохраняет storage state
 */
import { chromium, type FullConfig } from '@playwright/test'
import { mkdirSync } from 'fs'
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
const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3021'

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
  console.log('\n[E2E Setup] Создание тестовых пользователей...')

  // 1. Создаём пользователей в БД
  const adminId = await createTestUser({ ...testAdmin, role: 'ADMIN' })
  const fanId = await createTestUser({ ...testFan, role: 'USER' })
  await ensureFanMember(fanId)
  await disconnectDb()

  console.log(`  Admin ID: ${adminId}`)
  console.log(`  Fan ID:   ${fanId}`)

  // 2. Логиним admin и сохраняем storage state
  console.log('\n[E2E Setup] Авторизация admin...')
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await loginAndSave(page, testAdmin.email, testAdmin.password, ADMIN_PATHS)
  } finally {
    await browser.close()
  }

  console.log('\n[E2E Setup] Готово ✓\n')
}
