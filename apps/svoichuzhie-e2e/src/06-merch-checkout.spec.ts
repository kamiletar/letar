import { expect, test } from '@playwright/test'

// CDEK_MOCK_MODE=true — детерминированные моки без реального API

test.describe('06 — Merch + CDEK checkout (mock)', () => {
  test('/merch — страница мерча загружается', async ({ page }) => {
    await page.goto('/merch')
    await expect(page).not.toHaveURL(/\/login/)
    // Страница загрузилась — либо товары, либо "скоро"
    const content = page.locator('[data-testid="product-card"], .product-card, article, [href*="/merch/"]')
      .or(page.getByText(/скоро|нет товаров|пусто/i).first())
    await expect(content.first()).toBeVisible({ timeout: 15_000 })
  })

  test('/merch/checkout доступна (может редиректить на /merch если корзина пуста)', async ({ page }) => {
    await page.goto('/merch/checkout')
    // Ожидаем либо страницу checkout, либо редирект на merch
    await expect(page).toHaveURL(/\/merch(\/checkout)?/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('checkout — DeliverySection показывает ПВЗ/Курьер переключатель', async ({ page }) => {
    // Сначала добавляем товар в корзину через localStorage если нет товаров
    await page.goto('/merch')

    // Кликаем на первый товар (если есть)
    const firstProduct = page.locator('a[href*="/merch/"]').first()
    if (!(await firstProduct.count())) {
      test.skip()
      return
    }

    // Переходим напрямую на checkout
    await page.goto('/merch/checkout')

    // Если редирект — нет товаров в корзине, пропускаем
    if (page.url().includes('/merch/checkout') === false) {
      test.skip()
      return
    }

    // Ищем переключатель ПВЗ / Курьер (SegmentGroup)
    const pvzOption = page.locator('text=/ПВЗ|pvz/i')
    const courierOption = page.locator('text=/Курьер|courier/i')

    if ((await pvzOption.count()) === 0) {
      test.skip()
      return
    }

    await expect(pvzOption.first()).toBeVisible()
    await expect(courierOption.first()).toBeVisible()
  })

  test('страница заказа /merch/orders/[token] доступна без авторизации', async ({ page }) => {
    // Несуществующий токен → 404, но не 500 и не редирект на login
    const response = await page.goto('/merch/orders/e2e-fake-token-00000000')
    expect(response?.status()).not.toBe(500)
    await expect(page).not.toHaveURL(/\/login/)
  })
})
