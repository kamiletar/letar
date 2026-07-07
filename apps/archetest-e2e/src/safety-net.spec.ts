import { expect, test } from '@playwright/test'
import { createHmac, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

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
 * поднятого auth-hub, поэтому сессия создаётся напрямую в БД (тестовый юзер +
 * строка Session), а cookie подписывается тем же HMAC-алгоритмом, что и
 * better-auth/better-call: HMAC-SHA256 над токеном, base64, `${token}.${signature}`,
 * затем encodeURIComponent — см. node_modules/better-call/dist/crypto.mjs.
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

/** Читает переменную окружения из .env.local/.env приложения archetest (свой процесс — без dotenv-подключения Next.js). */
function loadEnvVar(name: string): string {
  for (const file of ['.env.local', '.env']) {
    try {
      const content = readFileSync(path.join(ARCHETEST_DIR, file), 'utf8')
      const match = content.match(new RegExp(`^${name}=(.*)$`, 'm'))
      if (match) {
        return match[1].trim().replace(/^["']|["']$/g, '')
      }
    } catch {
      // файла нет — пробуем следующий
    }
  }
  throw new Error(`${name} не найден в apps/archetest/.env(.local)`)
}

/** Подписывает значение cookie так же, как better-call (used by Better Auth). */
function signSessionCookie(token: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(token).digest('base64')
  return encodeURIComponent(`${token}.${signature}`)
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
  let userId: string
  let cookieValue: string

  test.beforeAll(async () => {
    const databaseUrl = loadEnvVar('DATABASE_URL')
    const secret = loadEnvVar('BETTER_AUTH_SECRET')
    const client = new Client({ connectionString: databaseUrl })
    await client.connect()
    try {
      const userResult = await client.query(
        `INSERT INTO "User" (id, name, email, "emailVerified", roles, "disclaimerAccepted", "updatedAt")
         VALUES (gen_random_uuid()::text, 'E2E Safety Net', $1, true, ARRAY['USER']::"UserRole"[], true, now())
         ON CONFLICT (email) DO UPDATE SET "disclaimerAccepted" = true, "updatedAt" = now()
         RETURNING id`,
        [TEST_EMAIL],
      )
      userId = userResult.rows[0].id as string

      await client.query('DELETE FROM "Session" WHERE "userId" = $1', [userId])
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await client.query(
        `INSERT INTO "Session" (id, "userId", token, "expiresAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, now())`,
        [userId, token, expiresAt],
      )
      cookieValue = signSessionCookie(token, secret)
    } finally {
      await client.end()
    }
  })

  test.afterAll(async () => {
    const databaseUrl = loadEnvVar('DATABASE_URL')
    const client = new Client({ connectionString: databaseUrl })
    await client.connect()
    try {
      await client.query('DELETE FROM "User" WHERE email = $1', [TEST_EMAIL])
    } finally {
      await client.end()
    }
  })

  test('высокие DPR/BAR/BOR показывают блок с телефонами доверия', async ({ page, baseURL }) => {
    // 50 вопросов × ~500ms авто-переход + сеть — заметно дольше дефолтных 30s
    test.setTimeout(120_000)

    const host = new URL(baseURL ?? 'http://localhost:3012').hostname
    await page.context().addCookies([
      {
        name: 'better-auth.session_token',
        value: cookieValue,
        domain: host,
        path: '/',
        httpOnly: true,
        secure: false,
      },
    ])

    const bestOptionByScenario = buildBestOptionMap()

    await page.goto('/ru')

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
