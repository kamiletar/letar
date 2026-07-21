import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Возвращает пути для записи storageState — в конфиг-директорию e2e-проекта и в CWD.
 * Playwright разрешает `test.use({ storageState })` относительно CWD, а `config.use({ storageState })` —
 * относительно configDir; при запуске через Nx они не совпадают, поэтому пишем в обе локации.
 */
export function storagePaths(e2eRoot: string, filename: string): string[] {
  const configDirPath = resolve(e2eRoot, `playwright/.auth/${filename}`)
  const cwdPath = resolve(process.cwd(), `playwright/.auth/${filename}`)
  if (configDirPath === cwdPath) {
    return [configDirPath]
  }
  return [configDirPath, cwdPath]
}

/**
 * Читает `DEV_SESSION_TOKEN` из окружения — бросает понятную ошибку вместо непрозрачного 403,
 * если staging-раннер не прокинул переменную явно.
 */
export function requireDevSessionToken(): string {
  const token = process.env['DEV_SESSION_TOKEN']
  if (!token) {
    throw new Error('[globalSetup:staging] DEV_SESSION_TOKEN не задан — dev-session вернёт 403')
  }
  return token
}

export interface DevSessionLoginOptions {
  /** Базовый URL staging-окружения (`BASE_URL`) */
  baseURL: string
  /** Email фикстуры — должен совпадать с тем, что резолвит `buildUserData` на роуте `/api/auth/dev-session` */
  email: string
  /** Путь редиректа после установки cookie */
  redirect: string
  /** `DEV_SESSION_TOKEN`, см. {@link requireDevSessionToken} */
  token: string
  /** Куда сохранить storageState — см. {@link storagePaths} */
  paths: string[]
  /**
   * Дополнительный переход после логина — например, чтобы триггернуть серверный побочный эффект
   * (создание связанной записи по query-параметру), который не делает сам dev-session роут.
   */
  postLoginPath?: string
  /** Суффикс имени cookie сессии Better Auth. По умолчанию `better-auth.session_token`. */
  cookieSuffix?: string
}

/**
 * Логинится через staging-only `/api/auth/dev-session` (см. `createDevSessionRoute` из
 * `@letar/auth/server`) вместо прямой записи в БД — staging-раннер физически не имеет доступа к
 * `DATABASE_URL` приложения (другая сеть/БД). Сохраняет storageState по всем переданным путям.
 *
 * @example
 * ```ts
 * // apps/my-app-e2e/src/global-setup.ts
 * import { devSessionLogin, requireDevSessionToken, storagePaths } from '@letar/e2e-testing'
 *
 * async function stagingGlobalSetup() {
 *   const token = requireDevSessionToken()
 *   await devSessionLogin({
 *     baseURL: process.env['BASE_URL']!,
 *     email: 'e2e-admin@my-app.test',
 *     redirect: '/admin',
 *     token,
 *     paths: storagePaths(e2eRoot, 'admin.json'),
 *   })
 * }
 * ```
 */
export async function devSessionLogin(options: DevSessionLoginOptions): Promise<void> {
  const { baseURL, email, redirect, token, paths, postLoginPath, cookieSuffix = 'better-auth.session_token' } = options

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const params = new URLSearchParams({ email, redirect, token })
    await page.goto(`${baseURL}/api/auth/dev-session?${params.toString()}`)

    const cookies = await context.cookies()
    const sessionCookie = cookies.find((c) => c.name.endsWith(cookieSuffix))
    if (!sessionCookie) {
      throw new Error(
        `[devSessionLogin] dev-session не установил cookie '*${cookieSuffix}' для ${email} — `
          + 'вероятно 403 (ALLOW_DEV_SESSION/DEV_SESSION_TOKEN не совпадают на сервере)',
      )
    }

    if (postLoginPath) {
      await page.goto(`${baseURL}${postLoginPath}`)
    }

    for (const p of paths) {
      mkdirSync(resolve(p, '..'), { recursive: true })
      await context.storageState({ path: p })
    }
  } finally {
    await browser.close()
  }
}
