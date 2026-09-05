import type { Locator } from '@playwright/test'

/**
 * Ждёт ЛИБО следующий вариант ответа, ЛИБО экран результатов — после последнего клика
 * авто-переход на результаты происходит с задержкой (см. `QuizQuestionCard`), и
 * последовательная проверка «сначала результаты, потом вариант» гонится с рендером под
 * медленным окружением (staging/WebKit). Возвращает `true`, если уже показаны результаты.
 */
export async function waitForQuizStepOrResults(
  optionLocator: Locator,
  resultsHeadingLocator: Locator,
  timeout: number,
): Promise<boolean> {
  await Promise.race([
    optionLocator.waitFor({ state: 'visible', timeout }),
    resultsHeadingLocator.waitFor({ state: 'visible', timeout }),
  ])

  return await resultsHeadingLocator.isVisible().catch(() => false)
}
