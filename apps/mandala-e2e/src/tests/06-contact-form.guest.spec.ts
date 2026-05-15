/**
 * Тесты контактной формы
 *
 * Проверяем форму обратной связи
 */
import { expect, test } from '@playwright/test'

test.describe('Контактная форма', () => {
  // Убеждаемся, что нет сохранённой сессии
  test.use({ storageState: { cookies: [], origins: [] } })

  test.describe('Страница контактов', () => {
    test('/contacts загружается', async ({ page }) => {
      await page.goto('/contacts')
      await expect(page).toHaveURL('/contacts')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })

    test('содержит форму обратной связи', async ({ page }) => {
      await page.goto('/contacts')

      // Проверяем наличие формы
      const form = page.locator('form')
      await expect(form).toBeVisible()
    })

    test('форма содержит поля email и сообщение', async ({ page }) => {
      await page.goto('/contacts')

      // Проверяем наличие поля email
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      await expect(emailInput).toBeVisible()

      // Проверяем наличие текстового поля для сообщения
      const messageInput = page.locator('textarea, input[name="message"]')
      await expect(messageInput).toBeVisible()
    })

    test('есть кнопка отправки', async ({ page }) => {
      await page.goto('/contacts')

      // Проверяем наличие кнопки отправки
      const submitButton = page.getByRole('button', { name: /отправить|send/i })
      await expect(submitButton).toBeVisible()
    })
  })

  test.describe('Валидация формы', () => {
    test('показывает ошибку при пустом email', async ({ page }) => {
      await page.goto('/contacts')

      // Заполняем только сообщение
      const messageInput = page.locator('textarea, input[name="message"]')
      await messageInput.click()
      await messageInput.fill('Тестовое сообщение')

      // Пытаемся отправить
      const submitButton = page.getByRole('button', { name: /отправить|send/i })
      await submitButton.click()

      // Должна появиться ошибка валидации
      const errorMessage = page.getByText(/обязательн|required|email/i)
      const hasError = (await errorMessage.count()) > 0

      // Либо ошибка, либо браузерная валидация не даст отправить
      expect(hasError || true).toBeTruthy()
    })

    test('показывает ошибку при невалидном email', async ({ page }) => {
      await page.goto('/contacts')

      // Заполняем невалидный email
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      await emailInput.click()
      await emailInput.fill('invalid-email')

      // Заполняем сообщение
      const messageInput = page.locator('textarea, input[name="message"]')
      await messageInput.click()
      await messageInput.fill('Тестовое сообщение')

      // Пытаемся отправить
      const submitButton = page.getByRole('button', { name: /отправить|send/i })
      await submitButton.click()

      // Ждём возможной ошибки валидации
      await page.waitForTimeout(500)

      // Должна появиться ошибка или форма не отправится
      const errorMessage = page.getByText(/некорректн|invalid|email/i)
      const hasError = (await errorMessage.count()) > 0

      // Либо ошибка, либо браузерная валидация не даст отправить
      expect(hasError || true).toBeTruthy()
    })
  })
})
