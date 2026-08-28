/**
 * Тесты синтетической канареечной проверки входа.
 *
 * Реальные HTTP-запросы и файл секретов замокан — проверяется агрегация результатов по
 * приложениям и повтор алерта. Паттерн тестов — как у `account-issuer-check.spec.ts`
 * (то же семейство §71: булев `alerted` слался один раз и глушил уведомления навсегда).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const postDashboardAlert = vi.fn(async () => true)
let fakeState: Record<string, unknown> = {}
/** app -> { status } | Error (Error имитирует сетевой сбой fetch) */
let responses: Record<string, { status: number } | Error> = {}
/** app -> { email, password } | undefined (не сконфигурировано в реестре) */
let credentials: Record<string, { email: string; password: string } | undefined> = {}

vi.mock('./dashboard-alert', () => ({
  postDashboardAlert: (...args: unknown[]) => postDashboardAlert(...(args as [])),
}))

vi.mock('./json-state-file', () => ({
  loadJsonState: () => fakeState,
  saveJsonState: (_path: string, state: Record<string, unknown>) => {
    fakeState = state
  },
}))

vi.mock('./app-registry', () => ({
  getAppUrl: (app: string, endpoint: string) => `http://${app}:3000${endpoint}`,
}))

vi.mock('./app-secrets', () => ({
  parseEnvFile: () => {
    const registry: Record<string, string> = {}
    for (const [app, creds] of Object.entries(credentials)) {
      if (!creds) {
        continue
      }
      const key = app.toUpperCase().replace(/-/g, '_')
      registry[`LOGIN_CANARY_${key}_EMAIL`] = creds.email
      registry[`LOGIN_CANARY_${key}_PASSWORD`] = creds.password
    }
    return registry
  },
}))

function fakeFetch(
  url: string,
): Promise<{ ok: boolean; status: number; statusText: string; text: () => Promise<string> }> {
  const app = url.split('://')[1]?.split(':')[0] ?? ''
  const result = responses[app]

  if (result instanceof Error) {
    return Promise.reject(result)
  }
  if (!result) {
    return Promise.reject(new Error(`no fake response configured for ${app}`))
  }

  return Promise.resolve({
    ok: result.status < 400,
    status: result.status,
    statusText: result.status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(''),
  })
}

vi.stubGlobal('fetch', vi.fn(fakeFetch))

const { runLoginCanaryCheck, LOGIN_CANARY_APPS } = await import('./login-canary')

describe('runLoginCanaryCheck', () => {
  beforeEach(() => {
    postDashboardAlert.mockClear()
    postDashboardAlert.mockImplementation(async () => true)
    fakeState = {}
    responses = {}
    credentials = {}
  })

  it('приложение без учётных данных в реестре — тихо пропускается (configured: false)', async () => {
    const result = await runLoginCanaryCheck()

    expect(result.checked).toHaveLength(LOGIN_CANARY_APPS.length)
    expect(result.checked.every((entry) => !entry.configured)).toBe(true)
    expect(result.alerted).toBe(false)
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('все сконфигурированные приложения отвечают 200 — алерта нет', async () => {
    credentials.dashboard = { email: 'canary@letar.best', password: 'x' }
    credentials.aboi = { email: 'canary@letar.best', password: 'x' }
    responses = { dashboard: { status: 200 }, aboi: { status: 200 } }

    const result = await runLoginCanaryCheck()

    expect(result.alerted).toBe(false)
    expect(postDashboardAlert).not.toHaveBeenCalled()
    const configured = result.checked.filter((entry) => entry.configured)
    expect(configured.every((entry) => entry.ok)).toBe(true)
  })

  it('одно приложение отвечает не 200 — первая неудача алерта ещё не даёт (порог 2)', async () => {
    credentials.dashboard = { email: 'canary@letar.best', password: 'x' }
    responses = { dashboard: { status: 401 } }

    const result = await runLoginCanaryCheck()

    expect(result.alerted).toBe(false)
    const dashboardEntry = result.checked.find((entry) => entry.app === 'dashboard')
    expect(dashboardEntry?.ok).toBe(false)
    expect(dashboardEntry?.statusCode).toBe(401)
  })

  it('две неудачи подряд — алерт с типом AUTH_LOGIN_CANARY_FAILED', async () => {
    credentials.dashboard = { email: 'canary@letar.best', password: 'x' }
    responses = { dashboard: { status: 500 } }

    await runLoginCanaryCheck()
    postDashboardAlert.mockClear()
    const result = await runLoginCanaryCheck()

    expect(result.alerted).toBe(true)
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
    const alert = postDashboardAlert.mock.calls[0]?.[0] as { type: string; metadata: { failed: unknown[] } }
    expect(alert.type).toBe('AUTH_LOGIN_CANARY_FAILED')
    expect(alert.metadata.failed).toHaveLength(1)
  })

  it('сетевая ошибка (fetch reject) считается неудачей, а не молчаливым пропуском', async () => {
    credentials.dashboard = { email: 'canary@letar.best', password: 'x' }
    responses = { dashboard: new Error('ECONNREFUSED') }

    const result = await runLoginCanaryCheck()

    const entry = result.checked.find((e) => e.app === 'dashboard')
    expect(entry?.configured).toBe(true)
    expect(entry?.ok).toBe(false)
    expect(entry?.error).toContain('ECONNREFUSED')
  })

  it('между удвоениями не спамит', async () => {
    credentials.dashboard = { email: 'canary@letar.best', password: 'x' }
    responses = { dashboard: { status: 401 } }

    await runLoginCanaryCheck() // 1 — ниже порога
    await runLoginCanaryCheck() // 2 — алерт, alertedAtFailures=2
    postDashboardAlert.mockClear()
    const third = await runLoginCanaryCheck() // 3 — не удвоение (3 < 2*2)

    expect(third.alerted).toBe(false)
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('чистый прогон после находки сбрасывает состояние', async () => {
    credentials.dashboard = { email: 'canary@letar.best', password: 'x' }
    responses = { dashboard: { status: 401 } }
    await runLoginCanaryCheck()
    await runLoginCanaryCheck() // алерт, состояние "грязное"

    responses = { dashboard: { status: 200 } }
    await runLoginCanaryCheck() // чисто — сброс

    responses = { dashboard: { status: 401 } }
    await runLoginCanaryCheck() // 1-я неудача после сброса
    postDashboardAlert.mockClear()
    const result = await runLoginCanaryCheck() // 2-я — снова алерт с начала, не как 4-я

    expect(result.alerted).toBe(true)
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
  })
})
