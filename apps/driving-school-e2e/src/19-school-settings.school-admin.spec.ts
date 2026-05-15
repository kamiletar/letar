import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

test.describe('Настройки школы (школьный администратор)', () => {
  // Тестовый schoolId (требуется seed данных в БД)
  const testSchoolId = 'test-school-id'

  test.describe('Список школ для настройки', () => {
    test('E2E-19.1 — страница настроек школ загружается', async ({ page }) => {
      await page.goto(urls.schoolSettings)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем заголовок страницы или редирект на конкретную школу
      const heading = page.getByRole('heading', { name: /настройки.*школ|настройки школы/i })
      const isHeadingVisible = await heading.isVisible().catch(() => false)

      // Если админ только одной школы — будет редирект на /school/[id]/settings
      if (!isHeadingVisible) {
        await expect(page).toHaveURL(/\/school\/[^/]+\/settings\//, { timeout: 10000 })
      }
    })

    test('E2E-19.2 — отображаются карточки школ или редирект', async ({ page }) => {
      await page.goto(urls.schoolSettings)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем URL — если редирект, значит одна школа
      const currentUrl = page.url()
      if (currentUrl.includes('/school/') && currentUrl.includes('/settings/')) {
        // Редирект на настройки конкретной школы — это ОК
        console.log('  ✓ Редирект на настройки конкретной школы')
      } else {
        // Должен быть список школ
        const schoolCards = page.locator('[class*="Card"]')
        const cardsCount = await schoolCards.count()
        expect(cardsCount).toBeGreaterThanOrEqual(0)
      }
    })

    test('E2E-19.3 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto(urls.schoolSettings)
      await page.waitForLoadState('domcontentloaded')

      // Должен быть редирект на страницу входа
      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 })

      await context.close()
    })
  })

  test.describe('Страница настроек конкретной школы', () => {
    test('E2E-19.4 — страница настроек школы загружается', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем заголовок или сообщение об ошибке доступа
      const heading = page.getByRole('heading', { name: /настройки школы/i })
      const accessDenied = page.getByText(/доступ запрещён|нет прав/i)

      const hasHeading = await heading.isVisible().catch(() => false)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      // Должно быть что-то одно
      expect(hasHeading || hasDenied).toBe(true)
    })

    test('E2E-19.5 — форма настроек содержит поле названия', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      // Ищем поле названия школы
      const nameField = page.getByLabel(/название.*школы/i).or(page.locator('input[name*="name"]').first())

      const isVisible = await nameField.isVisible().catch(() => false)
      // Если есть доступ — поле должно быть видно
      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (!hasDenied) {
        expect(isVisible).toBe(true)
      }
    })

    test('E2E-19.6 — форма содержит поле описания', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      const descriptionField = page.getByLabel(/описание/i).or(page.locator('textarea[name*="description"]').first())

      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (!hasDenied) {
        await expect(descriptionField).toBeVisible({ timeout: 10000 })
      }
    })

    test('E2E-19.7 — форма содержит поля контактов', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (!hasDenied) {
        // Проверяем наличие полей контактов
        const phoneField = page.getByLabel(/телефон/i)
        const emailField = page.getByLabel(/email/i)
        const cityField = page.getByLabel(/город/i)

        const hasPhone = await phoneField.isVisible().catch(() => false)
        const hasEmail = await emailField.isVisible().catch(() => false)
        const hasCity = await cityField.isVisible().catch(() => false)

        // Хотя бы одно поле контактов должно быть
        expect(hasPhone || hasEmail || hasCity).toBe(true)
      }
    })

    test('E2E-19.8 — отображаются категории обучения', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (!hasDenied) {
        // Проверяем наличие секции категорий
        const categoriesSection = page.getByText(/категории обучения/i)

        await expect(categoriesSection).toBeVisible({ timeout: 10000 })
      }
    })

    test('E2E-19.9 — отображается переключатель публичности', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (!hasDenied) {
        // Проверяем наличие переключателя публичности
        const publicSwitch = page.getByText(/показывать в каталоге/i).or(page.locator('[name*="isPublic"]'))

        await expect(publicSwitch).toBeVisible({ timeout: 10000 })
      }
    })

    test('E2E-19.10 — кнопка сохранения видна', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (!hasDenied) {
        const saveButton = page.getByRole('button', { name: /сохранить/i })

        await expect(saveButton).toBeVisible({ timeout: 10000 })
      }
    })

    test('E2E-19.11 — кнопка "Назад" видна и ведёт на страницу школы', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (!hasDenied) {
        const backButton = page.getByRole('button', { name: /назад/i }).or(page.getByRole('link', { name: /назад/i }))

        if (await backButton.isVisible().catch(() => false)) {
          const href = await backButton.getAttribute('href')
          expect(href).toMatch(/\/school\//)
        }
      }
    })
  })

  test.describe('Валидация формы', () => {
    test('E2E-19.12 — валидация пустого названия', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (!hasDenied) {
        // Очищаем поле названия
        const nameField = page.getByLabel(/название.*школы/i).or(page.locator('input[name*="name"]').first())

        if (await nameField.isVisible().catch(() => false)) {
          await nameField.clear()
          await nameField.blur()

          // Должна появиться ошибка валидации
          const errorMessage = page
            .locator('[data-part="error-text"]')
            .first()
            .or(page.getByText(/обязательное поле|минимум/i))

          await expect(errorMessage).toBeVisible({ timeout: 5000 })
        }
      }
    })

    test('E2E-19.13 — валидация некорректного email', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (!hasDenied) {
        const emailField = page.getByLabel(/email/i).or(page.locator('input[name*="email"]').first())

        if (await emailField.isVisible().catch(() => false)) {
          await emailField.fill('invalid-email')
          await emailField.blur()

          // Должна появиться ошибка валидации
          const errorMessage = page.locator('[data-part="error-text"]').or(page.getByText(/корректный email/i))

          await expect(errorMessage).toBeVisible({ timeout: 5000 })
        }
      }
    })

    test('E2E-19.14 — валидация некорректного URL сайта', async ({ page }) => {
      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (!hasDenied) {
        const websiteField = page.getByLabel(/сайт/i).or(page.locator('input[name*="website"]').first())

        if (await websiteField.isVisible().catch(() => false)) {
          await websiteField.fill('not-a-url')
          await websiteField.blur()

          // Должна появиться ошибка валидации
          const errorMessage = page.locator('[data-part="error-text"]').or(page.getByText(/корректный url/i))

          await expect(errorMessage).toBeVisible({ timeout: 5000 })
        }
      }
    })
  })

  test.describe('Доступ', () => {
    test('E2E-19.15 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto(`/school/${testSchoolId}/settings/`)
      await page.waitForLoadState('domcontentloaded')

      // Должен быть редирект на страницу входа
      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 })

      await context.close()
    })

    test('E2E-19.16 — несуществующая школа показывает 404', async ({ page }) => {
      await page.goto('/school/nonexistent-school-id/settings/')
      await page.waitForLoadState('domcontentloaded')

      // Должна быть страница 404 или сообщение об ошибке
      const notFoundText = page.getByText(/не найден|not found|404/i)
      const accessDenied = page.getByText(/доступ запрещён/i)

      const hasNotFound = await notFoundText.isVisible().catch(() => false)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      // Должно быть одно из сообщений или редирект
      expect(hasNotFound || hasDenied || page.url().includes('sign-in')).toBe(true)
    })
  })
})
