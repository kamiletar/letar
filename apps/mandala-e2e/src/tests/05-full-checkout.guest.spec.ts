/**
 * Тесты полного flow оформления заказа
 *
 * Проверяем путь: магазин → товар → корзина → checkout → успех
 */
import { expect, test } from '../fixtures/guest.fixture'

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
    const hasProducts = (await productCard.count()) > 0

    if (!hasProducts) {
      test.skip(true, 'Нет товаров в магазине')
      return
    }

    // 3. Переход на страницу товара
    // page.goto(href) вместо productCard.click() — клик по <Link> может попасть на узкое окно
    // гидратации: SSR-разметка <a href> видна и кликабельна ДО того, как React успел навесить
    // client-side обработчик, из-за чего событие клика проглатывается без единой ошибки и без
    // fallback-навигации браузера. Прямой goto() по атрибуту href не зависит от гидратации.
    const productHref = await productCard.getAttribute('href')
    await page.goto(productHref ?? '/shop')
    await page.waitForURL(/\/shop\/.+/)

    // 4. Клик "Добавить в корзину"
    // Кнопка может содержать иконку, поэтому ищем по тексту внутри
    const addToCartButton = page.locator('button:has-text("Добавить в корзину")')
    await expect(addToCartButton).toBeVisible({ timeout: 5000 })

    await addToCartButton.click()

    // 5. Проверка toast "Добавлено в корзину" или изменения кнопки
    // .first() — toast и disabled-кнопка "В корзине" совпадают под один regex одновременно
    const addedConfirmation = page.getByText(/добавлено в корзину|в корзине/i).first()
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
    // @letar/forms не проставляет нативный HTML name= на инпуты — только
    // data-field-name (см. libs/forms/src/lib/declarative/form-fields/text/field-string.tsx)
    await page.locator('[data-field-name="name"]').fill(testCustomer.name)
    await page.locator('[data-field-name="phone"]').fill(testCustomer.phone)
    await page.locator('[data-field-name="email"]').fill(testCustomer.email)
    await page.locator('[data-field-name="address"]').fill(testCustomer.address)

    // Комментарий опционален
    const commentField = page.locator('[data-field-name="comment"]')
    if (await commentField.isVisible().catch(() => false)) {
      await commentField.fill(testCustomer.comment)
    }

    // 10. Клик "Оформить заказ" (submit)
    await page.getByRole('button', { name: /оформить заказ/i }).click()

    // 11. Проверка редиректа на страницу успеха
    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 15000 })

    // 12. Проверка сообщения "Заказ оформлен"
    // .first() — заголовок и текст успеха совпадают под один regex одновременно
    const successMessage = page.getByText(/заказ оформлен|спасибо|успешно/i).first()
    await expect(successMessage).toBeVisible()
  })

  test('checkout с пустыми полями показывает ошибки валидации', async ({ page }) => {
    // Сначала добавляем товар в корзину
    await page.goto('/shop')

    const productCard = page.locator('a[href^="/shop/"]').first()
    const hasProducts = (await productCard.count()) > 0

    if (!hasProducts) {
      test.skip(true, 'Нет товаров в магазине')
      return
    }

    // page.goto(href) вместо click() — см. комментарий в первом тесте этого файла
    const productHref = await productCard.getAttribute('href')
    await page.goto(productHref ?? '/shop')
    await page.waitForURL(/\/shop\/.+/)

    const addToCartButton = page.locator('button:has-text("Добавить в корзину")')
    // Явное ожидание видимости перед кликом — не формальность: тот же класс гонки гидратации,
    // что и у навигации на карточку товара выше (см. комментарий в первом тесте этого файла).
    // Без него клик может попасть на кнопку до навешивания React-обработчика.
    await expect(addToCartButton).toBeVisible({ timeout: 5000 })
    await addToCartButton.click()

    // Ждём подтверждения добавления в корзину
    await expect(page.getByText(/добавлено в корзину|в корзине/i).first()).toBeVisible({ timeout: 5000 })

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
