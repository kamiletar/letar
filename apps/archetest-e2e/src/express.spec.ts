import { expect, test } from '@playwright/test'

/**
 * E2E экспресс-флоу (этап 5.8): intro → 24 вопроса → гексаграмма → QR/CTA.
 * Гостевой режим: без авторизации и БД, результат живёт в localStorage.
 */

/** Принимает информированное согласие (5.6.3) и стартует экспресс. */
async function acceptConsentAndStart(page: import('@playwright/test').Page) {
  const startButton = page.getByRole('button', { name: 'Начать экспресс' })
  // Согласие не предотмечено → кнопка старта заблокирована
  await expect(startButton).toBeDisabled()
  // Кликаем именно контрол чекбокса (в лейбле есть ссылка на /privacy — по ней не попадаем)
  await page.locator('[data-part="control"]').first().click()
  await expect(startButton).toBeEnabled()
  await startButton.click()
}

/** Проходит все вопросы, кликая первый вариант; карточка авто-переходит через 400мс. */
async function answerAllQuestions(page: import('@playwright/test').Page) {
  const resultsTitle = page.getByRole('heading', { name: 'Ваша гексаграмма' })
  // 24 вопроса + запас на возможные повторы рендера
  for (let i = 0; i < 40; i++) {
    if (await resultsTitle.isVisible().catch(() => false)) {
      return
    }
    const option = page.getByTestId('quiz-option').first()
    await option.waitFor({ state: 'visible', timeout: 10_000 })
    await option.click()
    // Ждём авто-перехода (setTimeout 400мс в QuizQuestionCard)
    await page.waitForTimeout(500)
  }
}

test.describe('Express Scan', () => {
  test.beforeEach(async ({ page }) => {
    // Чистим гостевой результат, чтобы всегда стартовать с интро
    await page.goto('/ru/express')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('интро → согласие → 24 вопроса → гексаграмма с QR и CTA', async ({ page }) => {
    // INTRO + информированное согласие
    await acceptConsentAndStart(page)

    // QUIZ: первый вопрос виден
    await expect(page.getByTestId('quiz-option').first()).toBeVisible()

    await answerAllQuestions(page)

    // RESULTS: заголовок гексаграммы, CTA на полный тест
    await expect(page.getByRole('heading', { name: 'Ваша гексаграмма' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Открыть полный тест' })).toBeVisible()
    // QR-код (SVG от qrcode.react) присутствует
    await expect(page.locator('svg').first()).toBeVisible()
  })

  test('результат сохраняется в localStorage и восстанавливается после перезагрузки', async ({ page }) => {
    await acceptConsentAndStart(page)
    await answerAllQuestions(page)
    await expect(page.getByRole('heading', { name: 'Ваша гексаграмма' })).toBeVisible()

    // Гостевой результат должен быть в localStorage
    const stored = await page.evaluate(() => localStorage.getItem('archetest_express_result'))
    expect(stored).toBeTruthy()

    // После перезагрузки сразу показываются результаты (минуя интро)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Ваша гексаграмма' })).toBeVisible()
  })
})
