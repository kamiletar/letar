import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * E2E: триггер safety-net (этап 5.8) — при высоких DPR/BAR/BOR (≥60%) на экране
 * результатов полного квиза должен появиться кризисный блок с телефонами доверия
 * (SafetyNetBlock, needsSafetyNet). Safety-net уже покрыт 12 unit-тестами
 * (safety-net.test.ts) и dev-превью (/dev/safety-net) — этот тест закрывает то,
 * что не проверялось: сам триггер в реальном флоу прохождения квиза.
 *
 * submitQuizAction (авторитетный подсчёт баллов) доступен только авторизованным
 * пользователям — archetest поддерживает вход только через OIDC ключницу
 * (auth.letar.best). Гонять реальный OAuth-редирект в E2E нестабильно и требует
 * поднятого auth-hub, поэтому сессия ставится через staging-only
 * `/api/auth/dev-session` (`createDevSessionRoute`, `@letar/auth/server`) — прямым
 * `page.goto` без отдельного `global-setup`/`storageState`, раз тест один и cookie
 * нужна только внутри него. Требует `ALLOW_DEV_SESSION=true`+`DEV_SESSION_TOKEN` в
 * окружении e2e-раннера — та же пара, что у svoichuzhie/driving-school (см.
 * `.claude/rules/env-files.md`). Раньше тест лез напрямую в БД через `pg` и сам
 * подписывал cookie HMAC-ом — на staging-раннере нет ни `DATABASE_URL`, ни файла
 * `.env`, из которого он читался, поэтому тот подход падал сразу на `beforeAll`.
 *
 * Стратифицированная выборка (50 вопросов из банка на 22 шкалы) не гарантирует
 * заранее, какие вопросы попадут в сессию — поэтому тест для каждого показанного
 * вопроса ищет в банке (questions-dump.json) вариант с максимальным суммарным
 * баллом по DPR+BAR+BOR и выбирает именно его. Это гарантированно даёт 100%
 * (значит и ≥60%) по формуле нормализации TZ v2 (raw/actualMax по отвеченным
 * вопросам), см. calculateScores в quiz.action.ts.
 */

const ARCHETEST_DIR = path.join(__dirname, '../../archetest')
const TEST_EMAIL = 'e2e-safety-net@archetest.test'
const TRIGGER_SCALES = ['DPR', 'BAR', 'BOR']

interface DumpOption {
  text: string
  scoring: Record<string, number>
}

interface DumpQuestion {
  scenario: string
  options: string
}

/** Для каждого сценария вопроса — текст варианта, максимизирующего DPR+BAR+BOR. */
function buildBestOptionMap(): Map<string, string> {
  const dumpPath = path.join(ARCHETEST_DIR, 'prisma/questions-dump.json')
  const questions: DumpQuestion[] = JSON.parse(readFileSync(dumpPath, 'utf8'))
  const map = new Map<string, string>()

  for (const q of questions) {
    const options: DumpOption[] = JSON.parse(q.options)
    let best = options[0]
    let bestScore = -1
    for (const opt of options) {
      const score = TRIGGER_SCALES.reduce((sum, code) => sum + (opt.scoring[code] ?? 0), 0)
      if (score > bestScore) {
        bestScore = score
        best = opt
      }
    }
    map.set(q.scenario, best.text)
  }

  return map
}

test.describe('Safety-net триггер (DPR/BAR/BOR)', () => {
  test('высокие DPR/BAR/BOR показывают блок с телефонами доверия', async ({ page }) => {
    // 50 вопросов × ~500ms авто-переход + сеть — заметно дольше дефолтных 30s
    test.setTimeout(120_000)

    const devSessionToken = process.env['DEV_SESSION_TOKEN']
    if (!devSessionToken) {
      throw new Error('DEV_SESSION_TOKEN не задан в окружении e2e-раннера — dev-session вернёт 403')
    }

    const bestOptionByScenario = buildBestOptionMap()

    await page.goto(
      `/api/auth/dev-session?email=${encodeURIComponent(TEST_EMAIL)}&token=${encodeURIComponent(
        devSessionToken
      )}&redirect=/ru`
    )

    const startButton = page.getByRole('button', { name: 'Начать тест' })
    await expect(startButton).toBeEnabled({ timeout: 15_000 })
    await startButton.click()

    // Mood check-in (5.9.2) — пропускаем, не влияет на скоринг
    await page.getByRole('button', { name: 'Пропустить' }).click()

    const resultsHeading = page.getByRole('heading', { name: 'Ваш профиль личности' })

    // Отвечаем на все вопросы сессии, каждый раз выбирая вариант, максимизирующий DPR/BAR/BOR.
    // Ждём ЛИБО следующий вопрос, ЛИБО экран результатов — после последнего клика авто-переход
    // (400ms) сразу ведёт на результаты, отдельная проверка isVisible() до этого гонится с рендером.
    const optionButtons = page.getByTestId('quiz-option')
    for (let i = 0; i < 60; i++) {
      await Promise.race([
        optionButtons.first().waitFor({ state: 'visible', timeout: 15_000 }),
        resultsHeading.waitFor({ state: 'visible', timeout: 15_000 }),
      ])

      if (await resultsHeading.isVisible().catch(() => false)) {
        break
      }

      const scenario = (await page.getByTestId('quiz-scenario').textContent())?.trim() ?? ''
      const bestText = bestOptionByScenario.get(scenario)

      if (bestText) {
        await optionButtons.filter({ hasText: bestText }).first().click()
      } else {
        // Вопрос вне статичного банка (attention-check) — не влияет на DPR/BAR/BOR
        await optionButtons.first().click()
      }

      await page.waitForTimeout(500)
    }

    await expect(resultsHeading).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Ваши ответы отражают заметное эмоциональное напряжение')).toBeVisible()
    await expect(page.getByText('8-800-333-44-34')).toBeVisible()
  })
})
