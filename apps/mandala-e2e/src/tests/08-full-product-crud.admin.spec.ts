/**
 * Тесты полного CRUD цикла товаров
 *
 * Проверяем создание, редактирование и удаление товара
 */
import path from 'node:path'
import { expect, test } from '../fixtures/auth.fixture'

// Уникальный timestamp для тестовых данных
const timestamp = Date.now()
const testProductName = `E2E Test Product ${timestamp}`
const testProductPrice = 999
const testProductDescription = 'Тестовое описание товара для E2E'
const updatedProductPrice = 1499

// Путь к тестовому изображению (process.cwd() может вернуть e2e проект, поэтому идём к корню)
const testImagePath = path.resolve(__dirname, '../../../../apps/mandala/public/icons/icon-512.png')

// Сохраняем ID созданного товара для последующих тестов
let createdProductId: string | null = null

test.describe('Админ: Полный CRUD товара', () => {
  test.describe.configure({ mode: 'serial' })

  test.describe('Создание товара', () => {
    test('полный flow создания товара с изображением', async ({ adminPage }) => {
      // Переход на страницу создания
      await adminPage.goto('/admin/products/new', { waitUntil: 'domcontentloaded' })
      await expect(adminPage).toHaveURL(/\/admin\/products\/new/)

      // Ждём загрузки заголовка и формы
      await expect(adminPage.getByRole('heading', { name: /создать товар/i })).toBeVisible({ timeout: 10000 })

      // Заполнение обязательного поля name (textbox с placeholder "Введите название")
      const nameInput = adminPage.getByPlaceholder(/введите название/i)
      await expect(nameInput).toBeVisible({ timeout: 10000 })
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

      // Ожидание превью изображения
      await adminPage.waitForTimeout(2000) // Ждём upload

      // Клик "Создать товар"
      await adminPage.getByRole('button', { name: /создать товар/i }).click()

      // Проверка редиректа на страницу товара (может быть /edit или просто /:id)
      await expect(adminPage).toHaveURL(/\/admin\/products\/[^/]+/, { timeout: 15000 })
      // Убедимся что это не страница /new
      await adminPage.waitForURL((url) => !url.pathname.endsWith('/new'), { timeout: 5000 })

      // Сохраняем ID товара из URL (с или без /edit)
      const url = adminPage.url()
      const match = url.match(/\/admin\/products\/([^/]+)(?:\/edit)?$/)
      if (match) {
        createdProductId = match[1]
      }

      expect(createdProductId).toBeTruthy()
    })

    test('созданный товар отображается в списке', async ({ adminPage }) => {
      // Переход напрямую с параметром поиска — обходим проблему с клиентской навигацией
      const encodedSearch = encodeURIComponent(testProductName)
      await adminPage.goto(`/admin/products?q=${encodedSearch}`, { waitUntil: 'domcontentloaded' })
      await expect(adminPage).toHaveURL(/\/admin\/products/)

      // Ждём загрузки таблицы
      const table = adminPage.getByRole('table')
      await expect(table).toBeVisible({ timeout: 10000 })

      // Проверка что тестовый товар есть в списке
      await expect(adminPage.getByText(testProductName)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Редактирование товара', () => {
    test('изменение цены товара', async ({ adminPage }) => {
      // Переход на страницу редактирования
      expect(createdProductId).toBeTruthy()
      await adminPage.goto(`/admin/products/${createdProductId}/edit`, { waitUntil: 'domcontentloaded' })
      await expect(adminPage).toHaveURL(/\/admin\/products\/[^/]+\/edit/)

      // Изменение цены через spinbutton
      const priceSpinbutton = adminPage.getByRole('spinbutton', { name: /цена/i })
      if ((await priceSpinbutton.count()) > 0) {
        await priceSpinbutton.fill(updatedProductPrice.toString())
      }

      // Клик "Обновить товар"
      await adminPage.getByRole('button', { name: /обновить товар/i }).click()

      // Ждём завершения обновления (остаёмся на странице или редирект)
      await adminPage.waitForTimeout(2000)

      // Проверяем что нет ошибок валидации
      const errorMessage = adminPage.getByText(/ошибка|error|неверн/i)
      const hasError = await errorMessage.isVisible().catch(() => false)
      expect(hasError).toBeFalsy()
    })
  })

  test.describe('Удаление товара', () => {
    test('удаление тестового товара', async ({ adminPage }) => {
      expect(createdProductId).toBeTruthy()
      await adminPage.goto(`/admin/products/${createdProductId}/edit`, { waitUntil: 'domcontentloaded' })
      await expect(adminPage).toHaveURL(/\/admin\/products\/[^/]+\/edit/)

      // Ждём загрузки страницы редактирования
      await expect(adminPage.getByRole('button', { name: /обновить товар/i })).toBeVisible({ timeout: 10000 })

      // Клик "Удалить товар" — это form submit без диалога подтверждения
      await adminPage.getByRole('button', { name: /удалить товар/i }).click()

      // Проверка редиректа на список товаров
      await expect(adminPage).toHaveURL(/\/admin\/products$/, { timeout: 15000 })

      // Проверка что товар удалён из списка
      await expect(adminPage.getByText(testProductName)).not.toBeVisible({ timeout: 5000 })
    })
  })
})
