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
 * Ретрай клика по чекбоксу — не косметика: гонка гидратации в WebKit/Firefox headless
 * (найдено 2026-07-29, воспроизведено ~на каждом втором-третьем прогоне на реальном
 * production-билде). `Checkbox.Root` — controlled-компонент (`checked={accepted}`), и если
 * клик по нативному `<input>` физически происходит ДО того, как React навесил свой
 * `onCheckedChange` (хендлер прикрепляется во время гидратации), клик просто теряется:
 * браузер визуально/нативно переключает `checked`, но контролируемый компонент при
 * следующем рендере откатывает его назад к своему (устаревшему `false`) React-состоянию,
 * т.к. `onChange`/`onCheckedChange` никогда не сработал. Симптом ровно такой: клик проходит
 * без ошибки actionability, `disabled`-кнопка остаётся `disabled` все 5с таймаута.
 * Chromium гидратируется достаточно быстро, чтобы окно гонки почти всегда было уже закрыто
 * к моменту клика; WebKit/Firefox под headless — не всегда. Повторный клик почти всегда
 * успешен, т.к. к этому моменту гидратация уже гарантированно завершена.
 */
async function acceptConsentAndStart(page: import('@playwright/test').Page) {
  const startButton = page.getByRole('button', { name: 'Начать тест' })
  await expect(startButton).toBeDisabled()
  const consentCheckbox = page.locator('[data-part="control"]').first()
  await consentCheckbox.click()
  try {
    await expect(startButton).toBeEnabled({ timeout: 2_000 })
  } catch {
    await consentCheckbox.click()
    await expect(startButton).toBeEnabled({ timeout: 5_000 })
  }
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
