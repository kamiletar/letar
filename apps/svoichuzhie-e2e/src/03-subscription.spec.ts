import { expect, type Locator, test } from '@playwright/test'

/**
 * `.fill()` иногда не долетает до controlled-инпута под нагрузкой (staging — холодный
 * контейнер, гидратация может не успеть отработать между fill и следующим действием, значение
 * откатывается на пустое) — тот же класс проблемы, что задокументирован для aboi
 * (email-verification.spec.ts). Retry идемпотентен для .fill(), в отличие от toggle-клика.
 */
async function fillStable(locator: Locator, value: string) {
  await expect(async () => {
    await locator.fill(value)
    await expect(locator).toHaveValue(value)
  }).toPass({ timeout: 10_000 })
}

/**
 * НЕ гонка — реальный баг компонента, найден и подтверждён на staging трейсом (BlackCove,
 * 2026-08-09). Zag.js-машина чекбокса (`@letar/forms` FieldCheckbox → Chakra v3 Checkbox.Root)
 * вешает обработчик toggle конкретно на `[data-part="control"]` (визуальный квадратик), а не
 * полагается на нативное поведение браузера «клик по `<label>` → клик по связанному `<input>`».
 * Клик по `<label data-part="root">` целиком — в т.ч. по тексту согласия — НЕ переключает
 * чекбокс вообще, ни разу, ни у Playwright, ни у живого пользователя. Реальный клик по тексту
 * "Согласен(на)..." (интуитивно ожидаемое поведение для `<label>`) молча не работает — заведено
 * отдельным репортом `@letar/forms` (форма-координатор), здесь — обход на уровне теста: кликаем
 * по `[data-part="control"]`, не по `label`.
 */
async function checkStable(controlLocator: Locator, checkboxLocator: Locator) {
  await expect(async () => {
    if (!(await checkboxLocator.isChecked())) {
      await controlLocator.click()
    }
    await expect(checkboxLocator).toBeChecked()
  }).toPass({ timeout: 15_000 })
}

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
    await fillStable(emailInput, uniqueEmail)

    // Форма требует согласие на ПДн — Chakra UI checkbox. Клик именно по [data-part="control"]
    // (визуальный квадратик), не по <label> целиком — см. комментарий у checkStable.
    const consentControl = footer.locator('[data-part="control"]').first()
    const consentCheckbox = footer.locator('input[type="checkbox"]').first()
    if (await consentCheckbox.count()) {
      await checkStable(consentControl, consentCheckbox)
    }

    // Переподтверждаем email прямо перед сабмитом — на случай если клик по чекбоксу вызвал
    // ре-рендер, откативший значение (см. комментарий у fillStable).
    await fillStable(emailInput, uniqueEmail)

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
