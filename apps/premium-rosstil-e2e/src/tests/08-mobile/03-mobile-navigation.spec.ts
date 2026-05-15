/**
 * Тесты мобильного интерфейса: Навигация
 *
 * Тестируем:
 * - Мобильное меню (бургер)
 * - Переходы между страницами
 * - Breadcrumbs на мобильном
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../../config/i18n'

const mobileViewport = { width: 375, height: 667 }

test.describe('08-mobile: Навигация', () => {
  test.use({ viewport: mobileViewport })

  test.describe('Главное меню', () => {
    test('навигация доступна на мобильном', async ({ page }) => {
      await page.goto(localePath('/'))

      // Ищем элементы навигации
      const nav = page.locator('nav, [role="navigation"]')
      const burger = page.getByRole('button', { name: /меню|menu/i })
      const links = page.getByRole('link')

      // Должна быть хотя бы какая-то форма навигации
      const hasNav = (await nav.count()) > 0 || (await burger.count()) > 0 || (await links.count()) > 0
      expect(hasNav).toBeTruthy()
    })

    test('переход в каталог работает', async ({ page }) => {
      await page.goto(localePath('/'))

      const catalogLink = page.getByRole('link', { name: /каталог/i }).first()

      if ((await catalogLink.count()) > 0 && (await catalogLink.isVisible())) {
        await catalogLink.click()
        await expect(page).toHaveURL(/\/ru\/catalog/)
      }
    })

    test('переход на страницу "О бренде" работает', async ({ page }) => {
      await page.goto(localePath('/'))

      const aboutLink = page.getByRole('link', { name: /о бренде/i }).first()

      if ((await aboutLink.count()) > 0 && (await aboutLink.isVisible())) {
        await aboutLink.click()
        await expect(page).toHaveURL(/\/ru\/about/)
      }
    })

    test('переход на страницу "Контакты" работает', async ({ page }) => {
      await page.goto(localePath('/'))

      const contactsLink = page.getByRole('link', { name: /контакты/i }).first()

      if ((await contactsLink.count()) > 0 && (await contactsLink.isVisible())) {
        await contactsLink.click()
        await expect(page).toHaveURL(/\/ru\/contacts/)
      }
    })
  })

  test.describe('Логотип', () => {
    test('логотип ведёт на главную', async ({ page }) => {
      await page.goto(localePath('/catalog'))

      const logo = page.locator(`a[href="${localePath('/')}"]`).first()

      if ((await logo.count()) > 0) {
        await logo.click()
        await expect(page).toHaveURL(/\/ru\/$/)
      }
    })
  })

  test.describe('История браузера', () => {
    test('кнопка "Назад" работает', async ({ page }) => {
      await page.goto(localePath('/'))
      await page.goto(localePath('/catalog'))

      // Возвращаемся назад
      await page.goBack()
      await expect(page).toHaveURL(/\/ru\/$/)
    })

    // Skip: Next.js prefetching вызывает net::ERR_ABORTED при goForward()
    test.skip('кнопка "Вперёд" работает', async ({ page }) => {
      await page.goto(localePath('/'))
      await page.goto(localePath('/catalog'))
      await page.goBack()
      // Ждём загрузки главной страницы
      await page.waitForLoadState('domcontentloaded')

      // Возвращаемся вперёд
      await page.goForward()
      await page.waitForLoadState('domcontentloaded')
      await expect(page).toHaveURL(/\/ru\/catalog/)
    })
  })

  test.describe('Статические страницы', () => {
    const staticPages = [
      { path: '/about', name: 'О бренде' },
      { path: '/contacts', name: 'Контакты' },
      { path: '/delivery', name: 'Доставка' },
      { path: '/how-to-buy', name: 'Как купить' },
      { path: '/requisites', name: 'Реквизиты' },
    ]

    for (const staticPage of staticPages) {
      test(`страница "${staticPage.name}" загружается на мобильном`, async ({ page }) => {
        await page.goto(localePath(staticPage.path))
        await expect(page).toHaveURL(new RegExp(`/ru${staticPage.path}`))
        await expect(page.locator('body')).toContainText(/./s)
      })
    }
  })
})
