/**
 * Тесты защищённых страниц - редирект на /auth/signin
 *
 * Проверяем, что защищённые страницы недоступны без авторизации
 * и перенаправляют на страницу входа
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../config/i18n'

test.describe('06-guest: Защищённые страницы', () => {
  // Убеждаемся, что нет сохранённой сессии
  test.use({ storageState: { cookies: [], origins: [] } })

  test.describe('Профиль пользователя', () => {
    test('/profile → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/profile/edit → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile/edit'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/profile/addresses → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile/addresses'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/profile/measurements → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile/measurements'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/profile/wishlist → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile/wishlist'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/profile/orders → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile/orders'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/profile/custom-orders → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile/custom-orders'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/profile/settings → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile/settings'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/profile/company → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile/company'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/profile/connected-accounts → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile/connected-accounts'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/profile/change-password → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/profile/change-password'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })
  })

  // SKIP: Корзина и checkout доступны для гостей, редирект не происходит
  test.describe.skip('Корзина и оформление', () => {
    test('/cart → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/cart'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/checkout → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/checkout'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })
  })

  test.describe('Админ-панель', () => {
    test('/admin → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/admin'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/admin/products → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/admin/products'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/admin/sizes → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/admin/sizes'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/admin/images → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/admin/images'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/admin/users → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/admin/users'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('/admin/custom-orders → redirect /auth/signin', async ({ page }) => {
      await page.goto(localePath('/admin/custom-orders'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })
  })

  test.describe('Редирект работает корректно', () => {
    test('редирект на signin происходит с профиля', async ({ page }) => {
      await page.goto(localePath('/profile'))
      // Редирект произошёл
      const url = page.url()
      expect(url).toMatch(/\/ru\/auth\/signin/)
    })

    // SKIP: Корзина доступна для гостей, редирект не происходит
    test.skip('редирект на signin происходит с корзины', async ({ page }) => {
      await page.goto(localePath('/cart'))
      const url = page.url()
      expect(url).toMatch(/\/ru\/auth\/signin/)
    })

    test('редирект на signin происходит с админки', async ({ page }) => {
      await page.goto(localePath('/admin'))
      const url = page.url()
      expect(url).toMatch(/\/ru\/auth\/signin/)
    })
  })
})
