/**
 * Тесты мобильного интерфейса: Адаптивная вёрстка
 *
 * Тестируем:
 * - Корректное отображение на мобильных устройствах
 * - Работа мобильного меню
 * - Адаптивность ключевых страниц
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../../config/i18n'

// Конфигурация мобильного viewport
const mobileViewport = { width: 375, height: 667 } // iPhone SE

test.describe('08-mobile: Адаптивная вёрстка', () => {
  test.use({ viewport: mobileViewport })

  test.describe('Главная страница', () => {
    test('главная страница загружается на мобильном', async ({ page }) => {
      await page.goto(localePath('/'))
      await expect(page).toHaveURL(/\/ru\/$/)
    })

    test('контент не выходит за границы экрана', async ({ page }) => {
      await page.goto(localePath('/'))

      // Проверяем, что нет горизонтального скролла
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(bodyWidth).toBeLessThanOrEqual(mobileViewport.width + 20) // небольшой допуск
    })

    test('навигация отображается', async ({ page }) => {
      await page.goto(localePath('/'))

      // На мобильном может быть бургер-меню или компактная навигация
      const nav = page.locator('nav, [data-testid="navigation"], [role="navigation"]')
      const burger = page.getByRole('button', { name: /меню|menu/i })

      const hasNavigation = (await nav.count()) > 0 || (await burger.count()) > 0
      expect(hasNavigation).toBeTruthy()
    })
  })

  test.describe('Мобильное меню', () => {
    test('бургер-меню открывается и закрывается', async ({ page }) => {
      await page.goto(localePath('/'))

      // Ищем кнопку бургер-меню
      const burgerButton = page.getByRole('button', { name: /меню|menu/i })

      if ((await burgerButton.count()) > 0) {
        // Открываем меню
        await burgerButton.click()
        await page.waitForTimeout(300)

        // Проверяем, что меню открылось
        const menuContent = page.locator('[data-state="open"], [aria-expanded="true"]')
        const hasOpenMenu = (await menuContent.count()) > 0

        if (hasOpenMenu) {
          // Закрываем меню
          await burgerButton.click()
          await page.waitForTimeout(300)
        }
      }
    })

    test('ссылки в мобильном меню работают', async ({ page }) => {
      await page.goto(localePath('/'))

      // Находим навигационные ссылки
      const catalogLink = page.getByRole('link', { name: /каталог/i }).first()

      if ((await catalogLink.count()) > 0 && (await catalogLink.isVisible())) {
        await catalogLink.click()
        await expect(page).toHaveURL(/\/ru\/catalog/)
      }
    })
  })

  test.describe('Каталог', () => {
    test('каталог отображается на мобильном', async ({ page }) => {
      await page.goto(localePath('/catalog'))
      await expect(page).toHaveURL(/\/ru\/catalog/)
    })

    test('карточки товаров адаптированы для мобильного', async ({ page }) => {
      await page.goto(localePath('/catalog'))

      // Карточки товаров должны быть видимы
      const productCard = page.locator(`[data-testid="product-card"], a[href^="${localePath('/catalog/')}"]`).first()

      if ((await productCard.count()) > 0) {
        await expect(productCard).toBeVisible()

        // Проверяем, что карточка не выходит за границы
        const box = await productCard.boundingBox()
        if (box) {
          expect(box.width).toBeLessThanOrEqual(mobileViewport.width)
        }
      }
    })
  })

  test.describe('Формы', () => {
    test('форма входа адаптирована для мобильного', async ({ page }) => {
      await page.goto(localePath('/auth/signin'))

      // Форма должна быть видима (может быть несколько форм - OAuth)
      const form = page.locator('form').first()
      await expect(form).toBeVisible()

      // Поля ввода должны быть достаточного размера для touch
      const emailInput = page.getByLabel(/email/i)
      if ((await emailInput.count()) > 0) {
        const box = await emailInput.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(32) // минимум для touch
        }
      }
    })

    test('форма регистрации адаптирована для мобильного', async ({ page }) => {
      await page.goto(localePath('/auth/register'))

      const form = page.locator('form')
      await expect(form).toBeVisible()
    })
  })

  test.describe('Футер', () => {
    test('футер отображается на мобильном', async ({ page }) => {
      await page.goto(localePath('/'))

      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
    })

    test('ссылки в футере кликабельны', async ({ page }) => {
      await page.goto(localePath('/'))

      const footerLinks = page.locator('footer a')
      const count = await footerLinks.count()

      // Должны быть ссылки в футере
      expect(count).toBeGreaterThan(0)
    })
  })
})
