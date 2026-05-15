/**
 * Глобальный setup для E2E тестов IMOT
 *
 * Выполняется один раз перед всеми тестами:
 * 1. Создаёт тестовых пользователей напрямую в БД
 * 2. Логинит пользователей через API и сохраняет storage state
 *
 * Если storage state уже существует и не истёк — переиспользует его (для rate limit)
 */
import { chromium, type FullConfig } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { testAdmin, testClient, testSpecialist } from './fixtures/test-data'
import { createTestUser, disconnectDb } from './helpers/db.helpers'

// Пути к storage state
const E2E_ROOT = resolve(__dirname, '..')

/**
 * Возвращает массив путей для записи storageState:
 * - configDir (для проектов с storageState в config)
 * - CWD (для test.use({ storageState: 'playwright/.auth/...' }))
 */
function storagePaths(filename: string): string[] {
  const configDirPath = resolve(E2E_ROOT, `playwright/.auth/${filename}`)
  const cwdPath = resolve(process.cwd(), `playwright/.auth/${filename}`)
  if (configDirPath === cwdPath) return [configDirPath]
  return [configDirPath, cwdPath]
}

const CLIENT_PATHS = storagePaths('client.json')
const SPECIALIST_PATHS = storagePaths('specialist.json')
const ADMIN_PATHS = storagePaths('admin.json')

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3001'

// Максимальный возраст storage state (минуты) — если файл свежее, пропускаем логин
const MAX_AGE_MINUTES = 10

/**
 * Проверяет, существует ли свежий storage state
 * Если файл существует и моложе MAX_AGE_MINUTES — пропускаем логин
 */
function isStorageStateFresh(paths: string[]): boolean {
  const primaryPath = paths[0]
  if (!primaryPath || !existsSync(primaryPath)) return false

  try {
    const stat = statSync(primaryPath)
    const ageMs = Date.now() - stat.mtimeMs
    const ageMinutes = ageMs / 1000 / 60

    if (ageMinutes > MAX_AGE_MINUTES) return false

    // Проверяем что файл содержит cookies
    const state = JSON.parse(readFileSync(primaryPath, 'utf8'))
    const hasSessionCookie = state.cookies?.some((c: { name: string }) => c.name === 'better-auth.session_token')
    return !!hasSessionCookie
  } catch {
    return false
  }
}

/**
 * Логин пользователя через Better Auth API и сохранение storage state
 *
 * UI-логин через signIn.email падает в headless Playwright (Better Auth client SDK проблема).
 * Обходим: вызываем /api/auth/sign-in/email напрямую через page.evaluate.
 * Это устанавливает cookies в browser context.
 */
async function loginAndSaveState(email: string, password: string, paths: string[], label: string) {
  // Пропускаем если storage state свежий (избегаем rate limit)
  if (isStorageStateFresh(paths)) {
    console.log(`  ⏭ ${label} — storage state свежий, пропускаем логин`)
    return
  }

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Открываем страницу для установки контекста (origin = localhost:3001)
    await page.goto(`${BASE_URL}/`, { timeout: 45_000, waitUntil: 'domcontentloaded' })

    // Логин через Better Auth API напрямую
    const loginResult = await page.evaluate(
      async ({ email, password }) => {
        const res = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        })
        const body = await res.text()
        return { status: res.status, ok: res.ok, body }
      },
      { email, password }
    )

    if (!loginResult.ok) {
      throw new Error(`API login failed: status ${loginResult.status}, body: ${loginResult.body}`)
    }

    // Переходим на любую страницу чтобы убедиться что cookies работают
    await page.goto(`${BASE_URL}/`, { timeout: 45_000, waitUntil: 'domcontentloaded' })

    // Сохраняем storage state во все целевые пути
    for (const sp of paths) {
      const dir = resolve(sp, '..')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      await context.storageState({ path: sp })

      // Продлеваем HTTP expiry session_data cookie
      // Better Auth устанавливает короткий TTL, cookie может истечь к запуску тестов
      const state = JSON.parse(readFileSync(sp, 'utf8'))
      const sessionTokenCookie = state.cookies.find((c: { name: string }) => c.name === 'better-auth.session_token')
      const sessionDataCookie = state.cookies.find((c: { name: string }) => c.name === 'better-auth.session_data')
      if (sessionDataCookie && sessionTokenCookie) {
        sessionDataCookie.expires = sessionTokenCookie.expires
        writeFileSync(sp, JSON.stringify(state))
      }
    }
    console.log(`  ✓ ${label} logged in (${paths.length} paths)`)
  } catch (error) {
    console.error(`  ✗ ${label} login failed:`, error)
    throw error
  } finally {
    await browser.close()
  }
}

export default async function globalSetup(_config: FullConfig) {
  console.log('🔧 [globalSetup] Создание тестовых пользователей IMOT...')

  try {
    // === Шаг 1: Создаём пользователей в БД ===
    await Promise.all([
      createTestUser({
        email: testClient.email,
        password: testClient.password,
        name: testClient.name,
        role: 'CLIENT',
      }),
      createTestUser({
        email: testSpecialist.email,
        password: testSpecialist.password,
        name: testSpecialist.name,
        role: 'SPECIALIST',
      }),
      createTestUser({
        email: testAdmin.email,
        password: testAdmin.password,
        name: testAdmin.name,
        role: 'ADMIN',
      }),
    ])

    await disconnectDb()
    console.log('✓ Тестовые пользователи созданы')

    // === Шаг 2: Логиним каждого и сохраняем storage state ===
    console.log('🔐 [globalSetup] Авторизация тестовых пользователей...')

    // Логиним последовательно для стабильности
    await loginAndSaveState(testClient.email, testClient.password, CLIENT_PATHS, 'CLIENT')
    await loginAndSaveState(testSpecialist.email, testSpecialist.password, SPECIALIST_PATHS, 'SPECIALIST')
    await loginAndSaveState(testAdmin.email, testAdmin.password, ADMIN_PATHS, 'ADMIN')

    console.log('✓ Все пользователи авторизованы')
  } catch (error) {
    console.error('✗ Global setup failed:', error)
    throw error
  }
}
