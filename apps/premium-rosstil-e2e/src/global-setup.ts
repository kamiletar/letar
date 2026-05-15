/**
 * Глобальный setup для E2E тестов — API-based auth
 *
 * Выполняется один раз перед всеми тестами:
 * 1. Создаёт тестовых пользователей в БД (с Account для Better Auth)
 * 2. Seed тестовых данных (размеры, товары)
 * 3. Сбрасывает rate limit
 * 4. Логинит пользователей через API (fetch → /api/auth/sign-in/email)
 * 5. Сохраняет storageState cookies в dual paths
 *
 * ~100ms на логин вместо ~10-15s через UI
 */
/* eslint-disable no-console */
import type { FullConfig } from '@playwright/test'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'

import { ADMIN_PATHS, USER_PATHS } from './fixtures/storage-state'
import { FEMALE_SIZES, TEST_ADMIN, TEST_PRODUCTS, TEST_USER } from './fixtures/test-data'
import { disconnectDb, ensureTestAdmin, ensureTestUser, resetRateLimit, seedTestData } from './helpers/db.helpers'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000'

/**
 * Парсинг Set-Cookie header в формат Playwright storageState cookie
 */
function parseSetCookieHeader(setCookieHeader: string, baseUrl: string) {
  const url = new URL(baseUrl)
  const parts = setCookieHeader.split(';').map((p) => p.trim())
  const [nameValue, ...attributes] = parts
  const eqIndex = nameValue.indexOf('=')
  const name = nameValue.substring(0, eqIndex)
  const value = nameValue.substring(eqIndex + 1)

  const cookie: Record<string, unknown> = {
    name,
    value,
    domain: url.hostname,
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
    expires: -1,
  }

  for (const attr of attributes) {
    const lower = attr.toLowerCase()
    if (lower === 'httponly') {
      cookie['httpOnly'] = true
    } else if (lower === 'secure') {
      cookie['secure'] = true
    } else if (lower.startsWith('path=')) {
      cookie['path'] = attr.split('=')[1]
    } else if (lower.startsWith('domain=')) {
      cookie['domain'] = attr.split('=')[1]
    } else if (lower.startsWith('max-age=')) {
      const maxAge = parseInt(attr.split('=')[1], 10)
      cookie['expires'] = Math.floor(Date.now() / 1000) + maxAge
    } else if (lower.startsWith('expires=')) {
      cookie['expires'] = Math.floor(new Date(attr.substring('expires='.length)).getTime() / 1000)
    } else if (lower.startsWith('samesite=')) {
      const ss = attr.split('=')[1]
      cookie['sameSite'] = ss.charAt(0).toUpperCase() + ss.slice(1).toLowerCase()
    }
  }

  return cookie
}

/**
 * API login и сохранение storageState
 *
 * Логинится через Better Auth API /api/auth/sign-in/email,
 * парсит Set-Cookie headers и записывает storageState JSON файлы.
 */
async function apiLoginAndSaveState(email: string, password: string, paths: string[], label: string) {
  const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  })

  if (!response.ok && response.status !== 302) {
    const body = await response.text().catch(() => '')
    throw new Error(`${label} login failed: status ${response.status}, body: ${body}`)
  }

  // Парсим все Set-Cookie headers
  const setCookieHeaders = response.headers.getSetCookie()
  if (!setCookieHeaders || setCookieHeaders.length === 0) {
    throw new Error(`${label} login: no Set-Cookie headers received`)
  }

  const cookies = setCookieHeaders.map((header) => parseSetCookieHeader(header, BASE_URL))

  // TTL fix: Better Auth устанавливает короткий TTL для session_data cookie.
  // Продлеваем HTTP expiry до session_token expires, чтобы cookie не истёк к запуску тестов.
  // НЕ модифицируем payload (value) — это инвалидирует signature.
  const sessionTokenCookie = cookies.find((c) => c['name'] === 'better-auth.session_token')
  const sessionDataCookie = cookies.find((c) => c['name'] === 'better-auth.session_data')
  if (sessionDataCookie && sessionTokenCookie) {
    sessionDataCookie['expires'] = sessionTokenCookie['expires']
  }

  // Формируем storageState в формате Playwright
  const storageState = {
    cookies,
    origins: [{ origin: BASE_URL, localStorage: [] }],
  }

  // Записываем во все целевые пути (dual paths)
  for (const sp of paths) {
    const dir = resolve(sp, '..')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(sp, JSON.stringify(storageState))
  }

  console.log(`  ✓ ${label} logged in via API (${paths.length} paths)`)
}

export default async function globalSetup(_config: FullConfig) {
  console.log('🔧 [globalSetup] Начинаем setup...')

  try {
    // === Шаг 1: Создаём тестовых пользователей в БД ===
    console.log('👤 [globalSetup] Создаём пользователей...')
    await Promise.all([ensureTestAdmin(TEST_ADMIN), ensureTestUser(TEST_USER)])
    console.log('✅ [globalSetup] Пользователи готовы')

    // === Шаг 2: Seed тестовых данных ===
    console.log('🌱 [globalSetup] Seed данных...')
    await seedTestData({
      sizes: FEMALE_SIZES,
      products: TEST_PRODUCTS,
    })
    console.log('✅ [globalSetup] Seed завершён')

    // === Шаг 3: Сбрасываем rate limit ===
    await resetRateLimit()
    console.log('✅ [globalSetup] Rate limit сброшен')

    // Закрываем соединение с БД перед логином
    await disconnectDb()

    // === Шаг 4: API login и сохранение storageState ===
    console.log('🔑 [globalSetup] Логин через API...')
    await apiLoginAndSaveState(TEST_ADMIN.email, TEST_ADMIN.password, ADMIN_PATHS, 'Admin')
    await apiLoginAndSaveState(TEST_USER.email, TEST_USER.password, USER_PATHS, 'User')

    console.log('✅ [globalSetup] Все пользователи авторизованы, setup завершён')
  } catch (error) {
    console.error('❌ [globalSetup] Ошибка:', error)
    throw error
  }
}
