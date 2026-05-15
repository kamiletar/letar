import { expect, test } from '@playwright/test'

test.describe('TableEditor — row selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/examples/table-editor')
    // Ждём рендер таблицы
    await expect(page.getByRole('heading', { name: /table editor/i })).toBeVisible()
  })

  test('клик по чекбоксу строки выделяет только эту строку', async ({ page }) => {
    // Находим все чекбоксы в таблице (header + строки)
    const checkboxes = page.locator('table input[type="checkbox"]')
    await expect(checkboxes).toHaveCount(4) // 1 select-all + 3 строки

    const selectAll = checkboxes.nth(0)
    const row0 = checkboxes.nth(1) // Laptop
    const row1 = checkboxes.nth(2) // Mouse
    const row2 = checkboxes.nth(3) // Keyboard

    // Изначально ни один не выбран
    await expect(row0).not.toBeChecked()
    await expect(row1).not.toBeChecked()
    await expect(row2).not.toBeChecked()

    // Клик по row 0 — только row 0 checked
    await row0.click()
    await expect(row0).toBeChecked()
    await expect(row1).not.toBeChecked()
    await expect(row2).not.toBeChecked()

    // Клик по row 2 — row 0 и row 2 checked
    await row2.click()
    await expect(row0).toBeChecked()
    await expect(row1).not.toBeChecked()
    await expect(row2).toBeChecked()

    // Снимаем row 0 — только row 2
    await row0.click()
    await expect(row0).not.toBeChecked()
    await expect(row1).not.toBeChecked()
    await expect(row2).toBeChecked()
  })

  test('select-all выделяет все строки, повторный клик снимает', async ({ page }) => {
    const checkboxes = page.locator('table input[type="checkbox"]')
    const selectAll = checkboxes.nth(0)
    const row0 = checkboxes.nth(1)
    const row1 = checkboxes.nth(2)
    const row2 = checkboxes.nth(3)

    // Клик select-all — все выделены
    await selectAll.click()
    await expect(row0).toBeChecked()
    await expect(row1).toBeChecked()
    await expect(row2).toBeChecked()
    await expect(selectAll).toBeChecked()

    // Повторный клик — все сняты
    await selectAll.click()
    await expect(row0).not.toBeChecked()
    await expect(row1).not.toBeChecked()
    await expect(row2).not.toBeChecked()
  })

  test('toolbar показывает количество выбранных строк', async ({ page }) => {
    const checkboxes = page.locator('table input[type="checkbox"]')

    // Выделяем 2 строки
    await checkboxes.nth(1).click()
    await checkboxes.nth(3).click()

    // Toolbar должен показать "Delete selected (2)" или "Удалить выбранные (2)"
    await expect(page.getByText(/selected.*\(2\)|выбранные.*\(2\)/i)).toBeVisible()
  })
})
