import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * ZenStack + справочник: onCreate/onUpdate/useSelected/loading на настоящих хуках
 * (`useFindMany*`/`useCreate*`/`useUpdate*` поверх TanStack Query, модель Category).
 * Имена уникальны — БД общая для параллельных прогонов.
 */
test.describe('ZenStack Option Demo', () => {
  const field = (page: Page, name: string) => page.locator(`[data-field-name="${name}"]`)

  test.beforeEach(async ({ page }) => {
    await page.goto('/zenstack-option-demo')
    await page.locator('form').waitFor()
  })

  test('создание из Select: запись выбрана, дубля нет', async ({ page }) => {
    const name = `Создана-${Date.now()}`
    page.once('dialog', (dialog) => void dialog.accept(name))

    await field(page, 'selectCategory').click()
    await page.getByRole('option', { name: /Добавить/ }).click()

    await expect(field(page, 'selectCategory')).toContainText(name)
    await field(page, 'selectCategory').click()
    await expect(page.getByRole('option', { name })).toHaveCount(1)
  })

  test('правка F2: подпись в триггере новая, после update — один findMany справочника', async ({ page }) => {
    const first = `Правка-${Date.now()}`
    const renamed = `${first}-новая`
    page.once('dialog', (dialog) => void dialog.accept(first))
    await field(page, 'selectCategory').click()
    await page.getByRole('option', { name: /Добавить/ }).click()
    await expect(field(page, 'selectCategory')).toContainText(first)

    const listRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      // Запрос справочника Select — без `where` (запросы Combobox с поиском несут `where`)
      if (url.includes('/api/model/category/findMany') && !decodeURIComponent(url).includes('"where"')) {
        listRequests.push(url)
      }
    })

    page.once('dialog', (dialog) => void dialog.accept(renamed))
    await field(page, 'selectCategory').focus()
    await page.keyboard.press('F2')

    await expect(field(page, 'selectCategory')).toContainText(renamed)
    expect(listRequests).toHaveLength(1)
  })

  test('Combobox: подпись значения вне выдачи приходит из useSelected', async ({ page }) => {
    const name = `Комбо-${Date.now()}`
    page.once('dialog', (dialog) => void dialog.accept(name))
    await field(page, 'selectCategory').click()
    await page.getByRole('option', { name: /Добавить/ }).click()
    await expect(field(page, 'selectCategory')).toContainText(name)

    // «Открыть с выбранной последней категорией» перемонтирует форму со значением в обоих полях
    await page.getByRole('button', { name: /Открыть с выбранной/ }).click()
    await expect(page.locator('input[role="combobox"]')).toHaveValue(/.+/)
  })
})
