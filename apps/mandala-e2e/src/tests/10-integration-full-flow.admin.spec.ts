/**
 * Интеграционный тест: полный flow от создания товара до управления заказом
 *
 * Сценарий:
 * 1. Админ создаёт тестовый товар
 * 2. Гость добавляет товар в корзину
 * 3. Гость оформляет заказ
 * 4. Админ видит заказ и меняет статус
 * 5. Cleanup: удаление тестового товара
 */
import { expect, test as base } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { ADMIN_STORAGE_STATE } from '../fixtures/storage-state'
import { SLOW_ACTION_TIMEOUT } from '../fixtures/timeouts'

// Уникальные данные для теста
const timestamp = Date.now()
const testProductName = `Integration Test Product ${timestamp}`
const testProductPrice = 777
const testProductDescription = 'Интеграционный тест - товар для полного flow'

const testCustomer = {
  name: 'Интеграционный Тест',
  phone: '+79009876543',
  email: `integration-${timestamp}@example.com`,
  address: 'г. Санкт-Петербург, пр. Тестовый, д. 42',
}

// Путь к тестовому изображению (process.cwd() может вернуть e2e проект, поэтому идём к корню)
const testImagePath = path.resolve(__dirname, '../../../../apps/mandala/public/icons/icon-512.png')

// Сохраняем данные между тестами
let createdProductSlug: string | null = null
let createdProductId: string | null = null
let createdOrderId: string | null = null

// Проверяем наличие файла авторизации админа
const hasAdminAuth = () => {
  try {
    return fs.existsSync(ADMIN_STORAGE_STATE)
  } catch {
    return false
  }
}

// Закрытие PWA оффлайн-уведомления если оно появилось
async function dismissOfflinePrompt(page: import('@playwright/test').Page) {
  await page.waitForTimeout(1000)
  const notNowButton = page.getByRole('button', { name: /не сейчас/i })
  if ((await notNowButton.count()) > 0) {
    await notNowButton.click()
    await page.waitForTimeout(500)
  }
}

