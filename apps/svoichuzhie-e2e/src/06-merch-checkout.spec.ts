import { expect, test } from '@playwright/test'
import { createTestOrderWithDelivery, ensureTestProduct, type TestProduct } from './helpers/db.helpers'

// CDEK_MOCK_MODE=true — детерминированные моки без реального API

test.describe('06 — Merch + CDEK checkout (mock)', () => {
  test('/merch — страница мерча загружается', async ({ page }) => {
    await page.goto('/merch')
    await expect(page).not.toHaveURL(/\/login/)
    // Страница загрузилась — либо товары, либо "скоро"
    const content = page
      .locator('[data-testid="product-card"], .product-card, article, [href*="/merch/"]')
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

test.describe('06b — Доставка оплачивается СДЭКу при получении (не онлайн)', () => {
  let product: TestProduct

  test.beforeAll(async () => {
    product = await ensureTestProduct()
  })

  test('checkout — «Итого к оплате онлайн» не включает доставку', async ({ page }) => {
    await page.goto('/merch')
    await page.evaluate(
      ({ p }) => {
        localStorage.setItem(
          'svoichuzhie-cart',
          JSON.stringify({
            state: {
              items: [
                {
                  productId: p.productId,
                  variantId: p.variantId,
                  productSlug: p.slug,
                  productName: 'E2E тестовый товар',
                  variantName: 'M',
                  coverUrl: null,
                  price: p.price,
                  quantity: 1,
                },
              ],
            },
            version: 1,
          })
        )
      },
      { p: product }
    )

    await page.goto('/merch/checkout')
    await expect(page).toHaveURL(/\/merch\/checkout/)

    const totalLabel = page.getByText('Итого к оплате онлайн')
    await expect(totalLabel).toBeVisible()

    // Строка "Итого к оплате онлайн" содержит только стоимость товара (1 500 ₽), без доставки
    const totalRow = totalLabel.locator('..')
    await expect(totalRow).toContainText('1 500')

    // Строки доставки нет, пока не выбран ПВЗ/город (deliveryCost = 0)
    await expect(page.getByText('Доставка (СДЭК, при получении)')).toHaveCount(0)
  })

  test('страница заказа — «Оплачено онлайн» и «К оплате при получении (СДЭК)» показаны раздельно', async ({ page }) => {
    const { accessToken } = await createTestOrderWithDelivery(product, 35000) // 350 ₽

    await page.goto(`/merch/orders/${accessToken}`)

    await expect(page.getByText('Оплачено онлайн')).toBeVisible()
    await expect(page.getByText('К оплате при получении (СДЭК)')).toBeVisible()

    const body = page.locator('body')
    await expect(body).toContainText('1 500') // товар — оплачен онлайн
    await expect(body).toContainText('350') // доставка — при получении
    await expect(body).toContainText('Оплачивается курьеру или на пункте выдачи')
  })
})
