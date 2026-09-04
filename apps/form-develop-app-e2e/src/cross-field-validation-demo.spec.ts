import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * Helper для получения input по data-field-name
 * (атрибут ставится на сам input, не на обёртку)
 */
function getFieldInput(page: Page, fieldName: string) {
  return page.locator(`input[data-field-name="${fieldName}"]`)
}

test.describe('Cross-Field Validation Demo (Фаза 2 zenstack-form-plugin)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cross-field-validation-demo')
    await page.locator('form').waitFor()
    // Дожидаемся, пока контролируемое поле реально получит initialValue (гидратация React) —
    // без этого .fill() на дату иногда проскакивает раньше, чем форма готова принять change,
    // и значение молча остаётся исходным (флак, найден живым прогоном e2e Фазы 2).
    await expect(getFieldInput(page, 'endsAt')).toHaveValue('2026-09-10')
  })

  test('страница загружается и рендерит поля из сгенерированной схемы', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Cross-Field Validation Demo (Фаза 2)' })).toBeVisible()
    await expect(getFieldInput(page, 'title')).toBeVisible()
    await expect(getFieldInput(page, 'startsAt')).toBeVisible()
    await expect(getFieldInput(page, 'endsAt')).toBeVisible()
  })

  test('@@validate блокирует сабмит, если endsAt раньше startsAt, ошибка привязана к endsAt', async ({ page }) => {
    const endsAtInput = getFieldInput(page, 'endsAt')
    await endsAtInput.fill('2026-09-09')
    await expect(endsAtInput).toHaveValue('2026-09-09')
    await page.getByRole('button', { name: 'Отправить' }).click()

    // Текст ошибки повторяется трижды на странице (Code-подсказка демо, Form.Errors, само
    // поле) — getByText('...') в strict mode валится «resolved to 3 elements». Скоупим до
    // именно поле-уровневого error-text (Chakra field slot), привязанного `path`-аргументом.
    await expect(page.locator('[data-part="error-text"]', { hasText: 'Дата окончания раньше начала' })).toBeVisible()
  })

  test('валидная пара дат проходит валидацию и попадает в отправленные данные', async ({ page }) => {
    const endsAtInput = getFieldInput(page, 'endsAt')
    await endsAtInput.fill('2026-09-11')
    await expect(endsAtInput).toHaveValue('2026-09-11')
    await page.getByRole('button', { name: 'Отправить' }).click()

    await expect(page.getByText('Отправленные данные:')).toBeVisible()
    await expect(page.getByText('"endsAt": "2026-09-11T00:00:00.000Z"')).toBeVisible()
  })
})
