import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * Helper для получения input по data-field-name
 * (атрибут ставится на сам input, не на обёртку)
 */
function getFieldInput(page: Page, fieldName: string) {
  return page.locator(`input[data-field-name="${fieldName}"]`)
}

test.describe('Constraints Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/constraints-demo')
    // Ждём загрузку формы
    await page.locator('form').waitFor()
  })

  test('страница загружается', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Constraints Demo' })).toBeVisible()
  })

  // === СТРОКИ ===

  test('строка с minLength/maxLength имеет maxLength атрибут', async ({ page }) => {
    const titleInput = getFieldInput(page, 'title')
    await expect(titleInput).toBeVisible()
    await expect(titleInput).toHaveAttribute('maxLength', '50')
  })

  test('email поле имеет type="email"', async ({ page }) => {
    const emailInput = getFieldInput(page, 'email')
    await expect(emailInput).toHaveAttribute('type', 'email')
  })

  test('url поле имеет type="url"', async ({ page }) => {
    const websiteInput = getFieldInput(page, 'website')
    await expect(websiteInput).toHaveAttribute('type', 'url')
  })

  test('поле с length() имеет одинаковые minLength и maxLength', async ({ page }) => {
    const codeInput = getFieldInput(page, 'code')
    await expect(codeInput).toHaveAttribute('maxLength', '6')
    await expect(codeInput).toHaveAttribute('minLength', '6')
  })

  // === ЧИСЛА ===
  // NumberInput использует ARIA атрибуты для min/max

  test('числовое поле имеет aria-valuemin/max атрибуты', async ({ page }) => {
    const ratingInput = getFieldInput(page, 'rating')
    await expect(ratingInput).toHaveAttribute('aria-valuemin', '1')
    await expect(ratingInput).toHaveAttribute('aria-valuemax', '10')
  })

  test('целочисленное поле имеет aria-valuemin/max', async ({ page }) => {
    const quantityInput = getFieldInput(page, 'quantity')
    await expect(quantityInput).toHaveAttribute('aria-valuemin', '1')
    await expect(quantityInput).toHaveAttribute('aria-valuemax', '100')
  })

  test('поле с multipleOf имеет aria-valuemax', async ({ page }) => {
    const priceInput = getFieldInput(page, 'price')
    await expect(priceInput).toHaveAttribute('aria-valuemin', '0')
    await expect(priceInput).toHaveAttribute('aria-valuemax', '10000')
  })

  // === ДАТЫ ===

  test('поле даты с min имеет min атрибут', async ({ page }) => {
    const startDateInput = getFieldInput(page, 'startDate')
    await expect(startDateInput).toHaveAttribute('min', '2024-01-01')
  })

  test('поле даты с max имеет max атрибут', async ({ page }) => {
    const endDateInput = getFieldInput(page, 'endDate')
    await expect(endDateInput).toHaveAttribute('max', '2025-12-31')
  })

  // === МАССИВЫ ===

  test('кнопка Add активна когда меньше maxItems', async ({ page }) => {
    // Изначально 1 тег, maxItems=5, кнопка Add должна быть активна
    const addButton = page.getByRole('button', { name: 'Добавить тег' })
    await expect(addButton).toBeEnabled()
  })

  test('кнопка Remove отключена при minItems', async ({ page }) => {
    // Изначально 1 тег, minItems=1, кнопка Remove должна быть отключена
    const removeButton = page.getByRole('button', { name: 'Remove item' })
    await expect(removeButton).toBeDisabled()
  })

  test('кнопка Remove активируется после добавления второго элемента', async ({ page }) => {
    // Добавляем второй тег
    const addButton = page.getByRole('button', { name: 'Добавить тег' })
    await addButton.click()

    // Теперь 2 тега, кнопки Remove должны быть активны
    const removeButtons = page.getByRole('button', { name: 'Remove item' })
    await expect(removeButtons.first()).toBeEnabled()
  })

  test('кнопка Add отключается при достижении maxItems', async ({ page }) => {
    const addButton = page.getByRole('button', { name: 'Добавить тег' })

    // Изначально 1 тег, добавим ещё 4 (до maxItems=5)
    for (let i = 0; i < 4; i++) {
      await addButton.click()
    }

    // Теперь 5 тегов, кнопка Add должна быть отключена
    await expect(addButton).toBeDisabled()
  })

  // Submit тест убран - форма имеет много обязательных полей,
  // и главная цель этих тестов - проверить constraints (min/max/minLength/maxLength).
  // Submit функциональность проверяется в других E2E тестах.
})
