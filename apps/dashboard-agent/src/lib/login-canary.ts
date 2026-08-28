/**
 * Синтетическая канареечная проверка входа (PLAN.md §71, часть 3.3).
 *
 * Минорный апгрейд better-auth 1.7 сломал вход в 14 приложениях монорепо без единой строки
 * в логах — обнаружено только ручным аудитом БД спустя дни (better-auth-1.7-account-issuer-field.md).
 * `account-issuer-check.ts` ловит один конкретный класс регрессии (NULL в Account.issuer).
 * Эта проверка ловит ЛЮБУЮ поломку входа тем же способом, каким её обнаружил бы реальный
 * пользователь: раз в расписание шлёт POST /api/auth/sign-in/email канареечными учётными
 * данными на каждое приложение с credential-входом и ждёт HTTP 200 — рассинхрон OAuth-клиента,
 * истёкший секрет, сломанный password-хеш, частичный сид и т.п. дают тот же симптом.
 *
 * Приложения ниже — все, у кого есть СОБСТВЕННАЯ форма входа email/password (не только
 * `emailAndPassword.enabled: true` в конфиге better-auth — часть приложений держит его
 * включённым по умолчанию через createAuth(), но реально входят только через OIDC Ключницы,
 * hub-client-режим). Проверено вручную по исходникам auth.ts + sign-in/login-form.tsx каждого
 * приложения. Исключены: time/kami/aprel8008 (mode: 'hub-client' — вход только через
 * auth.letar.best), archetest/grandslamcup/studio (только genericOAuth, своего пароля нет).
 *
 * Учётные данные канареечных аккаунтов — реестр `LOGIN_CANARY_<APP>_EMAIL`/`_PASSWORD` в
 * `apps/dashboard/.env.docker.enc`, читается из уже смонтированного dashboard-agent'у
 * `/secrets/dashboard.env` (см. `app-secrets.ts` — тот же файл, что и `CRON_SECRET` dashboard).
 * Сами аккаунты создаются один раз через `scripts/setup-login-canaries.ts`.
 */

import path from 'node:path'
import { shouldRepeatAlert } from './alert-policy'
import { getAppUrl } from './app-registry'
import { parseEnvFile } from './app-secrets'
import { postDashboardAlert } from './dashboard-alert'
import { loadJsonState, saveJsonState } from './json-state-file'

export const LOGIN_CANARY_APPS = [
  'aboi',
  'domwellbes',
  'mandala',
  'animatrona-tracker',
  'dashboard',
  'auth-hub',
  'driving-school',
  'svoichuzhie',
  'dsperevod',
] as const

export type LoginCanaryApp = (typeof LOGIN_CANARY_APPS)[number]

export interface LoginCanaryAppResult {
  app: string
  /** `false` — в реестре нет LOGIN_CANARY_<APP>_EMAIL/_PASSWORD, проверка не проводилась. */
  configured: boolean
  ok: boolean
  statusCode: number | null
  error: string | null
  latencyMs: number | null
}

export interface LoginCanaryCheckResult {
  checkedAt: string
  checked: LoginCanaryAppResult[]
  alerted: boolean
}

interface LoginCanaryState {
  /** Подряд-прогоны, где хотя бы одно приложение не смогло войти. Сброс при чистом прогоне. */
  consecutiveFailures: number
  alertedAtFailures: number | null
  lastAlertDelivered: boolean | null
}

const STATE_PATH = process.env.LOGIN_CANARY_STATE_PATH || '/home/deploy/letar/login-canary-check-state.json'
/** Как у email-canary: одна неудача может быть сетевой флуктуацией, две подряд — уже нет. */
const ALERT_THRESHOLD = 2
const REQUEST_TIMEOUT_MS = 15_000

function defaultState(): LoginCanaryState {
  return { consecutiveFailures: 0, alertedAtFailures: null, lastAlertDelivered: null }
}

