import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

import { localePath } from './config/i18n'

/**
 * Добавляет первый доступный товар из каталога в корзину.
 * Предусловие: в БД есть хотя бы один опубликованный продукт.
 */
async function addProductToCart(page: Page) {
  await page.goto(localePath('/catalog'))
  const productLink = page.locator('a[href*="/catalog/"]').first()
  await productLink.waitFor({ state: 'visible', timeout: 15000 })
  await productLink.click()
  await page.waitForLoadState('domcontentloaded')

  const addBtn = page.getByRole('button', { name: /в корзину/i })
  await addBtn.waitFor({ state: 'visible', timeout: 10000 })
  await addBtn.click()

  await page.getByRole('button', { name: /добавлено в корзину/i }).waitFor({ timeout: 5000 })
  // Next.js App Router после Server Action делает router.refresh() — ждём мягкую навигацию
  await page.waitForTimeout(600)
}

/**
 * Переходит на /checkout и открывает секцию выбора ПВЗ.
 * Предусловие: корзина не пустая (иначе редирект на /cart).
 */
async function gotoCheckoutWithPvz(page: Page) {
  await page.goto(localePath('/checkout'))
  // CDEK_POINT должен быть выбран по умолчанию — проверяем и явно кликаем для надёжности
  const cdekRadio = page.locator('input[name="shippingMethod"][value="CDEK_POINT"]')
  await cdekRadio.waitFor({ state: 'attached', timeout: 10000 })
  if (!(await cdekRadio.isChecked())) {
    await cdekRadio.check()
  }
}

