/**
 * Смоук OIDC-флоу без сессии — то же самое, что вручную проверял BlackCove при последнем
 * rollout-деплое auth-hub (§18.6 Сессия J).
 *
 * ⚠️ Намеренно НЕ привязываемся к конкретному client_id из prisma/seed.ts (`kami-prod`,
 * `archetest-prod` и т.д.) — сид не гарантированно применён на e2e-БД, а поведение Better Auth
 * `/api/auth/oauth2/authorize` при несуществующем client_id недокументировано в этом монорепо
 * (может быть как редирект на /sign-in, так и структурированная 400-ошибка ДО проверки сессии).
 * Вместо этого проверяем два независимых, надёжных инварианта:
 * 1. `/sign-in` с произвольными OIDC query-параметрами в URL рендерится и не падает 500 —
 *    это путь, которым Better Auth в норме редиректит неавторизованного пользователя
 *    (см. usePostSignInCallback.ts — страница сама читает client_id/redirect_uri/response_type
 *    из своих searchParams, не проксируя их дальше на authorize endpoint).
 * 2. Прямой заход на `/api/auth/oauth2/authorize?...` без сессии не 500 — структурный
 *    смоук самого endpoint (route.ts — обёртка над toNextJsHandler(auth)).
 */

import { expect, test } from './fixtures/base-test'

test.describe('OIDC flow — без сессии', () => {
  test.use({ storageState: undefined })

  test('/sign-in рендерит форму логина с OIDC query-параметрами в URL', async ({ page }) => {
    const params = new URLSearchParams({
      client_id: 'kami-prod',
      response_type: 'code',
      redirect_uri: 'https://kami.letar.best/api/auth/oauth2/callback/letar-auth',
      scope: 'openid profile email',
      state: 'e2e-smoke-state',
    })

    const response = await page.goto(`/sign-in?${params.toString()}`, { waitUntil: 'domcontentloaded' })

    expect(response?.status()).toBeLessThan(500)
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
  })

  test('/api/auth/oauth2/authorize без сессии не отдаёт 500', async ({ page }) => {
    const params = new URLSearchParams({
      client_id: 'kami-prod',
      response_type: 'code',
      redirect_uri: 'https://kami.letar.best/api/auth/oauth2/callback/letar-auth',
      scope: 'openid profile email',
      state: 'e2e-smoke-state',
    })

    const response = await page.goto(`/api/auth/oauth2/authorize?${params.toString()}`, {
      waitUntil: 'domcontentloaded',
    })

    // Допустимые исходы: редирект на /sign-in (нет сессии) или структурированная ошибка валидации
    // client_id (400/401) — важно только отсутствие 500 и то, что страница не падает целиком.
    expect(response?.status()).toBeLessThan(500)
    await expect(page.locator('body')).toBeVisible()
  })
})
