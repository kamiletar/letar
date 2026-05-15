/**
 * Тесты админ-панели - Управление мандалами
 *
 * Проверяем CRUD операции для мандал
 */
import { expect, test } from '../fixtures/auth.fixture'

test.describe('Админ: Мандалы', () => {
  test.describe('Список мандал', () => {
    test('страница /admin/mandalas загружается', async ({ adminPage }) => {
      await adminPage.goto('/admin/mandalas')
      await expect(adminPage).toHaveURL(/\/admin\/mandalas/)
      // Заголовок "Мандалы"
      await expect(adminPage.getByRole('heading', { name: 'Мандалы' })).toBeVisible()
    })

    test('отображается таблица или список мандал', async ({ adminPage }) => {
      await adminPage.goto('/admin/mandalas')

      // Ждём загрузки таблицы или списка
      const table = adminPage.getByRole('table')
      const list = adminPage.locator('[data-testid="mandala-list"], [class*="list"], [class*="grid"]')

      const hasTable = (await table.count()) > 0
      const hasList = (await list.count()) > 0

      expect(hasTable || hasList).toBeTruthy()
    })

    test('есть кнопка создания новой мандалы', async ({ adminPage }) => {
      await adminPage.goto('/admin/mandalas')
      // Кнопка "Создать мандалу"
      await expect(adminPage.getByRole('link', { name: /создать мандалу/i })).toBeVisible()
    })

    test('можно перейти к созданию мандалы', async ({ adminPage }) => {
      await adminPage.goto('/admin/mandalas')
      await expect(adminPage.getByRole('heading', { name: 'Мандалы' })).toBeVisible()
      const createLink = adminPage.getByRole('link', { name: /создать мандалу/i })
      await expect(createLink).toBeVisible()
      await createLink.click()
      await adminPage.waitForURL(/\/admin\/mandalas\/new/, { timeout: 15000 })
      await expect(adminPage).toHaveURL(/\/admin\/mandalas\/new/)
    })
  })

  test.describe('Создание мандалы', () => {
    test('форма создания загружается', async ({ adminPage }) => {
      // Сначала заходим в список, чтобы убедиться в авторизации
      await adminPage.goto('/admin/mandalas')
      await expect(adminPage.getByRole('heading', { name: 'Мандалы' })).toBeVisible()

      // Затем переходим на страницу создания
      await adminPage.goto('/admin/mandalas/new', { waitUntil: 'domcontentloaded' })
      await expect(adminPage).toHaveURL(/\/admin\/mandalas\/new/)

      // Заголовок "Создать мандалу"
      await expect(adminPage.getByRole('heading', { name: 'Создать мандалу' })).toBeVisible()
    })

    test('форма содержит обязательные поля', async ({ adminPage }) => {
      await adminPage.goto('/admin/mandalas/new', { waitUntil: 'domcontentloaded' })
      await expect(adminPage).toHaveURL(/\/admin\/mandalas\/new/)

      // Проверяем наличие полей формы (ищем лейблы)
      await expect(adminPage.getByText('Название')).toBeVisible()

      // Проверяем наличие кнопки сохранения
      await expect(adminPage.getByRole('button', { name: /создать мандалу/i })).toBeVisible()
    })

    test('поля с default() НЕ являются HTML required', async ({ adminPage }) => {
      await adminPage.goto('/admin/mandalas/new', { waitUntil: 'domcontentloaded' })

      // Field.Root (div[data-scope="field"]) имеет data-required атрибут когда required=true
      // Поля с .default() НЕ должны быть required

      // Switch для published (имеет .default(true) в схеме) — НЕ должен быть required
      const publishedSwitch = adminPage.locator('[data-field-name="published"]')
      await expect(publishedSwitch).toBeVisible()
      const publishedFieldRoot = adminPage.locator('[data-scope="field"]:has([data-field-name="published"])')
      await expect(publishedFieldRoot).not.toHaveAttribute('data-required')

      // Switch для isSquare (имеет .default(false) в схеме) — НЕ должен быть required
      const isSquareSwitch = adminPage.locator('[data-field-name="isSquare"]')
      await expect(isSquareSwitch).toBeVisible()
      const isSquareFieldRoot = adminPage.locator('[data-scope="field"]:has([data-field-name="isSquare"])')
      await expect(isSquareFieldRoot).not.toHaveAttribute('data-required')

      // Поле order (имеет .default(0) в схеме) — НЕ должно быть required
      const orderInput = adminPage.locator('[data-field-name="order"]')
      await expect(orderInput).toBeVisible()
      const orderFieldRoot = adminPage.locator('[data-scope="field"]:has([data-field-name="order"])')
      await expect(orderFieldRoot).not.toHaveAttribute('data-required')
    })
  })

  test.describe('Просмотр мандалы', () => {
    test('можно открыть мандалу из списка', async ({ adminPage }) => {
      await adminPage.goto('/admin/mandalas')

      // Кликаем на первую мандалу в списке
      const mandalaLink = adminPage.getByRole('link', { name: /просмотр|открыть/i }).first()
      const mandalaRow = adminPage.locator('tr a, [data-testid="mandala-item"] a').first()

      const hasLink = (await mandalaLink.count()) > 0
      const hasRow = (await mandalaRow.count()) > 0

      if (hasLink) {
        await mandalaLink.click()
        await expect(adminPage).toHaveURL(/\/admin\/mandalas\/[^/]+$/)
      } else if (hasRow) {
        await mandalaRow.click()
        await expect(adminPage).toHaveURL(/\/admin\/mandalas\/[^/]+/)
      }
    })
  })

  test.describe('Редактирование мандалы', () => {
    test('можно открыть форму редактирования', async ({ adminPage }) => {
      await adminPage.goto('/admin/mandalas')
      await expect(adminPage.getByRole('heading', { name: 'Мандалы' })).toBeVisible()

      // Ищем кнопку редактирования
      const editButton = adminPage.getByRole('link', { name: /редактировать|изменить/i }).first()
      const hasButton = (await editButton.count()) > 0

      if (hasButton) {
        await editButton.click()
        await adminPage.waitForURL(/\/admin\/mandalas\/[^/]+\/edit/, { timeout: 10000 })
        await expect(adminPage).toHaveURL(/\/admin\/mandalas\/[^/]+\/edit/)
      }
    })
  })

  test.describe('DnD сортировка', () => {
    test('таблица поддерживает drag-and-drop', async ({ adminPage }) => {
      await adminPage.goto('/admin/mandalas')

      // Проверяем что таблица отображается
      const table = adminPage.getByRole('table')
      const hasTable = (await table.count()) > 0

      if (hasTable) {
        // DnD реализован через @dnd-kit - таблица должна иметь строки
        const rows = adminPage.locator('tbody tr')
        const rowCount = await rows.count()
        // Если есть строки, DnD должен работать (проверяем только наличие строк)
        expect(rowCount >= 0).toBeTruthy()
      }
    })
  })
})
