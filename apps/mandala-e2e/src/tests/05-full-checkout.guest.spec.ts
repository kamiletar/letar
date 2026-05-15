/**
 * Тесты полного flow оформления заказа
 *
 * Проверяем путь: магазин → товар → корзина → checkout → успех
 */
import { expect, test } from '@playwright/test'

// Тестовые данные покупателя
const testCustomer = {
  name: 'Тест Покупатель',
  phone: '+79001234567',
  email: `test-${Date.now()}@example.com`,
  address: 'г. Москва, ул. Тестовая, д. 1',
  comment: 'Тестовый комментарий к заказу',
}

test.describe('Полный Checkout Flow', () => {
  // Убеждаемся, что нет сохранённой сессии
  test.use({ storageState: { cookies: [], origins: [] } })

  test('полный flow: магазин → добавление в корзину → checkout → успешный заказ', async ({ page }) => {
    // 1. Переход в магазин
    await page.goto('/shop')
    await expect(page).toHaveURL(/\/shop/)

    // 2. Ждём загрузки товаров
    const productCard = page.locator('a[href^="/shop/"]').first()
    const hasProducts = await productCard.isVisible({ timeout: 10000 }).catch(() => false)

    if (!hasProducts) {
      test.skip(true, 'Нет товаров в магазине')
      return
    }

    // 3. Клик на первый товар
    await productCard.click()
    await page.waitForURL(/\/shop\/.+/)

    // 4. Клик "Добавить в корзину"
    // Кнопка может содержать иконку, поэтому ищем по тексту внутри
    const addToCartButton = page.locator('button:has-text("Добавить в корзину")')
    await expect(addToCartButton).toBeVisible({ timeout: 5000 })

    await addToCartButton.click()

    // 5. Проверка toast "Добавлено в корзину" или изменения кнопки
    const addedConfirmation = page.getByText(/добавлено в корзину|в корзине/i)
    await expect(addedConfirmation).toBeVisible({ timeout: 5000 })

    // 6. Переход в корзину
    await page.goto('/cart')
    await expect(page).toHaveURL(/\/cart/)

    // 7. Проверка что товар в корзине
    const cartItem = page.locator('img[alt]').first()
    await expect(cartItem).toBeVisible()

    // 8. Клик "Оформить заказ"
    const checkoutLink = page.getByRole('link', { name: /оформить заказ/i })
    await checkoutLink.click()
    await expect(page).toHaveURL(/\/checkout/)

    // 9. Заполнение формы checkout
    await page.locator('input[name="name"]').fill(testCustomer.name)
    await page.locator('input[name="phone"]').fill(testCustomer.phone)
    await page.locator('input[name="email"]').fill(testCustomer.email)

    // Адрес может быть textarea
    const addressField = page.locator('textarea[name="address"], input[name="address"]')
    await addressField.fill(testCustomer.address)

    // Комментарий опционален
    const commentField = page.locator('textarea[name="comment"], input[name="comment"]')
    if (await commentField.isVisible().catch(() => false)) {
      await commentField.fill(testCustomer.comment)
    }

    // 10. Клик "Оформить заказ" (submit)
    await page.getByRole('button', { name: /оформить заказ/i }).click()

    // 11. Проверка редиректа на страницу успеха
    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 15000 })

    // 12. Проверка сообщения "Заказ оформлен"
    const successMessage = page.getByText(/заказ оформлен|спасибо|успешно/i)
    await expect(successMessage).toBeVisible()
  })

  test('checkout с пустыми полями показывает ошибки валидации', async ({ page }) => {
    // Сначала добавляем товар в корзину
    await page.goto('/shop')

    const productCard = page.locator('a[href^="/shop/"]').first()
    const hasProducts = await productCard.isVisible({ timeout: 10000 }).catch(() => false)

    if (!hasProducts) {
      test.skip(true, 'Нет товаров в магазине')
      return
    }

    await productCard.click()
    await page.waitForURL(/\/shop\/.+/)

    const addToCartButton = page.locator('button:has-text("Добавить в корзину")')
    await addToCartButton.click()

    // Ждём подтверждения добавления в корзину
    await expect(page.getByText(/добавлено в корзину|в корзине/i)).toBeVisible({ timeout: 5000 })

    // Переходим в checkout
    await page.goto('/checkout')
    await expect(page).toHaveURL(/\/checkout/)

    // Пробуем отправить пустую форму
    await page.getByRole('button', { name: /оформить заказ/i }).click()

    // Проверяем ошибки валидации
    // Имя и телефон обязательны
    const errorMessages = page.getByText(/обязательно|заполните|required/i)
    await expect(errorMessages.first()).toBeVisible({ timeout: 5000 })
  })
})
