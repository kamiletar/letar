import { expect, test } from '@playwright/test'

/**
 * Заявка на обратный звонок (виджет в шапке) — @letar/forms миграция.
 * Покрывает: маску телефона (Form.Field.Phone), опциональный email, обязательное согласие ПДн.
 */
test.describe('CallbackDrawer — заказать звонок', () => {
  test('маска телефона форматирует ввод при наборе', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Заказать звонок' }).click()

    const phoneInput = page.getByRole('dialog').getByPlaceholder('+7 (___) ___-__-__')
    await phoneInput.click()
    await phoneInput.pressSequentially('9185568172', { delay: 20 })

    await expect(phoneInput).toHaveValue('+7 (918) 556-81-72')
  })

  test('отправка без email — заявка принята', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Заказать звонок' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('Как к вам обращаться').click()
    await dialog.getByPlaceholder('Как к вам обращаться').fill('E2E Тестов')

    const phoneInput = dialog.getByPlaceholder('+7 (___) ___-__-__')
    await phoneInput.click()
    await phoneInput.pressSequentially('9185568172', { delay: 20 })

    // Ark UI Checkbox.Root не реагирует на клик по скрытому <input> (onCheckedChange не вызывается) —
    // кликаем по видимому label-тексту, как это делает реальный пользователь.
    await dialog.getByText('Согласен на обработку ПДн', { exact: false }).click()

    await dialog.getByRole('button', { name: 'Перезвоните мне' }).click()

    await expect(dialog.getByText('Заявка принята')).toBeVisible({ timeout: 10000 })
  })

  test('отправка с опциональным email проходит валидацию', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Заказать звонок' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('Как к вам обращаться').click()
    await dialog.getByPlaceholder('Как к вам обращаться').fill('E2E С Email')

    const phoneInput = dialog.getByPlaceholder('+7 (___) ___-__-__')
    await phoneInput.click()
    await phoneInput.pressSequentially('9185568173', { delay: 20 })

    const emailInput = dialog.getByPlaceholder('you@example.com')
    await emailInput.click()
    await emailInput.fill(`e2e-callback-${Date.now()}@example.com`)

    await dialog.getByText('Согласен на обработку ПДн', { exact: false }).click()
    await dialog.getByRole('button', { name: 'Перезвоните мне' }).click()

    await expect(dialog.getByText('Заявка принята')).toBeVisible({ timeout: 10000 })
  })

  test('без согласия на ПДн заявка не отправляется', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Заказать звонок' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('Как к вам обращаться').click()
    await dialog.getByPlaceholder('Как к вам обращаться').fill('E2E Без Согласия')

    const phoneInput = dialog.getByPlaceholder('+7 (___) ___-__-__')
    await phoneInput.click()
    await phoneInput.pressSequentially('9185568174', { delay: 20 })

    // Чекбокс согласия НЕ отмечен
    await dialog.getByRole('button', { name: 'Перезвоните мне' }).click()

    await expect(dialog.getByText('Заявка принята')).toBeHidden()
    await expect(dialog.getByPlaceholder('Как к вам обращаться')).toBeVisible()
  })
})