// Расширяем базовый тест для поддержки админа и гостя
const test = base.extend<{
  adminPage: import('@playwright/test').Page
  guestPage: import('@playwright/test').Page
}>({
  // Админ-страница с авторизацией
  adminPage: async ({ browser }, use) => {
    if (!hasAdminAuth()) {
      test.skip(true, 'Нет файла авторизации админа')
      return
    }
    const context = await browser.newContext({ storageState: ADMIN_STORAGE_STATE })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  // Гостевая страница без авторизации
  guestPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

test.describe('Интеграционный flow: товар → заказ → управление', () => {
  test.describe.configure({ mode: 'serial' })

  test('1. Админ создаёт тестовый товар', async ({ adminPage }) => {
    // Переход на страницу создания товара
    await adminPage.goto('/admin/products/new', { waitUntil: 'domcontentloaded' })
    await expect(adminPage).toHaveURL(/\/admin\/products\/new/)

    // Ждём загрузки формы (textbox с placeholder "Введите название")
    const nameInput = adminPage.getByPlaceholder(/введите название/i)
    await expect(nameInput).toBeVisible({ timeout: 10000 })

    // Заполнение формы товара
    await nameInput.fill(testProductName)

    // Заполнение цены (spinbutton с лейблом "Цена (₽)")
    const priceInput = adminPage.getByRole('spinbutton', { name: /цена/i })
    await expect(priceInput).toBeVisible({ timeout: 5000 })
    await priceInput.fill(testProductPrice.toString())

    // Заполнение описания
    const descriptionInput = adminPage.locator('textarea').first()
    if ((await descriptionInput.count()) > 0) {
      await descriptionInput.fill(testProductDescription)
    }

    // Загрузка изображения
    const fileInput = adminPage.locator('input[type="file"]').first()
    await fileInput.setInputFiles(testImagePath)

    // Ждём реального завершения загрузки, а не фиксированную паузу — под
    // параллельной e2e-нагрузкой на staging загрузка может занять больше 2с
    // (см. тот же фикс в 07-full-mandala-crud.admin.spec.ts), а локально к этому добавляется
    // компиляция самого /api/upload на dev-сервере (см. fixtures/timeouts.ts)
    await expect(adminPage.getByRole('button', { name: /удалить/i }).first()).toBeVisible({
      timeout: SLOW_ACTION_TIMEOUT,
    })

    // Создание товара
    await adminPage.getByRole('button', { name: /создать товар/i }).click()

    // Ждём редиректа на страницу товара (может быть /edit или просто /:id)
    await expect(adminPage).toHaveURL(/\/admin\/products\/[^/]+/, { timeout: SLOW_ACTION_TIMEOUT })
    // Убедимся что это не страница /new
    // Редирект после Server Action может занимать больше 5с — под параллельной e2e-нагрузкой
    // на общий staging-контейнер (см. nextjs-server-action-redirect-race.md) и на компиляции
    // action'а с целевой страницей локально
    await adminPage.waitForURL((url) => !url.pathname.endsWith('/new'), { timeout: SLOW_ACTION_TIMEOUT })

    // Сохраняем ID товара (с или без /edit)
    const url = adminPage.url()
    const match = url.match(/\/admin\/products\/([^/]+)(?:\/edit)?$/)
    if (match) {
      createdProductId = match[1]
    }

    expect(createdProductId).toBeTruthy()

    // Переходим на страницу редактирования для получения slug
    await adminPage.goto(`/admin/products/${createdProductId}/edit`, { waitUntil: 'domcontentloaded' })

    // Ждём загрузки формы
    const editNameInput = adminPage.getByPlaceholder(/введите название/i)
    await expect(editNameInput).toBeVisible({ timeout: 10000 })

    // Получаем slug товара из формы (textbox с placeholder "auto-generated-slug")
    const slugInput = adminPage.getByPlaceholder(/auto-generated-slug/i)
    if ((await slugInput.count()) > 0) {
      createdProductSlug = await slugInput.inputValue()
    } else {
      // Fallback: используем ID как slug
      createdProductSlug = createdProductId
    }

    expect(createdProductSlug).toBeTruthy()
  })

  test('2. Гость добавляет товар в корзину', async ({ guestPage }) => {
    expect(createdProductSlug).toBeTruthy()

    // Переход на страницу товара
    await guestPage.goto(`/shop/${createdProductSlug}`)
    await expect(guestPage).toHaveURL(new RegExp(`/shop/${createdProductSlug}`))

    // Закрываем PWA уведомление если есть
    await dismissOfflinePrompt(guestPage)

    // Проверяем что товар отображается
    await expect(guestPage.getByText(testProductName)).toBeVisible()

    // Добавляем в корзину
    const addToCartButton = guestPage.locator('button:has-text("Добавить в корзину")')
    await addToCartButton.click()

    // Проверяем подтверждение (button text changes to "В корзине")
    const inCartButton = guestPage.locator('button:has-text("В корзине")')
    await expect(inCartButton).toBeVisible({ timeout: 5000 })
  })

  test('3. Гость оформляет заказ', async ({ guestPage }) => {
    test.setTimeout(60000) // Увеличиваем timeout для этого теста
    expect(createdProductSlug).toBeTruthy()

    // Сначала добавляем товар в корзину (новый context, корзина пустая)
    await guestPage.goto(`/shop/${createdProductSlug}`, { waitUntil: 'domcontentloaded' })

    // Закрываем PWA уведомление если есть
    await dismissOfflinePrompt(guestPage)

    const addToCartBtn = guestPage.locator('button:has-text("Добавить в корзину")')
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 })
    await addToCartBtn.click()

    // Ждём подтверждения добавления (button text changes)
    const inCartBtn = guestPage.locator('button:has-text("В корзине")')
    await expect(inCartBtn).toBeVisible({ timeout: 5000 })

    // Переход в checkout
    await guestPage.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await expect(guestPage).toHaveURL(/\/checkout/)

    // Ждём загрузки формы (TanStack Form с Chakra Field использует aria-label)
    const nameField = guestPage.getByRole('textbox', { name: /имя/i })
    await expect(nameField).toBeVisible({ timeout: 10000 })

    // Заполняем форму
    await nameField.fill(testCustomer.name)
    await guestPage.getByRole('textbox', { name: /телефон/i }).fill(testCustomer.phone)

    // Email, Address, Comment - опциональные поля без лейблов
    // Используем порядок textbox: 0=name, 1=phone, 2=email, 3=address, 4=comment
    const textboxes = guestPage.getByRole('textbox')
    await textboxes.nth(2).fill(testCustomer.email)
    await textboxes.nth(3).fill(testCustomer.address)

    // Оформляем заказ
    await guestPage.getByRole('button', { name: /оформить заказ/i }).click()

    // Проверяем успех
    await expect(guestPage).toHaveURL(/\/checkout\/success/, { timeout: 15000 })

    // Сохраняем ID заказа из URL
    const url = guestPage.url()
    const searchParams = new URLSearchParams(new URL(url).search)
    createdOrderId = searchParams.get('orderId')

    expect(createdOrderId).toBeTruthy()
  })

  test('4. Админ видит заказ и меняет статус', async ({ adminPage }) => {
    // Переход в список заказов
    await adminPage.goto('/admin/orders', { waitUntil: 'domcontentloaded' })
    await expect(adminPage).toHaveURL(/\/admin\/orders/)

    // Ждём загрузки списка заказов
    await adminPage.waitForTimeout(1000)

    // Проверяем что есть заказы (ищем ссылки на детали заказов)
    const orderLinks = adminPage.locator('a[href^="/admin/orders/"]')
    await expect(orderLinks.first()).toBeVisible({ timeout: 10000 })

    // Открываем первый заказ
    await orderLinks.first().click()
    await expect(adminPage).toHaveURL(/\/admin\/orders\/[^/]+/)

    // Ждём загрузки страницы деталей заказа
    await expect(adminPage.getByRole('heading', { name: /заказ/i })).toBeVisible({ timeout: 10000 })

    // Меняем статус на "Подтверждён" (с буквой ё!)
    const confirmButton = adminPage.getByRole('button', { name: /подтвержд[её]н/i })
    await expect(confirmButton).toBeVisible({ timeout: 5000 })

    const isDisabled = await confirmButton.isDisabled().catch(() => true)

    if (!isDisabled) {
      await confirmButton.click()

      // Ждём обновления статуса
      await adminPage.waitForTimeout(2000)

      // Проверяем что нет ошибок
      const hasErrors = await adminPage
        .getByText(/ошибка|error|не удалось/i)
        .isVisible()
        .catch(() => false)
      expect(hasErrors).toBeFalsy()
    }
  })

  test('5. Cleanup: удаление тестового товара', async ({ adminPage }) => {
    // Этот тест может не пройти если есть заказ с этим товаром (FK constraint)
    // Это ожидаемое поведение для production, но для теста мы просто пропускаем cleanup

    expect(createdProductId).toBeTruthy()

    // Сначала попробуем удалить заказ (если он был создан)
    if (createdOrderId) {
      await adminPage.goto(`/admin/orders/${createdOrderId}`, { waitUntil: 'domcontentloaded' })
      // Попытка отменить заказ (опционально)
      const cancelButton = adminPage.getByRole('button', { name: /отмен[её]н/i })
      if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        const isDisabled = await cancelButton.isDisabled().catch(() => true)
        if (!isDisabled) {
          await cancelButton.click()
          await adminPage.waitForTimeout(1000)
        }
      }
    }

    // Переход на страницу редактирования товара
    await adminPage.goto(`/admin/products/${createdProductId}/edit`, { waitUntil: 'domcontentloaded' })
    await expect(adminPage).toHaveURL(/\/admin\/products\/[^/]+\/edit/)

    // Ждём загрузки страницы редактирования
    await expect(adminPage.getByRole('button', { name: /обновить товар/i })).toBeVisible({ timeout: 10000 })

    // Удаление товара — это form submit без диалога подтверждения
    await adminPage.getByRole('button', { name: /удалить товар/i }).click()

    // Ждём завершения запроса
    await adminPage.waitForTimeout(2000)

    // Проверяем результат — либо редирект, либо остались на странице (FK constraint error)
    const currentUrl = adminPage.url()
    if (currentUrl.includes('/edit')) {
      // Не удалось удалить (FK constraint) — это ОК для интеграционного теста
      // Товар связан с заказом и не может быть удалён
      console.log('Товар не удалён — есть связанный заказ (FK constraint)')
    } else {
      // Редирект на список товаров
      await expect(adminPage).toHaveURL(/\/admin\/products$/)
      await expect(adminPage.getByText(testProductName)).not.toBeVisible({ timeout: 5000 })
    }
  })
})
