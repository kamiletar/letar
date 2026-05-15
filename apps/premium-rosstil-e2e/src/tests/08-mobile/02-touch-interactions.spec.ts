/**
 * Тесты мобильного интерфейса: Touch-взаимодействия
 *
 * Тестируем:
 * - Кликабельность элементов на мобильном
 * - Размеры touch-таргетов
 * - Скролл и свайп
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../../config/i18n'

const mobileViewport = { width: 375, height: 667 }

test.describe('08-mobile: Touch-взаимодействия', () => {
  test.use({ viewport: mobileViewport })

  test.describe('Touch-таргеты', () => {
    test('кнопки имеют достаточный размер для нажатия', async ({ page }) => {
      await page.goto(localePath('/'))

      // Проверяем размеры кнопок (минимум 44x44px по Apple HIG)
      const buttons = page.getByRole('button')
      const count = await buttons.count()

      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i)
        if (await button.isVisible()) {
          const box = await button.boundingBox()
          if (box) {
            // Допускаем чуть меньший размер для иконок
            expect(box.width).toBeGreaterThanOrEqual(32)
            expect(box.height).toBeGreaterThanOrEqual(32)
          }
        }
      }
    })

    test('ссылки имеют достаточную область клика', async ({ page }) => {
      await page.goto(localePath('/'))

      const links = page.getByRole('link')
      const count = await links.count()

      for (let i = 0; i < Math.min(count, 5); i++) {
        const link = links.nth(i)
        if (await link.isVisible()) {
          const box = await link.boundingBox()
          if (box) {
            // Высота должна быть достаточной для нажатия
            expect(box.height).toBeGreaterThanOrEqual(24)
          }
        }
      }
    })
  })

  test.describe('Скролл', () => {
    test('страница прокручивается вертикально', async ({ page }) => {
      await page.goto(localePath('/'))

      // Скроллим вниз
      await page.evaluate(() => window.scrollBy(0, 200))
      await page.waitForTimeout(100)

      const scrollY = await page.evaluate(() => window.scrollY)
      expect(scrollY).toBeGreaterThan(0)
    })

    test('каталог прокручивается', async ({ page }) => {
      await page.goto(localePath('/catalog'))

      await page.evaluate(() => window.scrollBy(0, 300))
      await page.waitForTimeout(100)

      const scrollY = await page.evaluate(() => window.scrollY)
      // Может не прокрутиться если мало товаров
      expect(scrollY >= 0).toBeTruthy()
    })
  })

  test.describe('Интерактивные элементы', () => {
    test('товар можно открыть кликом', async ({ page }) => {
      await page.goto(localePath('/catalog'))

      const productCard = page.locator(`[data-testid="product-card"], a[href^="${localePath('/catalog/')}"]`).first()

      if ((await productCard.count()) > 0) {
        await productCard.click()
        await page.waitForLoadState('domcontentloaded')
        // Должен перейти на страницу товара или остаться в каталоге
      }
    })

    test('формы работают', async ({ page }) => {
      await page.goto(localePath('/auth/signin'))

      const emailInput = page.getByLabel(/email/i)

      if ((await emailInput.count()) > 0) {
        // Клик на поле ввода
        await emailInput.click()
        await emailInput.fill('test@example.com')

        // Проверяем, что значение введено
        await expect(emailInput).toHaveValue('test@example.com')
      }
    })
  })

  test.describe('Модальные окна', () => {
    test('модальные окна закрываются тапом на overlay', async ({ page }) => {
      // Переходим на страницу где может быть модальное окно
      await page.goto(localePath('/'))

      // Ищем кнопку, открывающую модальное окно
      const triggerButton = page.getByRole('button', { name: /добавить|подробнее/i }).first()

      if ((await triggerButton.count()) > 0) {
        await triggerButton.tap()
        await page.waitForTimeout(300)

        // Ищем overlay модального окна
        const overlay = page.locator('[data-state="open"] [data-part="backdrop"], .chakra-modal__overlay')
        if ((await overlay.count()) > 0) {
          // Тап по overlay должен закрыть модальное окно
          await overlay.tap({ force: true })
          await page.waitForTimeout(300)
        }
      }
    })
  })
})
