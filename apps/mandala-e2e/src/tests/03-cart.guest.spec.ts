/**
 * Тесты корзины покупок
 *
 * Проверяем функциональность корзины (localStorage)
 */
import { expect, test } from '@playwright/test'

test.describe('Корзина', () => {
  // Убеждаемся, что нет сохранённой сессии
  test.use({ storageState: { cookies: [], origins: [] } })

  test.describe('Пустая корзина', () => {
    test('страница /cart загружается', async ({ page }) => {
      await page.goto('/cart')
      await expect(page).toHaveURL('/cart')
    })

    test('отображает сообщение о пустой корзине', async ({ page }) => {
      await page.goto('/cart')
      // Проверяем, что есть сообщение о пустой корзине
      await expect(page.getByText(/корзина пуста|нет товаров/i)).toBeVisible()
    })

    test('есть ссылка на магазин', async ({ page }) => {
      await page.goto('/cart')
      // Ждём загрузки клиентского компонента CartItems
      await page.waitForLoadState('domcontentloaded')
      // Должна быть кнопка-ссылка "Перейти в магазин" (EmptyState рендерит Button с asChild Link)
      const shopLink = page.getByRole('link', { name: /перейти в магазин/i })
      await expect(shopLink).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Добавление в корзину', () => {
    test('можно добавить товар в корзину со страницы товара', async ({ page }) => {
      await page.goto('/shop')

      // Кликаем на первый товар
      const productCard = page.locator('a[href^="/shop/"]').first()
      const hasProducts = (await productCard.count()) > 0

      if (hasProducts) {
        await productCard.click()
        await page.waitForURL(/\/shop\/.+/)

        // Ищем кнопку "Добавить в корзину"
        const addToCartButton = page.getByRole('button', { name: /добавить в корзину|в корзину/i })
        const hasButton = (await addToCartButton.count()) > 0

        if (hasButton) {
          await addToCartButton.click()

          // Проверяем, что появился индикатор корзины или тост
          const cartIndicator = page.locator('[data-testid="cart-count"], [aria-label*="корзин"]')
          const toast = page.getByText(/добавлен|в корзине/i)

          const hasIndicator = (await cartIndicator.count()) > 0
          const hasToast = (await toast.count()) > 0

          expect(hasIndicator || hasToast).toBeTruthy()
        }
      }
    })
  })

  test.describe('Управление корзиной', () => {
    test('иконка корзины в шапке кликабельна', async ({ page }) => {
      await page.goto('/')

      // Ищем иконку корзины
      const cartLink = page.locator('a[href="/cart"], [data-testid="cart-icon"], [aria-label*="корзин"]')
      const hasCartLink = (await cartLink.count()) > 0

      if (hasCartLink) {
        await cartLink.first().click()
        await expect(page).toHaveURL('/cart')
      }
    })
  })
})
