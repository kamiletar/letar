import { clickWithHydrationRetry } from '@letar/e2e-testing'
import { expect, test } from '@playwright/test'

/**
 * E2E mood check-in (этап 5.9.2, часть 5.8): интро полного квиза → согласие →
 * mood check-in (сетка эмодзи 3×3) → первый вопрос квиза. Гостевой доступ — экран
 * показывается до логина, submitQuizAction не вызывается (guest-путь пишет в
 * sessionStorage), так что авторизация для проверки самого экрана не нужна.
 */

/**
 * Принимает информированное согласие (5.6.3) и стартует полный квиз.
 *
 * Ретрай клика по чекбоксу (`clickWithHydrationRetry` из `@letar/e2e-testing`) — не
 * косметика: гонка гидратации в WebKit/Firefox headless (найдено 2026-07-29). Подробности
 * гонки — в JSDoc самого хелпера.
 */
async function acceptConsentAndStart(page: import('@playwright/test').Page) {
  const startButton = page.getByRole('button', { name: 'Начать тест' })
  await expect(startButton).toBeDisabled()
  const consentCheckbox = page.locator('[data-part="control"]').first()
  await clickWithHydrationRetry(consentCheckbox, { locator: startButton, state: 'enabled' })
  await startButton.click()
}

test.describe('Mood check-in', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ru')
  })

  test('выбор настроения ведёт к первому вопросу квиза', async ({ page }) => {
    await acceptConsentAndStart(page)

    // MOOD CHECK-IN: заголовок и сетка 3×3 видны
    await expect(page.getByRole('heading', { name: 'Как вы сейчас?' })).toBeVisible()
    const moodCells = page.getByRole('button').filter({ hasText: /😠|😳|🤩|😟|😐|🙂|😔|😴|😌/ })
    await expect(moodCells).toHaveCount(9)

    // Выбираем одну из ячеек
    await moodCells.first().click()

    // QUIZ: первый вопрос появляется
    await expect(page.getByTestId('quiz-option').first()).toBeVisible()
    await expect(page.getByText('Вопрос 1', { exact: true })).toBeVisible()
  })

  test('пропуск mood check-in тоже ведёт к первому вопросу квиза', async ({ page }) => {
    await acceptConsentAndStart(page)
    await expect(page.getByRole('heading', { name: 'Как вы сейчас?' })).toBeVisible()

    await page.getByRole('button', { name: 'Пропустить' }).click()

    await expect(page.getByTestId('quiz-option').first()).toBeVisible()
  })
})