function getSecretsDir(): string {
  return process.env.SECRETS_DIR || '/secrets'
}

function envKey(app: string, suffix: 'EMAIL' | 'PASSWORD'): string {
  return `LOGIN_CANARY_${app.toUpperCase().replace(/-/g, '_')}_${suffix}`
}

/** Реестр канареечных учётных данных — общий файл `apps/dashboard/.env.docker(.enc)`. */
export function getCanaryCredentials(app: string): { email: string; password: string } | null {
  const registry = parseEnvFile(path.join(getSecretsDir(), 'dashboard.env'))
  const email = registry[envKey(app, 'EMAIL')]
  const password = registry[envKey(app, 'PASSWORD')]
  if (!email || !password) {
    return null
  }
  return { email, password }
}

async function checkApp(app: string): Promise<LoginCanaryAppResult> {
  const credentials = getCanaryCredentials(app)
  if (!credentials) {
    return { app, configured: false, ok: false, statusCode: null, error: null, latencyMs: null }
  }

  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(getAppUrl(app, '/api/auth/sign-in/email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      signal: controller.signal,
    })

    const latencyMs = Date.now() - startedAt

    if (!response.ok) {
      let body = ''
      try {
        body = (await response.text()).slice(0, 300)
      } catch {
        // тело недоступно — статуса достаточно, чтобы отличить отказ от тишины
      }
      return {
        app,
        configured: true,
        ok: false,
        statusCode: response.status,
        error: `HTTP ${response.status} ${response.statusText}: ${body}`,
        latencyMs,
      }
    }

    return { app, configured: true, ok: true, statusCode: response.status, error: null, latencyMs }
  } catch (error) {
    return {
      app,
      configured: true,
      ok: false,
      statusCode: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startedAt,
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Один прогон канареечной проверки входа — вызывается роутом `/api/cron/login-canary-check`.
 * Приложения проверяются параллельно — они независимы, а провал одного не должен задерживать
 * остальные до истечения таймаута.
 */
export async function runLoginCanaryCheck(): Promise<LoginCanaryCheckResult> {
  const checkedAt = new Date().toISOString()
  const checked = await Promise.all(LOGIN_CANARY_APPS.map((app) => checkApp(app)))

  const configured = checked.filter((entry) => entry.configured)
  const failed = configured.filter((entry) => !entry.ok)

  const prevState: LoginCanaryState = {
    ...defaultState(),
    ...loadJsonState<Partial<LoginCanaryState>>(STATE_PATH, {}),
  }

  if (failed.length === 0) {
    saveJsonState(STATE_PATH, defaultState(), 'LoginCanaryCheck')
    return { checkedAt, checked, alerted: false }
  }

  const consecutiveFailures = prevState.consecutiveFailures + 1
  const shouldAlert = shouldRepeatAlert(
    { alertedAtCount: prevState.alertedAtFailures, lastAlertDelivered: prevState.lastAlertDelivered },
    consecutiveFailures,
    ALERT_THRESHOLD,
  )

  let alerted = false
  let nextState: LoginCanaryState = { ...prevState, consecutiveFailures }

  if (shouldAlert) {
    const summary = failed.map((entry) => `${entry.app}: ${entry.error ?? `HTTP ${entry.statusCode}`}`).join('; ')

    const delivered = await postDashboardAlert({
      type: 'AUTH_LOGIN_CANARY_FAILED',
      severity: 'CRITICAL',
      title: `Вход не работает в ${failed.length} приложени${failed.length === 1 ? 'и' : 'ях'}`,
      message: summary,
      metadata: { jobId: 'login-canary-check', failed, consecutiveFailures },
    })
    alerted = delivered
    nextState = { ...nextState, alertedAtFailures: consecutiveFailures, lastAlertDelivered: delivered }
  }

  saveJsonState(STATE_PATH, nextState, 'LoginCanaryCheck')

  return { checkedAt, checked, alerted }
}
