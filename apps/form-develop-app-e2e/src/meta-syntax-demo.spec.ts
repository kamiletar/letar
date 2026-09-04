import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

function getFieldInput(page: Page, fieldName: string) {
  return page.locator(`input[data-field-name="${fieldName}"]`)
}

test.describe('Meta Syntax Demo (Фаза 3 zenstack-form-plugin)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/meta-syntax-demo')
    await page.locator('form').waitFor()
  })

  test('страница загружается и рендерит поля из @meta-сгенерированной схемы', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Meta Syntax Demo (Фаза 3)' })).toBeVisible()
    await expect(getFieldInput(page, 'name')).toBeVisible()
    await expect(getFieldInput(page, 'rating')).toBeVisible()
    await expect(getFieldInput(page, 'bio')).toBeVisible()
    await expect(getFieldInput(page, 'legacyNote')).toBeVisible()
  })

  test('@meta("form.title", …) отдаёт лейбл поля', async ({ page }) => {
    // name: @meta("form.title", "Имя") @meta("form.placeholder", "Как вас зовут") — лейбл рендерится
    // с обязательным `*`, поэтому не exact-текст, а accessible name самого input'а (аудит DOM
    // показал textbox "Имя" — accessible name уже без `*`).
    await expect(getFieldInput(page, 'name')).toHaveAccessibleName('Имя')
    await expect(getFieldInput(page, 'name')).toHaveAttribute('placeholder', 'Как вас зовут')
  })

  test('@meta("form.description", …) побеждает legacy @form.description на том же поле', async ({ page }) => {
    // bio в schema.zmodel: @meta("form.description", "Описание") — единственный источник, старого
    // comment-варианта на этом поле больше нет (конвертирован кодмодом) — здесь фиксируем факт,
    // что рендерится именно @meta-текст, а не пусто и не что-то другое.
    await expect(page.locator('[data-part="helper-text"]', { hasText: 'Описание' })).toBeVisible()
  })

  test('поле на legacy @form.title-комментарии продолжает рендериться (обратная совместимость)', async ({ page }) => {
    // legacyNote — единственное поле экосистемы form-develop-app, намеренно оставленное на
    // старом синтаксисе (см. schema.zmodel) — deprecation-warning печатается в консоль generate,
    // не в браузере, сборка/рендер не ломаются.
    await expect(getFieldInput(page, 'legacyNote')).toHaveAccessibleName('Заметка (legacy)')
  })

  test('поле с @meta("form.exclude", true) отсутствует в форме', async ({ page }) => {
    await expect(page.locator('input[data-field-name="hidden"]')).toHaveCount(0)
  })

  test('валидные данные проходят сабмит', async ({ page }) => {
    await getFieldInput(page, 'name').fill('Тестовое имя')
    await getFieldInput(page, 'rating').fill('4')
    await page.getByRole('button', { name: 'Отправить' }).click()

    await expect(page.getByText('Отправленные данные:')).toBeVisible()
    await expect(page.getByText('"name": "Тестовое имя"')).toBeVisible()
  })
})
