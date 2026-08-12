/**
 * Тесты оформления заказа
 *
 * Проверяем процесс checkout
 */
import { expect, test } from '@playwright/test'

test.describe('Оформление заказа', () => {
  // Убеждаемся, что нет сохранённой сессии
  test.use({ storageState: { cookies: [], origins: [] } })

  test.describe('Пустая корзина', () => {
    test('/checkout без товаров показывает сообщение или редиректит', async ({ page }) => {
      await page.goto('/checkout')

      // Ждём загрузки страницы (client-side компонент с useCart)
      await page.waitForLoadState('domcontentloaded')

      // Либо редирект на корзину, либо сообщение о пустой корзине
      const url = page.url()
      const isCart = url.includes('/cart')
      // EmptyState показывает "Корзина пуста" и "Добавьте товары"
      const emptyMessage = page.getByText(/корзина пуста/i)
      const hasEmptyMessage = await emptyMessage.isVisible({ timeout: 5000 }).catch(() => false)

      expect(isCart || hasEmptyMessage).toBeTruthy()
    })
  })

  test.describe('Процесс оформления', () => {
    test('с товаром в корзине показывает форму checkout', async ({ page }) => {
      // Сначала добавляем товар в корзину
      await page.goto('/shop')

      const productCard = page.locator('a[href^="/shop/"]').first()
      const hasProducts = (await productCard.count()) > 0

      if (!hasProducts) {
        test.skip()
        return
      }

      await productCard.click()
      await page.waitForURL(/\/shop\/.+/)

      const addToCartButton = page.getByRole('button', { name: /добавить в корзину|в корзину/i })
      const hasButton = (await addToCartButton.count()) > 0

      if (!hasButton) {
        test.skip()
        return
      }

      await addToCartButton.click()

      // Ждём добавления в корзину
      await page.waitForTimeout(1000)

      // Переходим в checkout
      await page.goto('/checkout')

      // Проверяем, что показывается форма оформления
      const checkoutForm = page.locator('form, [data-testid="checkout-form"]')
      const orderSummary = page.getByText(/итого|сумма|заказ/i)

      const hasForm = (await checkoutForm.count()) > 0
      const hasSummary = (await orderSummary.count()) > 0

      expect(hasForm || hasSummary).toBeTruthy()
    })
  })

  test.describe('Страница успешного заказа', () => {
    test('/checkout/success содержит информацию о заказе', async ({ page }) => {
      // Эта страница обычно требует query params с orderId
      await page.goto('/checkout/success')

      // Либо показывает информацию о заказе, либо редиректит
      const url = page.url()
      const isSuccess = url.includes('/checkout/success')

      if (isSuccess) {
        // Страница успеха — 'use client' компонент (SuccessContent) внутри <Suspense>
        // без fallback: сразу после goto() он ещё не гидратирован, count() не ждёт
        // этого (в отличие от toBeVisible()) и стабильно ловит 0 совпадений.
        const successMessage = page.getByText(/заказ|спасибо|оформлен|успешно/i).first()
        await expect(successMessage).toBeVisible()
      }
    })
  })
})
