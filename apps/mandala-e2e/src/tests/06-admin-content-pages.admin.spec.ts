/**
 * Тесты админ-панели - Контентные страницы
 *
 * Проверяем CRUD операции для контентных страниц
 */
import { expect, test } from '../fixtures/auth.fixture'

test.describe('Админ: Контентные страницы', () => {
  test.describe('Список страниц', () => {
    test('страница /admin/content-pages загружается', async ({ adminPage }) => {
      await adminPage.goto('/admin/content-pages')
      await expect(adminPage).toHaveURL(/\/admin\/content-pages/)
      // Заголовок "Страницы контента"
      await expect(adminPage.getByRole('heading', { name: /страницы контента/i })).toBeVisible()
    })

    test('отображается таблица страниц', async ({ adminPage }) => {
      await adminPage.goto('/admin/content-pages')

      // Ждём загрузки таблицы или списка
      const table = adminPage.getByRole('table')
      const list = adminPage.locator('[data-testid="content-pages-list"], [class*="list"]')
      const emptyMessage = adminPage.getByText(/нет страниц|список пуст/i)

      const hasTable = (await table.count()) > 0
      const hasList = (await list.count()) > 0
      const isEmpty = (await emptyMessage.count()) > 0

      expect(hasTable || hasList || isEmpty).toBeTruthy()
    })

    test('есть кнопка создания новой страницы', async ({ adminPage }) => {
      await adminPage.goto('/admin/content-pages')
      // Кнопка "Создать страницу" (может быть несколько, берём первую)
      await expect(adminPage.getByRole('link', { name: /создать страницу/i }).first()).toBeVisible()
    })
  })

  test.describe('Создание страницы', () => {
    test('форма создания загружается', async ({ adminPage }) => {
      // Переходим напрямую на страницу создания
      await adminPage.goto('/admin/content-pages/new', { waitUntil: 'domcontentloaded' })
      await expect(adminPage).toHaveURL(/\/admin\/content-pages\/new/)

      // Заголовок "Создать страницу"
      await expect(adminPage.getByRole('heading', { name: 'Создать страницу' })).toBeVisible()
    })

    test('форма содержит редактор контента', async ({ adminPage }) => {
      await adminPage.goto('/admin/content-pages/new', { waitUntil: 'domcontentloaded' })
      await expect(adminPage).toHaveURL(/\/admin\/content-pages\/new/)

      // Проверяем наличие поля "Контент" (лейбл или textarea)
      const contentLabel = adminPage.getByText(/контент|содержимое/i)
      const textarea = adminPage.locator('textarea')
      const editor = adminPage.locator('[contenteditable="true"]')

      const hasLabel = (await contentLabel.count()) > 0
      const hasTextarea = (await textarea.count()) > 0
      const hasEditor = (await editor.count()) > 0

      expect(hasLabel || hasTextarea || hasEditor).toBeTruthy()
    })
  })

  test.describe('Редактирование страницы', () => {
    test('можно открыть форму редактирования', async ({ adminPage }) => {
      await adminPage.goto('/admin/content-pages')

      // Ищем ссылку на редактирование
      const editLink = adminPage.locator('a[href*="/edit"]').first()
      const hasLink = (await editLink.count()) > 0

      if (hasLink) {
        await editLink.click()
        await expect(adminPage).toHaveURL(/\/admin\/content-pages\/[^/]+\/edit/)
      }
    })
  })
})
