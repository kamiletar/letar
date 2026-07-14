/**
 * Публичные страницы — доступны без авторизации.
 * `storageState: undefined` — явно без cookies (иначе браузер унаследует storageState
 * первого проекта Playwright, см. e2e-testing.md "Тесты на неавторизованный редирект").
 */

import { expect, test } from './fixtures/base-test'

test.describe('Sign-in', () => {
  test.use({ storageState: undefined })

  test('форма email/password видна', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByRole('heading', { name: 'Войти' })).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
  })

  test('форма magic link видна', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByRole('button', { name: 'Отправить ссылку для входа' })).toBeVisible()
  })

  test('OAuth-кнопки видны', async ({ page }) => {
    await page.goto('/sign-in')
    // В dev/на staging без x-forwarded-for гео-фильтр отключён (isRussianIp === false) —
    // видны все провайдеры (google/github/facebook/vk/yandex), см. sign-in/page.tsx.
    // OAuthButtons рендерит <Button> с текстом "Продолжить с {Provider}" (не <a>), см.
    // libs/auth/src/client/oauth-buttons.tsx.
    await expect(page.getByRole('button', { name: /Продолжить с Google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Продолжить с Яндекс/i })).toBeVisible()
  })
})

test.describe('Sign-up', () => {
  test.use({ storageState: undefined })

  test('форма регистрации видна', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Зарегистрироваться' })).toBeVisible()
  })
})
