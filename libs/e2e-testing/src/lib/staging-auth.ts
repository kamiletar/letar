import type { Browser, Page } from '@playwright/test'
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
  /**
   * Опционально — если фикстуре помимо dev-session cookie нужен ещё и рабочий реальный вход по
   * email+паролю (например, тесты успешного /sign-in/email), см. `createDevSessionRoute`
   * (`@letar/auth/server`) — без этого параметра dev-session создаёт User+Session без единой
   * записи Account, и `/sign-in/email` для такого юзера всегда падает
   * ("Credential account not found").
   */
  password?: string
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
  const {
    baseURL,
    email,
    redirect,
    token,
    paths,
    postLoginPath,
    password,
    cookieSuffix = 'better-auth.session_token',
  } = options

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const params = new URLSearchParams({ email, redirect, token, ...(password && { password }) })
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

export interface OpenDevSessionPageOptions {
  /** Браузер текущего теста (фикстура `browser`) — контекст создаётся в нём, а не в новом процессе */
  browser: Browser
  /** Базовый URL окружения; обычно `test.info().project.use.baseURL` */
  baseURL: string
  /** `DEV_SESSION_TOKEN`, см. {@link requireDevSessionToken} */
  token: string
  /** Путь страницы, на которой окажется сессия после логина (например `/admin/paper-types`) */
  redirect: string
  /**
   * Путь, на котором должна оказаться страница после логина, если он не совпадает с `redirect`.
   * По умолчанию это путь из `redirect`. Нужен, когда приложение переписывает адрес по дороге:
   * `next-intl` с локалью по умолчанию без префикса сворачивает `redirect: '/ru'` в `/`, и сверка
   * по `redirect` падает с «ждали '/ru', оказались на '/'». Сверка — по префиксу (`startsWith`),
   * хвостовые слэши отбрасываются; `'/'` принимает любую страницу этого же сайта.
   */
  expectedPath?: string
  /**
   * Email фикстуры. Не передан — роут выбирает свой дефолт (для aboi это админ), см.
   * `createDevSessionRoute` из `@letar/auth/server`.
   */
  email?: string
  /** Локаль контекста браузера. По умолчанию `ru-RU`. */
  locale?: string
  /**
   * Подготовка страницы ДО логина — например `addInitScript` с согласием на cookie, чтобы баннер
   * не перекрывал клики на страницах, которые откроются дальше.
   */
  prepare?: (page: Page) => Promise<void>
}

/**
 * Открывает страницу под dev-session в **отдельном контексте браузера**. Отдельный контекст нужен,
 * когда сценарию одновременно требуются две роли (гость в основном `page` и админ рядом): cookie
 * сессий в разных контекстах не смешиваются. Для одной роли на весь набор тестов проще
 * {@link devSessionLogin} + `storageState` в `global-setup`.
 *
 * Успех проверяем по ответу и по финальному адресу, а не через `waitForURL('**\/admin**')`: адрес
 * неудачного запроса (403) тоже содержит `redirect=/admin…` и дал бы ложный успех
 * (`.claude/docs/e2e-testing.md`, «Ловушка в `global-setup.ts`»). При неудаче контекст закрывается
 * сам, при успехе его закрывает вызывающий: `await page.context().close()`.
 *
 * ⚠️ Адрес сверяется с `redirect` по префиксу. Если приложение переписывает адрес (`next-intl`
 * сворачивает `/ru` в `/`, когда `ru` — локаль по умолчанию без префикса), передай `expectedPath`
 * с тем адресом, который реально окажется в строке браузера.
 *
 * @example
 * ```ts
 * const admin = await openDevSessionPage({ browser, baseURL, token, redirect: '/admin/paper-types' })
 * try {
 *   // ...сценарий...
 * } finally {
 *   await admin.context().close()
 * }
 * ```
 */
export async function openDevSessionPage(options: OpenDevSessionPageOptions): Promise<Page> {
  const { browser, baseURL, token, redirect, expectedPath: expectedPathOption, email, locale = 'ru-RU', prepare } =
    options

  const context = await browser.newContext({ baseURL, locale })
  try {
    const page = await context.newPage()
    await prepare?.(page)

    const params = new URLSearchParams({ token, redirect, ...(email && { email }) })
    const response = await page.goto(`/api/auth/dev-session?${params.toString()}`)
    if (!response?.ok()) {
      throw new Error(
        `[openDevSessionPage] dev-session не создал сессию (HTTP ${response?.status() ?? 'нет ответа'}) — `
          + 'проверь ALLOW_DEV_SESSION и DEV_SESSION_TOKEN на сервере',
      )
    }

    const expectedPath = new URL(expectedPathOption ?? redirect, baseURL).pathname.replace(/\/+$/, '')
    const actualPath = new URL(page.url()).pathname
    if (!actualPath.startsWith(expectedPath)) {
      throw new Error(
        `[openDevSessionPage] после dev-session ждали страницу '${expectedPath}', оказались на '${actualPath}'`,
      )
    }
    return page
  } catch (error) {
    await context.close()
    throw error
  }
}
