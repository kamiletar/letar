/**
 * Глобальная настройка: авторизация admin через dev-session endpoint.
 * Сохраняет storageState для тестов, требующих авторизации.
 *
 * ⚠️ НЕ проверяет успех по `waitForURL` — dev-session редиректит на `?redirect=/admin` даже
 * в query-строке своего собственного 403-ответа, так что URL-паттерн ложно совпадает и с
 * провалом, и с успехом. Проверяем реальный результат: cookie сессии либо установлена, либо нет.
 */

import type { FullConfig } from '@playwright/test'
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const ADMIN_STORAGE_STATE = resolve(__dirname, '../playwright/.auth/admin.json')

// Суффикс, а не точное имя — Better Auth добавляет префикс `__Secure-` при
// useSecureCookies (когда BETTER_AUTH_URL начинается с https://, см. createDevSessionRoute).
const SESSION_COOKIE_SUFFIX = 'better-auth.session_token'

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3014'
  const devSessionToken = process.env.DEV_SESSION_TOKEN
  if (!devSessionToken) {
    throw new Error(
      '[Global Setup] DEV_SESSION_TOKEN не задан в окружении e2e-раннера — без него dev-session вернёт 403'
    )
  }

  // Создаём директорию для auth state
  const authDir = resolve(__dirname, '../playwright/.auth')
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true })
  }

  // Авторизуемся через dev-session endpoint
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const params = new URLSearchParams({
      email: 'admin@auth.letar.best',
      redirect: '/admin',
      token: devSessionToken,
    })
    await page.goto(`${baseURL}/api/auth/dev-session?${params.toString()}`)

    const cookies = await context.cookies()
    const sessionCookie = cookies.find((cookie) => cookie.name.endsWith(SESSION_COOKIE_SUFFIX))
    if (!sessionCookie) {
      throw new Error(
        `[Global Setup] dev-session не установил cookie '*${SESSION_COOKIE_SUFFIX}' — вероятно 403 ` +
          '(ALLOW_DEV_SESSION/DEV_SESSION_TOKEN не совпадают на сервере) или ошибка авторизации'
      )
    }

    // Сохраняем cookies в storageState
    await context.storageState({ path: ADMIN_STORAGE_STATE })
    console.log('[Global Setup] Admin авторизован, storageState сохранён')
  } catch (error) {
    console.error('[Global Setup] Ошибка авторизации:', error)
    throw error
  } finally {
    await browser.close()
  }
}
