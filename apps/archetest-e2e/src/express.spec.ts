import { clickWithHydrationRetry } from '@letar/e2e-testing'
import { expect, test } from '@playwright/test'

/**
 * E2E экспресс-флоу (этап 5.8): intro → 24 вопроса → гексаграмма → QR/CTA.
 * Гостевой режим: без авторизации и БД, результат живёт в localStorage.
 */

/**
 * Принимает информированное согласие (5.6.3) и стартует экспресс.
 *
 * Ретрай клика (`clickWithHydrationRetry` из `@letar/e2e-testing`) — гонка гидратации в
 * WebKit/Firefox headless, не косметика. Подробности гонки — в JSDoc самого хелпера.
 */
async function acceptConsentAndStart(page: import('@playwright/test').Page) {
  const startButton = page.getByRole('button', { name: 'Начать экспресс' })
  // Согласие не предотмечено → кнопка старта заблокирована
  await expect(startButton).toBeDisabled()
  // Кликаем именно контрол чекбокса (в лейбле есть ссылка на /privacy — по ней не попадаем)
  const consentCheckbox = page.getByTestId('disclaimer-consent-checkbox')
  await clickWithHydrationRetry(consentCheckbox, { locator: startButton, state: 'enabled' })
  await startButton.click()
}

/**
 * Проходит все вопросы, кликая первый вариант; карточка авто-переходит через 400мс.
 *
 * Раньше здесь после клика стоял фиксированный `waitForTimeout(500)`, подобранный под
 * клиентский `setTimeout(400)` в `QuizQuestionCard`. Совпадение констант не держит нагрузку
 * staging/WebKit: под более медленным рендером реальный переход иногда занимает дольше
 * условных 500мс, следующая итерация цикла тогда ищет `quiz-option` первого попавшегося
 * вопроса, которого ещё нет на экране, и падает по таймауту `waitFor` — не сам квиз сломан,
 * а тайминг теста угадан неверно (найдено на staging 2026-09-05, локально не
 * воспроизвелось). Вместо угадывания задержки ждём настоящий DOM-сигнал перехода: узел
 * кликнутой кнопки уходит из DOM либо при ремаунте `QuizQuestionCard` на новый вопрос
 * (родитель меняет `key`), либо при переходе всего квиза в RESULTS — оба случая покрывает
 * `waitForElementState('hidden')` (Playwright считает элемент hidden и при полном detach).
 */
async function answerAllQuestions(page: import('@playwright/test').Page) {
  const resultsTitle = page.getByRole('heading', { name: 'Ваша гексаграмма' })
  // 24 вопроса + запас на возможные повторы рендера
  for (let i = 0; i < 40; i++) {
    if (await resultsTitle.isVisible().catch(() => false)) {
      return
    }
    const option = page.getByTestId('quiz-option').first()
    await option.waitFor({ state: 'visible', timeout: 10_000 })
    const optionHandle = await option.elementHandle()
    await option.click()
    if (optionHandle) {
      await optionHandle.waitForElementState('hidden', { timeout: 15_000 }).catch(() => {})
      await optionHandle.dispose()
    }
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

    // RESULTS: заголовок гексаграммы, CTA на полный тест. Два независимых линка с этим
    // текстом на странице — основной CTA (express-results.tsx) и в ScaleTeaser внизу
    // (тизер оставшихся шкал) — оба ведут на "/", это осознанный дубль, не баг; .first()
    // проверяет основной (найдено 2026-07-29 — strict mode violation после того, как
    // остальные шаги флоу перестали падать раньше этого места).
    await expect(page.getByRole('heading', { name: 'Ваша гексаграмма' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Открыть полный тест' }).first()).toBeVisible()
    // QR-код (SVG от qrcode.react) присутствует
    await expect(page.locator('svg').first()).toBeVisible()

    // CTA для психологов (этап 5.7) — ведёт на лид-форму
    await expect(page.getByRole('link', { name: 'Узнать больше' })).toBeVisible()
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
