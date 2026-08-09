import { checkWithHydrationRetry, fillWithHydrationRetry } from '@letar/e2e-testing'
import { expect, test } from '@playwright/test'

test.describe('03 — Подписка на новости', () => {
  test('форма подписки в footer принимает email', async ({ page }) => {
    await page.goto('/')

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    // Ищем форму подписки в footer
    const emailInput = footer.locator('input[type="email"]')
    if (!(await emailInput.count())) {
      test.skip()
      return
    }

    const uniqueEmail = `e2e-sub-${Date.now()}@test.local`
    await fillWithHydrationRetry(emailInput, uniqueEmail)

    // Форма требует согласие на ПДн — Chakra UI checkbox. Клик именно по [data-part="control"]
    // (визуальный квадратик), не по <label> целиком — см. комментарий у checkWithHydrationRetry
    // в @letar/e2e-testing.
    const consentControl = footer.locator('[data-part="control"]').first()
    const consentCheckbox = footer.locator('input[type="checkbox"]').first()
    if (await consentCheckbox.count()) {
      await checkWithHydrationRetry(consentControl, consentCheckbox)
    }

    // Переподтверждаем email прямо перед сабмитом — на случай если клик по чекбоксу вызвал
    // ре-рендер, откативший значение.
    await fillWithHydrationRetry(emailInput, uniqueEmail)

    const submitBtn = footer.locator('button[type="submit"]')
    await submitBtn.click()

    // Успех — форма исчезает (email input больше нет) или появляется сообщение
    await expect(emailInput).not.toBeVisible({ timeout: 10_000 })
  })

  test('страница /confirm-subscription работает без авторизации', async ({ page }) => {
    // Страница подтверждения доступна публично (с фиктивным токеном — 404/invalid, но не 500)
    const response = await page.goto('/confirm-subscription?token=e2e-invalid-token')
    // Не должна быть серверной ошибкой
    expect(response?.status()).not.toBe(500)
  })
})
