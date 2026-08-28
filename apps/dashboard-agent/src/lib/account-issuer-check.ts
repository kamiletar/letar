/**
 * Проверка NULL-регрессии `Account.issuer` (better-auth 1.7 — см.
 * `.claude/docs/better-auth-1.7-account-issuer-field.md`). Статический гейт по схеме ловит
 * только «поля нет в schema.zmodel»; эта проверка ловит соседний случай — поле есть, но кто-то
 * (ручной SQL, забытая миграция на одном из окружений, баг апстрима) один раз вставил строку
 * с `issuer = NULL`. Такая строка ломает sign-up/reset-password для конкретного аккаунта 500-й
 * ошибкой, при этом остальной sign-in продолжает работать — молчаливый частичный отказ.
 *
 * Приложения ниже — все 14, у кого `scripts/check-better-auth-schema.mjs` находит `model
 * Account` за приложением, использующим `prismaAdapter` (проверено вручную 2026-08-28 грепом
 * по `apps/**\/*.zmodel`, см. PLAN.md §71 п.3.2 — тот же список, что в разделе «системный
 * фикс входа+logout»). Не все они используют общий фрагмент `AccountFields` из
 * `libs/zenstack-fragments` — часть (mandala, dsperevod, auth-hub, studio, svoichuzhie, aboi,
 * driving-school, grandslamcup, kami, animatrona-tracker) объявляет `issuer` в собственной
 * копии модели, но регрессия того же класса возможна и там, поэтому проверяются все. `time`
 * в этот список НЕ входит — у него нет своей модели Account (в §71 был затронут только путь
 * logout).
 */

import { Client } from 'pg'
import { shouldRepeatAlert } from './alert-policy'
import { postDashboardAlert } from './dashboard-alert'
import { type DbConfig, getDbConfig } from './database'
import { loadJsonState, saveJsonState } from './json-state-file'

export const ACCOUNT_MODEL_APPS = [
  'aboi',
  'animatrona-tracker',
  'aprel8008',
  'archetest',
  'auth-hub',
  'dashboard',
  'domwellbes',
  'driving-school',
  'dsperevod',
  'grandslamcup',
  'kami',
  'mandala',
  'studio',
  'svoichuzhie',
] as const

export interface AccountIssuerAppResult {
  app: string
  /** `null`, если подключение/запрос упали — отличаем от «проверили, NULL нет» (0) */
  nullCount: number | null
  error: string | null
}

export interface AccountIssuerCheckResult {
  checkedAt: string
  checked: AccountIssuerAppResult[]
  alerted: boolean
}

interface AccountIssuerState {
  /** Подряд-прогоны, где хотя бы в одном приложении найден NULL. Сбрасывается при чистом прогоне. */
  consecutiveFailures: number
  alertedAtFailures: number | null
  lastAlertDelivered: boolean | null
}

const STATE_PATH = process.env.ACCOUNT_ISSUER_STATE_PATH
  || '/home/deploy/letar/account-issuer-check-state.json'

/** Как и у backup-freshness: ежедневный прогон, алертить сразу на первую же находку. */
const ALERT_THRESHOLD = 1

function defaultState(): AccountIssuerState {
  return { consecutiveFailures: 0, alertedAtFailures: null, lastAlertDelivered: null }
}

/**
 * Число строк `Account.issuer IS NULL` для одного приложения. Ошибка подключения/запроса
 * пробрасывается вызывающему — приложение, чью БД не удалось проверить, не должно молча
 * считаться «чистым».
 */
async function countNullIssuers(config: DbConfig): Promise<number> {
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    connectionTimeoutMillis: 5000,
  })

  try {
    await client.connect()
    const result = await client.query<{ count: string }>(
      'SELECT count(*) AS count FROM "Account" WHERE issuer IS NULL',
    )
    return parseInt(result.rows[0]?.count ?? '0', 10)
  } finally {
    await client.end()
  }
}

/**
 * Прогон проверки по всем приложениям текущего сервера. Приложения, для которых `getDbConfig`
 * не вернул конфиг (не на этом сервере — сейчас всё in-scope на s2, задел на будущее), тихо
 * пропускаются: это не отказ проверки, а «не наш сервер».
 */
export async function runAccountIssuerCheck(): Promise<AccountIssuerCheckResult> {
  const checkedAt = new Date().toISOString()
  const checked: AccountIssuerAppResult[] = []

  for (const app of ACCOUNT_MODEL_APPS) {
    const config = getDbConfig(app)
    if (!config) {
      continue
    }

    try {
      const nullCount = await countNullIssuers(config)
      checked.push({ app, nullCount, error: null })
    } catch (error) {
      checked.push({
        app,
        nullCount: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const affected = checked.filter((entry) => (entry.nullCount ?? 0) > 0)
  const failedChecks = checked.filter((entry) => entry.nullCount === null)

  const prevState: AccountIssuerState = {
    ...defaultState(),
    ...loadJsonState<Partial<AccountIssuerState>>(STATE_PATH, {}),
  }

  if (affected.length === 0) {
    saveJsonState(STATE_PATH, defaultState(), 'AccountIssuerCheck')
    return { checkedAt, checked, alerted: false }
  }

  const consecutiveFailures = prevState.consecutiveFailures + 1
  const shouldAlert = shouldRepeatAlert(
    { alertedAtCount: prevState.alertedAtFailures, lastAlertDelivered: prevState.lastAlertDelivered },
    consecutiveFailures,
    ALERT_THRESHOLD,
  )

  let alerted = false
  let nextState: AccountIssuerState = { ...prevState, consecutiveFailures }

  if (shouldAlert) {
    const summary = affected.map((entry) => `${entry.app}: ${entry.nullCount}`).join(', ')
    const failedSummary = failedChecks.length > 0
      ? ` (не удалось проверить: ${failedChecks.map((entry) => entry.app).join(', ')})`
      : ''

    const delivered = await postDashboardAlert({
      type: 'AUTH_ACCOUNT_ISSUER_NULL',
      severity: 'ERROR',
      title: `Account.issuer = NULL найден в ${affected.length} приложени${affected.length === 1 ? 'и' : 'ях'}`,
      message: `${summary}${failedSummary}. Затронутые пользователи получат 500 на sign-up/reset-password — `
        + 'см. .claude/docs/better-auth-1.7-account-issuer-field.md.',
      metadata: { jobId: 'account-issuer-null-check', affected, failedChecks },
    })
    alerted = delivered
    nextState = { ...nextState, alertedAtFailures: consecutiveFailures, lastAlertDelivered: delivered }
  }

  saveJsonState(STATE_PATH, nextState, 'AccountIssuerCheck')

  return { checkedAt, checked, alerted }
}
