import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * Helper для получения input по data-field-name
 * (атрибут ставится на сам input, не на обёртку)
 */
function getFieldInput(page: Page, fieldName: string) {
  return page.locator(`input[data-field-name="${fieldName}"]`)
}

test.describe('Native Attributes Demo (Фаза 1 zenstack-form-plugin)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/native-attributes-demo')
    await page.locator('form').waitFor()
  })

  test('страница загружается и рендерит поля из сгенерированной схемы', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Native Attributes Demo (Фаза 1)' })).toBeVisible()
    await expect(getFieldInput(page, 'slug')).toBeVisible()
    await expect(getFieldInput(page, 'website')).toBeVisible()
    await expect(getFieldInput(page, 'authorPhone')).toBeVisible()
  })

  test('нативный @startsWith на slug блокирует сабмит с ошибкой сервера ORM-валидации', async ({ page }) => {
    const slugInput = getFieldInput(page, 'slug')
    await slugInput.fill('invalid-slug')
    await page.getByRole('button', { name: 'Отправить' }).click()

    await expect(page.getByText('Invalid string: must start with "recipe-"').first()).toBeVisible()
  })

  test('валидный slug проходит валидацию и попадает в отправленные данные', async ({ page }) => {
    const slugInput = getFieldInput(page, 'slug')
    await slugInput.fill('recipe-borsch')
    await page.getByRole('button', { name: 'Отправить' }).click()

    await expect(page.getByText('Отправленные данные:')).toBeVisible()
    await expect(page.getByText('"slug": "recipe-borsch"')).toBeVisible()
  })

  test('internalNote (омиченное поле) не рендерится в форме', async ({ page }) => {
    await expect(page.locator('input[data-field-name="internalNote"]')).toHaveCount(0)
    await expect(page.locator('input[data-field-name="totalWeightGrams"]')).toHaveCount(0)
  })
})
