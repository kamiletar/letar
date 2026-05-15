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

  // Ждём подтверждения добавления (кнопка меняет текст на "Добавлено в корзину ✓")
  await page.getByRole('button', { name: /добавлено в корзину/i }).waitFor({ timeout: 5000 })
  // Next.js App Router после Server Action делает router.refresh() (мягкую навигацию).
  // В Firefox/WebKit она может начаться ПОСЛЕ load, прерывая следующий page.goto.
  // 600мс достаточно чтобы эта мягкая навигация завершилась.
  await page.waitForTimeout(600)
}

test.describe.serial('checkout: оформление заказа', () => {
  test('пустая корзина — редирект на /cart', async ({ page }) => {
    // Новый контекст без корзины — переходим напрямую
    await page.goto(localePath('/checkout'))
    await expect(page).toHaveURL(/\/cart\/?$/, { timeout: 10000 })
  })

  test('форма не оформляет заказ с пустыми полями', async ({ page }) => {
    await addProductToCart(page)
    await page.goto(localePath('/checkout'))

    await page.getByRole('button', { name: /перейти к оплате/i }).click()

    // Браузерная HTML5-валидация перехватывает submit до JS → форма остаётся на /checkout
    await page.waitForTimeout(300)
    await expect(page).toHaveURL(/\/checkout\/?$/)
  })

  test('оформление заказа с ручным заполнением адреса (без DaData)', async ({ page }) => {
    // Тест 2 оформил заказ → корзина пуста → добавляем новый товар
    await addProductToCart(page)
    await page.goto(localePath('/checkout'))

    // click() перед fill() триггерит React selective hydration в WebKit
    const nameInput = page.getByRole('textbox', { name: 'ФИО получателя' })
    await nameInput.click()
    await nameInput.fill('Иван Тестов')
    await nameInput.press('Tab')

    const emailInput = page.getByRole('textbox', { name: 'Email' })
    await emailInput.fill('test@example.com')
    await emailInput.press('Tab')

    // Phone mask '+7 (999) 999-99-99' — pressSequentially для корректной работы с маской
    const phoneInput = page.getByRole('textbox', { name: 'Телефон' })
    await phoneInput.click()
    await phoneInput.pressSequentially('9001234567')
    await phoneInput.press('Tab')

    // Способ доставки — Согласовать с менеджером (MANAGER_CALL)
    await page.locator('input[name="shippingMethod"][value="MANAGER_CALL"]').check()

    // Адрес вручную (DaData поле address.fullAddress — опциональное, пропускаем)
    const regionInput = page.getByRole('textbox', { name: 'Регион / область' })
    await regionInput.fill('Москва')
    await regionInput.press('Tab')

    const cityInput = page.getByRole('textbox', { name: 'Город' })
    await cityInput.fill('Москва')
    await cityInput.press('Tab')

    const streetInput = page.getByRole('textbox', { name: 'Улица' })
    await streetInput.fill('Тверская')
    await streetInput.press('Tab')

    const buildingInput = page.getByRole('textbox', { name: 'Дом' })
    await buildingInput.fill('1')
    await buildingInput.press('Tab')

    const postalInput = page.getByPlaceholder('123456')
    await postalInput.fill('125009')
    // Ждём завершения дебаунс 500мс расчёта стоимости доставки
    await page.waitForTimeout(600)

    await page.getByRole('button', { name: /перейти к оплате/i }).click()

    // Принимаем два исхода:
    // 1) TBANK_TERMINAL_KEY пустой (Playwright запустил сервер сам) → success страница
    // 2) TBANK_TERMINAL_KEY задан в .env.local (сервер запущен вручную) → редирект на T-Bank
    // Оба исхода означают успешное создание заказа
    await page.waitForURL(
      (url) =>
        /\/checkout\/success\/ORD-\d{8}-\d{5}/.test(url.pathname)
        || url.hostname.includes('tbank.ru')
        || url.hostname.includes('tinkoff.ru'),
      { timeout: 30000 },
    )
    const finalUrl = page.url()
    if (!finalUrl.includes('tbank.ru') && !finalUrl.includes('tinkoff.ru')) {
      await expect(page).toHaveURL(/\/checkout\/success\/ORD-\d{8}-\d{5}\/?$/)
    }
  })

  test('невалидный email показывает ошибку, корректный её убирает', async ({ page }) => {
    // Тест 3 оформил заказ → корзина конвертирована → нужен новый товар
    await addProductToCart(page)
    await page.goto(localePath('/checkout'))

    const emailInput = page.getByRole('textbox', { name: 'Email' })
    await emailInput.click()
    await emailInput.fill('не-email')

    await page.getByRole('button', { name: /перейти к оплате/i }).click()
    await expect(page.getByText('Некорректный email')).toBeVisible()

    // Исправляем email — TanStack Form валидирует on-change после первого сабмита
    await emailInput.click()
    await emailInput.fill('valid@example.com')
    await expect(page.getByText('Некорректный email')).not.toBeVisible({ timeout: 3000 })
  })

  test('DaData автоподсказки — выбор адреса заполняет поле', async ({ page }) => {
    // DaData — клиентский fetch, перехватываем через page.route()
    await page.route('**/suggestions.dadata.ru/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestions: [
            { value: 'г Москва, ул Тверская, д 1', data: {} },
            { value: 'г Москва, ул Тверская, д 2', data: {} },
          ],
        }),
      })
    })

    await addProductToCart(page)
    await page.goto(localePath('/checkout'))

    // Поле DaData видно только при не-CDEK_POINT методах — переключаем на MANAGER_CALL
    await page.locator('input[name="shippingMethod"][value="MANAGER_CALL"]').check()

    const addressInput = page.getByPlaceholder('Начните вводить — подсказки от DaData')
    await addressInput.click()
    await addressInput.fill('Тверская')

    // Ждём подсказок (дебаунс 300мс по умолчанию в компоненте)
    const firstSuggestion = page.getByText('г Москва, ул Тверская, д 1')
    await firstSuggestion.waitFor({ state: 'visible', timeout: 5000 })
    await firstSuggestion.click()

    // valueOnly=true → field.handleChange(suggestion.value) → input обновляется
    await expect(addressInput).toHaveValue('г Москва, ул Тверская, д 1')
  })

  test('CDEK_POINT: кнопка оплаты без выбора ПВЗ показывает ошибку', async ({ page }) => {
    // Каждый тест получает свежий browser context (новые cookies) — добавляем товар заново
    await addProductToCart(page)
    await page.goto(localePath('/checkout'))

    // CDEK_POINT выбран по умолчанию — проверяем на всякий случай
    const cdekRadio = page.locator('input[name="shippingMethod"][value="CDEK_POINT"]')
    await cdekRadio.waitFor({ state: 'attached', timeout: 10000 })
    if (!(await cdekRadio.isChecked())) {
      await cdekRadio.check()
    }

    // Заполняем только контактные данные — ПВЗ НЕ выбираем
    const nameInput = page.getByRole('textbox', { name: 'ФИО получателя' })
    await nameInput.click()
    await nameInput.fill('Иван Тестов')
    await nameInput.press('Tab')

    const emailInput = page.getByRole('textbox', { name: 'Email' })
    await emailInput.click()
    await emailInput.fill('test@example.com')
    await emailInput.press('Tab')

    const phoneInput = page.getByRole('textbox', { name: 'Телефон' })
    await phoneInput.click()
    await phoneInput.pressSequentially('9001234567')
    await phoneInput.press('Tab')

    await page.getByRole('button', { name: /перейти к оплате/i }).click()

    // Ожидаем ошибку валидации — ПВЗ не выбран
    await expect(page.getByText('Выберите пункт выдачи СДЭК')).toBeVisible({ timeout: 5000 })
    // URL остаётся /checkout — форма не отправилась
    await expect(page).toHaveURL(/\/checkout\/?$/)
  })

  test('CDEK_POINT: полный флоу — поиск города → ПВЗ → успешное оформление', async ({ page }) => {
    // Тест 6 показал ошибку и не сабмитил → товар из теста 4 всё ещё в корзине.
    // Добавляем ещё один товар для надёжности (корзина может суммироваться).
    await addProductToCart(page)
    await page.goto(localePath('/checkout'))

    // CDEK_POINT должен быть выбран по умолчанию
    const cdekRadio = page.locator('input[name="shippingMethod"][value="CDEK_POINT"]')
    await cdekRadio.waitFor({ state: 'attached', timeout: 10000 })
    if (!(await cdekRadio.isChecked())) {
      await cdekRadio.check()
    }

    // Заполняем контактные данные
    const nameInput = page.getByRole('textbox', { name: 'ФИО получателя' })
    await nameInput.click()
    await nameInput.fill('Иван Тестов')
    await nameInput.press('Tab')

    const emailInput = page.getByRole('textbox', { name: 'Email' })
    await emailInput.click()
    await emailInput.fill('test@example.com')
    await emailInput.press('Tab')

    const phoneInput = page.getByRole('textbox', { name: 'Телефон' })
    await phoneInput.click()
    await phoneInput.pressSequentially('9001234567')
    await phoneInput.press('Tab')

    // PVZ picker: вводим "Мос" → ждём подсказку "Москва" → кликаем
    // CDEK_MOCK_MODE=true → searchCdekCities('Мос') возвращает [{city:'Москва', code:44, ...}]
    const cityInput = page.getByPlaceholder('Начните вводить город...')
    await cityInput.waitFor({ state: 'visible', timeout: 10000 })
    await cityInput.click()
    await cityInput.fill('Мос')

    const moscowSuggestion = page.getByText('Москва', { exact: false })
    await moscowSuggestion.first().waitFor({ state: 'visible', timeout: 5000 })
    await moscowSuggestion.first().click()

    // Ждём загрузки списка ПВЗ (server action + CDEK_MOCK_MODE возвращает 20 mock ПВЗ)
    // /ПВЗ [А-Я]/ точно матчит "ПВЗ Красная Пресня" и не матчит заголовок "Выберите пункт выдачи СДЭК"
    const anyPvzItem = page.getByText(/ПВЗ [А-Я]/).first()
    await anyPvzItem.waitFor({ state: 'visible', timeout: 8000 })

    // Кликаем на первый ПВЗ → ждём зелёный блок подтверждения
    await anyPvzItem.click()
    const confirmBlock = page.getByText('Выбранный пункт выдачи:')
    await confirmBlock.waitFor({ state: 'visible', timeout: 8000 })
    await expect(confirmBlock).toBeVisible()

    // consentAccepted имеет defaultValue: true → не нужно кликать явно
    await page.getByRole('button', { name: /перейти к оплате/i }).click()

    // Принимаем два исхода:
    // 1) TBANK_TERMINAL_KEY пустой (Playwright запустил сервер сам) → success страница
    // 2) TBANK_TERMINAL_KEY задан в .env.local (сервер запущен вручную) → редирект на T-Bank
    await page.waitForURL(
      (url) =>
        /\/checkout\/success\/ORD-\d{8}-\d{5}/.test(url.pathname)
        || url.hostname.includes('tbank.ru')
        || url.hostname.includes('tinkoff.ru'),
      { timeout: 30000 },
    )
    const finalUrl = page.url()
    if (!finalUrl.includes('tbank.ru') && !finalUrl.includes('tinkoff.ru')) {
      await expect(page).toHaveURL(/\/checkout\/success\/ORD-\d{8}-\d{5}\/?$/)
    }
  })
})
