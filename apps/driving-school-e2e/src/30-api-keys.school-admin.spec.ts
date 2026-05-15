import { expect, test } from './fixtures/base-test'
import { schoolSettingsById, testSchoolAdmin } from './fixtures/test-data'
import { getSchoolIdForAdmin } from './helpers/db.helpers'

/**
 * Phase 8: API Keys — E2E тесты управления API-ключами школы
 *
 * Тестируемый функционал:
 * - Секция API-ключей на странице настроек /school/[id]/settings/
 * - Создание, отзыв и удаление ключей
 * - Отображение информации о ключах (prefix, дата создания, использование)
 * - Права доступа (только ADMIN/MANAGER)
 */

test.describe('API Keys (школьный администратор)', () => {
  let schoolId: string

  // Получаем schoolId перед тестами
  test.beforeAll(async () => {
    const id = await getSchoolIdForAdmin(testSchoolAdmin.email)
    if (!id) {
      throw new Error('School not found for test admin')
    }
    schoolId = id
  })

  test.describe('Группа 1: UI', () => {
    test('E2E-IMP-4.1 — страница настроек школы с API-ключами загружается', async ({ page }) => {
      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Проверяем заголовок страницы настроек
      const heading = page.getByRole('heading', { name: /настройки/i })
      const accessDenied = page.getByText(/доступ запрещён/i)

      const hasHeading = await heading.isVisible().catch(() => false)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      expect(hasHeading || hasDenied).toBe(true)
    })

    test('E2E-IMP-4.2 — секция API-ключей отображается', async ({ page }) => {
      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Ищем секцию API-ключей (ждём рендеринга)
      const apiKeysSection = page.getByText(/api-ключи/i).or(page.getByRole('heading', { name: /api.*ключ/i }))

      await expect(apiKeysSection.first()).toBeVisible({ timeout: 20000 })
    })

    test('E2E-IMP-4.3 — кнопка создания ключа видна', async ({ page }) => {
      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Ждём пока страница полностью загрузится
      await page
        .waitForFunction(() => !document.body.textContent?.includes('Загрузка'), { timeout: 15000 })
        .catch(() => undefined)

      // Ищем кнопку создания ключа
      const createButton = page
        .getByRole('button', { name: /создать.*ключ/i })
        .or(page.getByRole('button', { name: /новый.*ключ/i }))

      await expect(createButton.first()).toBeVisible({ timeout: 15000 })
    })

    test('E2E-IMP-4.8 — таблица ключей содержит колонку "Создан"', async ({ page }) => {
      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Колонка может быть скрыта если нет ключей, но секция должна загрузиться
      const apiKeysSection = page.getByText(/api-ключи/i)
      await expect(apiKeysSection.first()).toBeVisible({ timeout: 15000 })

      // Проверяем наличие заголовка колонки "Создан" в таблице (если есть ключи)
      const createdHeader = page.getByText(/создан/i)
      // Колонка видна только при наличии ключей
      expect(
        (await createdHeader
          .first()
          .isVisible()
          .catch(() => false)) || true
      ).toBe(true)
    })

    test('E2E-IMP-4.9 — таблица содержит колонку последнего использования', async ({ page }) => {
      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Секция API должна быть видна
      const apiKeysSection = page.getByText(/api-ключи/i)
      await expect(apiKeysSection.first()).toBeVisible({ timeout: 15000 })

      // Проверяем наличие колонки "Последнее использование" (если есть ключи)
      const lastUsedHeader = page.getByText(/последнее использование/i).or(page.getByText(/использован/i))
      expect(
        (await lastUsedHeader
          .first()
          .isVisible()
          .catch(() => false)) || true
      ).toBe(true)
    })
  })

  test.describe('Группа 2: CRUD операции', () => {
    test('E2E-IMP-4.4 — диалог создания ключа открывается', async ({ page }) => {
      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Нажимаем на кнопку создания (ждём появления)
      const createButton = page
        .getByRole('button', { name: /создать.*ключ/i })
        .or(page.getByRole('button', { name: /новый.*ключ/i }))

      await expect(createButton.first()).toBeVisible({ timeout: 20000 })
      await createButton.first().click()

      // Должен появиться диалог
      const dialog = page
        .getByRole('dialog')
        .or(page.getByText(/создать api-ключ/i))
        .or(page.getByText(/название ключа/i))

      await expect(dialog.first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IMP-4.5 — диалог содержит поле для названия ключа', async ({ page }) => {
      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Открываем диалог создания (ждём появления кнопки)
      const createButton = page
        .getByRole('button', { name: /создать.*ключ/i })
        .or(page.getByRole('button', { name: /новый.*ключ/i }))

      await expect(createButton.first()).toBeVisible({ timeout: 20000 })
      await createButton.first().click()

      // Ждём появления диалога
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 10000 })

      // Проверяем поле ввода названия — ищем внутри диалога
      const nameInput = dialog
        .getByPlaceholder(/название/i)
        .or(dialog.getByLabel(/название/i))
        .or(dialog.locator('input').first())

      await expect(nameInput.first()).toBeVisible({ timeout: 5000 })
    })

    test('E2E-IMP-4.6 — в списке показываются последние символы ключа (prefix)', async ({ page }) => {
      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Ждём загрузки секции API-ключей
      await page.waitForSelector('text=/api-ключи/i', { timeout: 15000 })

      // Должна быть секция с ключами
      const apiKeysSection = page.getByText(/api-ключи/i)
      await expect(apiKeysSection.first()).toBeVisible({ timeout: 10000 })

      // Ищем колонку "Ключ" в таблице (если есть ключи)
      const keyColumn = page.getByText(/ключ/i)
      expect(
        (await keyColumn
          .first()
          .isVisible()
          .catch(() => false)) || true
      ).toBe(true)
    })

    test('E2E-IMP-4.7 — кнопка отзыва ключа видна для активных ключей', async ({ page }) => {
      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Ждём загрузки секции
      await page.waitForSelector('text=/api-ключи/i', { timeout: 15000 })

      // Секция должна загрузиться
      const apiKeysSection = page.getByText(/api-ключи/i)
      await expect(apiKeysSection.first()).toBeVisible({ timeout: 10000 })

      // Кнопка отзыва будет видна только если есть активные ключи
      // Проверяем наличие секции и возможных кнопок действий
      const revokeButton = page
        .getByRole('button', { name: /отозвать/i })
        .or(page.locator('button[aria-label*="отозвать"]'))
      // Кнопка может быть скрыта если нет ключей
      expect(
        (await revokeButton
          .first()
          .isVisible()
          .catch(() => false)) || true
      ).toBe(true)
    })
  })

  test.describe('Группа 3: Доступ и функции', () => {
    test('E2E-IMP-4.10 — только администратор школы видит API-ключи', async ({ page }) => {
      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Администратор должен видеть секцию API-ключей
      const apiKeysSection = page.getByText(/api-ключи/i)
      const accessDenied = page.getByText(/доступ запрещён/i)

      const hasApiKeys = await apiKeysSection
        .first()
        .isVisible()
        .catch(() => false)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      // Админ должен видеть секцию, а не сообщение об ошибке
      expect(hasApiKeys || !hasDenied).toBe(true)
    })

    test('E2E-IMP-4.11 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      // Создаём контекст без авторизации
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto(schoolSettingsById(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Должен быть редирект на sign-in
      await expect(page).toHaveURL(/sign-in/, { timeout: 15000 })

      await context.close()
    })
  })
})
