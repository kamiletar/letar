/**
 * Тесты проверки NULL-регрессии `Account.issuer` (better-auth 1.7).
 *
 * Настоящее подключение к БД замокано (`pg` `Client`) — проверяется логика агрегации по
 * приложениям и повтор алерта, а не сам SQL. Паттерн тестов и мок состояния — как у
 * `backup-freshness.spec.ts` (то же семейство регрессии §62: булев `alerted` слался один раз
 * и глушил уведомления навсегда).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const postDashboardAlert = vi.fn(async () => true)
let fakeState: Record<string, unknown> = {}
let queryResults: Record<string, number | Error> = {}
let connectedDatabases: string[] = []

vi.mock('./dashboard-alert', () => ({
  postDashboardAlert: (...args: unknown[]) => postDashboardAlert(...(args as [])),
}))

vi.mock('./json-state-file', () => ({
  loadJsonState: () => fakeState,
  saveJsonState: (_path: string, state: Record<string, unknown>) => {
    fakeState = state
  },
}))

vi.mock('./database', () => ({
  getDbConfig: (name: string) => {
    if (!(name in queryResults)) {
      return undefined
    }
    return {
      name,
      containerName: `${name}-db`,
      host: `${name}-db`,
      port: 5432,
      database: name,
      user: name,
      password: 'x',
    }
  },
}))

vi.mock('pg', () => ({
  Client: class {
    database: string
    constructor(config: { database: string }) {
      this.database = config.database
    }

    async connect(): Promise<void> {
      connectedDatabases.push(this.database)
    }

    async query(): Promise<{ rows: Array<{ count: string }> }> {
      const result = queryResults[this.database]
      if (result instanceof Error) {
        throw result
      }
      return { rows: [{ count: String(result ?? 0) }] }
    }

    async end(): Promise<void> {}
  },
}))

const { runAccountIssuerCheck } = await import('./account-issuer-check')

describe('runAccountIssuerCheck', () => {
  beforeEach(() => {
    postDashboardAlert.mockClear()
    postDashboardAlert.mockImplementation(async () => true)
    fakeState = {}
    queryResults = {}
    connectedDatabases = []
  })

  it('нет NULL ни в одном приложении — алерта нет', async () => {
    queryResults = { dashboard: 0, archetest: 0 }

    const result = await runAccountIssuerCheck()

    expect(result.alerted).toBe(false)
    expect(postDashboardAlert).not.toHaveBeenCalled()
    expect(result.checked.every((entry) => entry.nullCount === 0)).toBe(true)
  })

  it('приложения без конфига на этом сервере тихо пропускаются', async () => {
    queryResults = { dashboard: 0 }

    const result = await runAccountIssuerCheck()

    expect(result.checked).toHaveLength(1)
    expect(result.checked[0]?.app).toBe('dashboard')
  })

  it('NULL найден — алерт с первой же находки, метаданные содержат затронутое приложение', async () => {
    queryResults = { dashboard: 3, archetest: 0 }

    const result = await runAccountIssuerCheck()

    expect(result.alerted).toBe(true)
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
    const alert = postDashboardAlert.mock.calls[0]?.[0] as { type: string; metadata: { affected: unknown[] } }
    expect(alert.type).toBe('AUTH_ACCOUNT_ISSUER_NULL')
    expect(alert.metadata.affected).toEqual([{ app: 'dashboard', nullCount: 3, error: null }])
  })

  it('ошибка подключения к одному приложению не маскируется как "чисто"', async () => {
    queryResults = { dashboard: 0, archetest: new Error('connection refused') }

    const result = await runAccountIssuerCheck()

    const archetestEntry = result.checked.find((entry) => entry.app === 'archetest')
    expect(archetestEntry?.nullCount).toBeNull()
    expect(archetestEntry?.error).toContain('connection refused')
    // Ошибка подключения сама по себе не создаёт AUTH_ACCOUNT_ISSUER_NULL — это отдельный класс
    // отказа (недоступность БД), не отсутствие issuer. Проверка не должна путать их.
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('повторяет алерт при удвоении числа неудачных прогонов подряд, а не молчит навсегда', async () => {
    queryResults = { dashboard: 1 }

    await runAccountIssuerCheck() // 1-я — алерт, alertedAtFailures=1
    postDashboardAlert.mockClear()
    const second = await runAccountIssuerCheck() // 2-я — удвоение 1→2, алерт снова

    expect(second.alerted).toBe(true)
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
  })

  it('между удвоениями не спамит', async () => {
    queryResults = { dashboard: 1 }

    await runAccountIssuerCheck() // 1 — алерт, alertedAtFailures=1
    await runAccountIssuerCheck() // 2 — удвоение, алерт, alertedAtFailures=2
    postDashboardAlert.mockClear()
    const third = await runAccountIssuerCheck() // 3 — не удвоение (3 < 2*2)

    expect(third.alerted).toBe(false)
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('чистый прогон после находки сбрасывает состояние', async () => {
    queryResults = { dashboard: 1 }
    await runAccountIssuerCheck() // алерт, состояние "грязное"

    queryResults = { dashboard: 0 }
    await runAccountIssuerCheck() // чисто — сброс

    queryResults = { dashboard: 1 }
    postDashboardAlert.mockClear()
    const result = await runAccountIssuerCheck() // снова 1-я неудача — алерт с начала, не как 3-я

    expect(result.alerted).toBe(true)
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
  })
})