test.describe.serial('pvz-picker: компонент выбора пункта выдачи СДЭК', () => {
  test('поиск города показывает подсказки из CDEK мока', async ({ page }) => {
    // Первый тест — корзина пуста, добавляем товар
    await addProductToCart(page)
    await gotoCheckoutWithPvz(page)

    const cityInput = page.getByPlaceholder('Начните вводить город...')
    await cityInput.waitFor({ state: 'visible', timeout: 10000 })

    // click() перед fill() — критично для WebKit (selective hydration)
    await cityInput.click()
    await cityInput.fill('Мос')

    // CDEK_MOCK_MODE=true → searchCdekCities('Мос') возвращает [{city:'Москва', ...}]
    const moscowSuggestion = page.getByText('Москва', { exact: false })
    await moscowSuggestion.first().waitFor({ state: 'visible', timeout: 5000 })
    await expect(moscowSuggestion.first()).toBeVisible()
  })

  test('выбор города из дропдауна загружает список ПВЗ и Leaflet-карту', async ({ page }) => {
    // Каждый тест получает свежий browser context (новые cookies) — добавляем товар заново
    await addProductToCart(page)
    await gotoCheckoutWithPvz(page)

    const cityInput = page.getByPlaceholder('Начните вводить город...')
    await cityInput.waitFor({ state: 'visible', timeout: 10000 })
    await cityInput.click()
    await cityInput.fill('Мос')

    const moscowSuggestion = page.getByText('Москва', { exact: false })
    await moscowSuggestion.first().waitFor({ state: 'visible', timeout: 5000 })
    await moscowSuggestion.first().click()

    // Список ПВЗ появляется через server action — даём время
    // CDEK_MOCK_MODE: getDeliveryPoints(44) возвращает 20 mock ПВЗ
    const pvzList = page.locator('[data-testid="pvz-list"], ul, ol').filter({
      has: page.locator('li'),
    })
    // Ждём хотя бы один элемент ПВЗ в списке
    const anyPvzItem = page
      .getByText(/ПВЗ/, { exact: false })
      .or(page.getByText(/пункт выдачи/i))
      .first()
    await anyPvzItem.waitFor({ state: 'visible', timeout: 8000 })
    await expect(anyPvzItem).toBeVisible()

    // Leaflet грузится через dynamic import с SSR disabled — ждём контейнер
    const leafletMap = page.locator('.leaflet-container')
    await leafletMap.waitFor({ state: 'visible', timeout: 10000 })
    await expect(leafletMap).toBeVisible()
  })

  test('клик по ПВЗ в списке показывает зелёный блок подтверждения', async ({ page }) => {
    // Каждый тест получает свежий browser context (новые cookies) — добавляем товар заново
    await addProductToCart(page)
    await gotoCheckoutWithPvz(page)

    const cityInput = page.getByPlaceholder('Начните вводить город...')
    await cityInput.waitFor({ state: 'visible', timeout: 10000 })
    await cityInput.click()
    await cityInput.fill('Мос')

    const moscowSuggestion = page.getByText('Москва', { exact: false })
    await moscowSuggestion.first().waitFor({ state: 'visible', timeout: 5000 })
    await moscowSuggestion.first().click()

    // Ждём загрузки ПВЗ
    const anyPvzItem = page
      .getByText(/ПВЗ/, { exact: false })
      .or(page.getByText(/пункт выдачи/i))
      .first()
    await anyPvzItem.waitFor({ state: 'visible', timeout: 8000 })

    // Кликаем на первый ПВЗ в списке.
    // Используем /ПВЗ [А-Я]/ а не /пункт выдачи/i — иначе матчим заголовок
    // "Выберите пункт выдачи СДЭК", который стоит раньше в DOM чем список ПВЗ.
    const firstPvzItem = page.getByText(/ПВЗ [А-Я]/).first()
    await firstPvzItem.waitFor({ state: 'visible', timeout: 8000 })
    await firstPvzItem.click()

    // Зелёный блок подтверждения с текстом "Выбранный пункт выдачи:"
    const confirmBlock = page.getByText('Выбранный пункт выдачи:')
    await confirmBlock.waitFor({ state: 'visible', timeout: 8000 })
    await expect(confirmBlock).toBeVisible()
  })

  test('геолокация без разрешения показывает понятную ошибку', async ({ page }) => {
    // По умолчанию в Playwright geolocation не разрешён — браузер вернёт PermissionDenied
    // Каждый тест получает свежий browser context (новые cookies) — добавляем товар заново
    await addProductToCart(page)
    await gotoCheckoutWithPvz(page)

    const geoBtn = page.getByTitle('Определить город по геолокации')
    await geoBtn.waitFor({ state: 'visible', timeout: 10000 })
    await geoBtn.click()

    // При отказе геолокации → сообщение об ошибке под кнопкой
    const geoError = page.getByText('Доступ к геолокации запрещён — введите город вручную')
    await geoError.waitFor({ state: 'visible', timeout: 8000 })
    await expect(geoError).toBeVisible()
  })

  // Отдельный describe с test.use для переопределения настроек геолокации
  test.describe('геолокация с разрешением (Москва)', () => {
    test.use({
      geolocation: { latitude: 55.7558, longitude: 37.6176 },
      permissions: ['geolocation'],
    })

    test('кнопка показывает "Геолокация…" и завершает поиск', async ({ page }) => {
      // Этот тест имеет отдельный контекст из-за test.use — корзина пуста, добавляем товар
      await addProductToCart(page)
      await gotoCheckoutWithPvz(page)

      const geoBtn = page.getByTitle('Определить город по геолокации')
      await geoBtn.waitFor({ state: 'visible', timeout: 10000 })
      await geoBtn.click()

      // Кнопка должна сменить текст на "Геолокация…" (первая фаза)
      await expect(page.getByText(/геолокация…/i)).toBeVisible({ timeout: 3000 })

      // После "Геолокация…" идёт "Ищем…" (реверс-геокодинг через Nominatim)
      // Затем либо "Найден" (успех) либо ошибка (Nominatim внешний — принимаем оба исхода)
      // Ждём завершения — исчезновения "Ищем…" или "Геолокация…"
      await expect(
        page.getByText(/ищем…/i).or(page.getByText(/геолокация…/i)),
      ).not.toBeVisible({ timeout: 15000 })

      // Финальное состояние: "Найден" (успех) или сообщение об ошибке (Nominatim недоступен)
      const successState = page.getByText(/найден/i)
      const errorState = page.getByText(/не удалось определить/i)
      const eitherVisible = (await successState.isVisible()) || (await errorState.isVisible())

      // Принимаем любой из двух исходов — тест проверяет сам механизм, не внешний API
      expect(eitherVisible).toBeTruthy()
    })
  })
})
