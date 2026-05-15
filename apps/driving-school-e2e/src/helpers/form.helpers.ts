/**
 * Хелперы для работы с формами в E2E тестах
 *
 * Унификация работы с формами, TagsInput, PinInput и валидацией.
 * Устраняет ~150 строк дублирования.
 */
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Заполнить поля формы и отправить
 *
 * @param page - Playwright Page
 * @param fields - Объект с полями (placeholder: value)
 * @param submitText - Текст кнопки отправки
 *
 * @example
 * await fillAndSubmit(page, {
 *   'example@mail.com': 'test@example.com',
 *   'Минимум 8 символов': 'TestPass123!'
 * }, /зарегистрироваться/i)
 */
export async function fillAndSubmit(
  page: Page,
  fields: Record<string, string>,
  submitText: string | RegExp
): Promise<void> {
  for (const [placeholder, value] of Object.entries(fields)) {
    await page.getByPlaceholder(placeholder).fill(value)
  }
  await page.getByRole('button', { name: submitText }).click()
}

/**
 * Заполнить поле и отправить форму нажатием Enter
 *
 * @param page - Playwright Page
 * @param placeholder - Placeholder поля
 * @param value - Значение
 *
 * @example
 * await fillAndPressEnter(page, 'Введите район', 'Невский район')
 */
export async function fillAndPressEnter(page: Page, placeholder: string, value: string): Promise<void> {
  const input = page.getByPlaceholder(placeholder)
  await input.click()
  await page.keyboard.type(value)
  await page.waitForTimeout(100) // Chakra debounce
  await page.keyboard.press('Enter')
}

/**
 * Добавить тег в TagsInput
 *
 * @param page - Playwright Page
 * @param placeholder - Placeholder TagsInput
 * @param value - Значение тега
 * @param timeout - Таймаут ожидания появления тега
 *
 * @example
 * await addTag(page, 'Введите район и нажмите Enter', 'Центр')
 */
export async function addTag(page: Page, placeholder: string, value: string, timeout = 5000): Promise<void> {
  const input = page.getByPlaceholder(placeholder)
  await input.click()
  await page.keyboard.type(value)
  await page.waitForTimeout(100) // Chakra debounce
  await page.keyboard.press('Enter')
  // Ждём появления тега
  await expect(page.getByText(value).first()).toBeVisible({ timeout })
}

/**
 * Добавить несколько тегов в TagsInput
 *
 * @param page - Playwright Page
 * @param placeholder - Placeholder TagsInput
 * @param values - Массив значений тегов
 *
 * @example
 * await addTags(page, 'Введите район', ['Центр', 'Запад', 'Север'])
 */
export async function addTags(page: Page, placeholder: string, values: string[]): Promise<void> {
  for (const value of values) {
    await addTag(page, placeholder, value)
  }
}

/**
 * Удалить тег из TagsInput
 *
 * @param page - Playwright Page
 * @param tagValue - Текст тега для удаления
 * @param timeout - Таймаут ожидания исчезновения
 *
 * @example
 * await removeTag(page, 'Невский район')
 */
export async function removeTag(page: Page, tagValue: string, timeout = 5000): Promise<void> {
  const deleteButton = page.getByRole('button', { name: new RegExp(`Delete tag.*${tagValue}`, 'i') })
  await deleteButton.click()
  await expect(deleteButton).toBeHidden({ timeout })
}

/**
 * Ввести PIN-код в PinInput
 *
 * @param page - Playwright Page
 * @param fieldName - data-field-name атрибут PinInput
 * @param pin - PIN-код (обычно 6 цифр)
 * @param delay - Задержка между символами (для эмуляции ввода)
 *
 * @example
 * await enterPin(page, 'pin', '123456')
 */
export async function enterPin(page: Page, fieldName: string, pin: string, delay = 100): Promise<void> {
  const firstInput = page.locator(`[data-field-name="${fieldName}"] [data-part="control"] input`).first()
  await firstInput.click()
  await page.keyboard.type(pin, { delay })
  // Пауза для обработки onValueComplete
  await page.waitForTimeout(500)
}

