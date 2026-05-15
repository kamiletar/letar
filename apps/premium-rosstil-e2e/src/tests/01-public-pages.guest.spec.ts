/**
 * Тесты публичных страниц - доступны без авторизации
 *
 * Проверяем, что публичные страницы загружаются без редиректа на /auth/signin
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../config/i18n'

test.describe('06-guest: Публичные страницы', () => {
  // Убеждаемся, что нет сохранённой сессии
  test.use({ storageState: { cookies: [], origins: [] } })

  test.describe('Статические страницы', () => {
    test('главная страница доступна без авторизации', async ({ page }) => {
      await page.goto(localePath('/'))
      await expect(page).toHaveURL(/\/ru\/$/)
      // Не должно быть редиректа на signin
      await expect(page).not.toHaveURL(/auth\/signin/)
    })

    test('страница "О бренде" доступна без авторизации', async ({ page }) => {
      await page.goto(localePath('/about'))
      await expect(page).toHaveURL(/\/ru\/about/)
      await expect(page).not.toHaveURL(/auth\/signin/)
    })

    test('страница "Контакты" доступна без авторизации', async ({ page }) => {
      await page.goto(localePath('/contacts'))
      await expect(page).toHaveURL(/\/ru\/contacts/)
      await expect(page).not.toHaveURL(/auth\/signin/)
    })

    test('страница "Доставка" доступна без авторизации', async ({ page }) => {
      await page.goto(localePath('/delivery'))
      await expect(page).toHaveURL(/\/ru\/delivery/)
      await expect(page).not.toHaveURL(/auth\/signin/)
    })

    test('страница "Как купить" доступна без авторизации', async ({ page }) => {
      await page.goto(localePath('/how-to-buy'))
      await expect(page).toHaveURL(/\/ru\/how-to-buy/)
      await expect(page).not.toHaveURL(/auth\/signin/)
    })

    test('страница "Реквизиты" доступна без авторизации', async ({ page }) => {
      await page.goto(localePath('/requisites'))
      await expect(page).toHaveURL(/\/ru\/requisites/)
      await expect(page).not.toHaveURL(/auth\/signin/)
    })

    test('калькулятор размеров доступен без авторизации', async ({ page }) => {
      await page.goto(localePath('/size-calculator'))
      await expect(page).toHaveURL(/\/ru\/size-calculator/)
      await expect(page).not.toHaveURL(/auth\/signin/)
    })
  })

  test.describe('Каталог', () => {
    test('каталог доступен без авторизации', async ({ page }) => {
      await page.goto(localePath('/catalog'))
      await expect(page).toHaveURL(/\/ru\/catalog/)
      await expect(page).not.toHaveURL(/auth\/signin/)
    })

    test('страница товара доступна без авторизации', async ({ page }) => {
      // Сначала переходим в каталог
      await page.goto(localePath('/catalog'))

      // Пытаемся найти карточку товара
      const productCard = page.locator(`[data-testid="product-card"], a[href^="${localePath('/catalog/')}"]`).first()
      const hasProducts = (await productCard.count()) > 0

      if (hasProducts) {
        // Если есть товары - кликаем на первый
        await productCard.click()
        await page.waitForURL(/\/ru\/catalog\/.+/)
        // Проверяем, что не перенаправило на signin
        await expect(page).not.toHaveURL(/auth\/signin/)
      } else {
        // Если товаров нет - пробуем прямой URL
        await page.goto(localePath('/catalog/test-product'))
        // Может быть 404, но не должно быть signin
        await expect(page).not.toHaveURL(/auth\/signin/)
      }
    })
  })

  test.describe('Авторизация', () => {
    test('страница входа доступна без авторизации', async ({ page }) => {
      await page.goto(localePath('/auth/signin'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/)
    })

    test('страница регистрации доступна без авторизации', async ({ page }) => {
      await page.goto(localePath('/auth/register'))
      await expect(page).toHaveURL(/\/ru\/auth\/register/)
    })

    test('страница восстановления пароля доступна без авторизации', async ({ page }) => {
      await page.goto(localePath('/auth/forgot-password'))
      await expect(page).toHaveURL(/\/ru\/auth\/forgot-password/)
    })
  })

  test.describe('Навигация без авторизации', () => {
    test('можно перейти с главной в каталог', async ({ page }) => {
      await page.goto(localePath('/'))
      await page
        .getByRole('link', { name: /каталог/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/ru\/catalog/)
    })

    test('можно перейти с главной на страницу "О бренде"', async ({ page }) => {
      await page.goto(localePath('/'))
      await page
        .getByRole('link', { name: /о бренде/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/ru\/about/)
    })

    test('можно перейти с главной на страницу "Контакты"', async ({ page }) => {
      await page.goto(localePath('/'))
      await page
        .getByRole('link', { name: /контакты/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/ru\/contacts/)
    })
  })
})
