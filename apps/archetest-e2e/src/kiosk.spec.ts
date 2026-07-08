import { expect, test } from '@playwright/test'

/**
 * E2E kiosk-режима (этап 5.7): кнопка «Новый посетитель» на демо-планшете.
 * Активируется ?kiosk=1, двухтапное подтверждение, сброс чистит результат
 * и согласие (152-ФЗ: согласие персонально) и перезагружает страницу.
 */

test.describe('Kiosk-режим /express', () => {
  test('без ?kiosk=1 кнопка сброса не показывается', async ({ page }) => {
    await page.goto('/ru/express')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await expect(page.getByRole('button', { name: 'Начать экспресс' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Новый посетитель' })).toHaveCount(0)
  })

  test('двухтапный сброс чистит согласие и возвращает интро', async ({ page }) => {
    await page.goto('/ru/express?kiosk=1')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Кнопка киоска видна
    const resetButton = page.getByRole('button', { name: 'Новый посетитель' })
    await expect(resetButton).toBeVisible()

    // Посетитель даёт согласие — оно записывается в localStorage
    await page.locator('[data-part="control"]').first().click()
    await expect(page.getByRole('button', { name: 'Начать экспресс' })).toBeEnabled()
    const consentBefore = await page.evaluate(() => localStorage.getItem('quiz_disclaimer_accepted'))
    expect(consentBefore).toBeTruthy()

    // Первый тап — подтверждение, сброса ещё нет
    await resetButton.click()
    const confirmButton = page.getByRole('button', { name: 'Точно сбросить?' })
    await expect(confirmButton).toBeVisible()

    // Второй тап — сброс + перезагрузка страницы
    await confirmButton.click()
    await page.waitForLoadState('load')

    // Согласие стёрто, интро с заблокированной кнопкой старта, kiosk-режим сохранён
    await expect(page.getByRole('button', { name: 'Начать экспресс' })).toBeDisabled()
    const consentAfter = await page.evaluate(() => localStorage.getItem('quiz_disclaimer_accepted'))
    expect(consentAfter).toBeNull()
    await expect(page.getByRole('button', { name: 'Новый посетитель' })).toBeVisible()
  })
})