/**
 * Проверить ошибку валидации поля
 *
 * @param page - Playwright Page
 * @param errorPattern - Паттерн текста ошибки
 * @param timeout - Таймаут ожидания
 *
 * @example
 * await expectValidationError(page, /некорректн|invalid/i)
 */
export async function expectValidationError(page: Page, errorPattern: string | RegExp, timeout = 5000): Promise<void> {
  await expect(page.getByText(errorPattern)).toBeVisible({ timeout })
}

/**
 * Проверить что форма не отправилась (остались на той же странице)
 *
 * @param page - Playwright Page
 * @param urlPattern - Паттерн URL страницы формы
 *
 * @example
 * await expectFormNotSubmitted(page, /sign-up/)
 */
export async function expectFormNotSubmitted(page: Page, urlPattern: RegExp): Promise<void> {
  await expect(page).toHaveURL(urlPattern)
}

/**
 * Очистить поле и заполнить новым значением
 *
 * @param locator - Локатор поля
 * @param value - Новое значение
 *
 * @example
 * await clearAndFill(page.getByPlaceholder('Имя'), 'Новое имя')
 */
export async function clearAndFill(locator: Locator, value: string): Promise<void> {
  await locator.clear()
  await locator.fill(value)
}

/**
 * Кликнуть по чекбоксу через data-field-name
 *
 * @param page - Playwright Page
 * @param fieldName - data-field-name атрибут
 *
 * @example
 * await clickCheckboxField(page, 'acceptOffer')
 */
export async function clickCheckboxField(page: Page, fieldName: string): Promise<void> {
  await page.locator(`[data-field-name="${fieldName}"]`).click()
}

/**
 * Заполнить форму регистрации
 *
 * @param page - Playwright Page
 * @param email - Email
 * @param password - Пароль
 * @param acceptLegal - Принять юридические документы (default: true)
 *
 * @example
 * await fillRegistrationForm(page, 'test@example.com', 'TestPass123!')
 */
export async function fillRegistrationForm(
  page: Page,
  email: string,
  password: string,
  acceptLegal = true
): Promise<void> {
  await page.getByPlaceholder('example@mail.com').fill(email)
  await page.getByPlaceholder('Минимум 8 символов').fill(password)

  if (acceptLegal) {
    await clickCheckboxField(page, 'acceptOffer')
    await clickCheckboxField(page, 'acceptPrivacy')
  }
}

/**
 * Отправить форму регистрации
 *
 * @param page - Playwright Page
 *
 * @example
 * await fillRegistrationForm(page, email, password)
 * await submitRegistrationForm(page)
 */
export async function submitRegistrationForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: /зарегистрироваться/i }).click()
}

/**
 * Заполнить форму входа
 *
 * @param page - Playwright Page
 * @param email - Email
 * @param password - Пароль
 *
 * @example
 * await fillLoginForm(page, 'test@example.com', 'TestPass123!')
 */
export async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  await page.getByPlaceholder('example@mail.com').fill(email)
  await page.getByPlaceholder('Введите пароль').fill(password)
}

/**
 * Отправить форму входа
 *
 * @param page - Playwright Page
 *
 * @example
 * await fillLoginForm(page, email, password)
 * await submitLoginForm(page)
 */
export async function submitLoginForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: /войти/i }).click()
}

/**
 * Проверить успешную отправку формы (toast или редирект)
 *
 * @param page - Playwright Page
 * @param successPattern - Паттерн текста успеха
 * @param timeout - Таймаут ожидания
 *
 * @example
 * await expectFormSuccess(page, /профиль обновлён|сохранено/i)
 */
export async function expectFormSuccess(page: Page, successPattern: string | RegExp, timeout = 10000): Promise<void> {
  await expect(page.getByText(successPattern)).toBeVisible({ timeout })
}
