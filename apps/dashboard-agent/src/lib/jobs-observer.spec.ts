/**
 * Тесты наблюдателя за `@letar/jobs`-задачами (§75).
 *
 * Проверяются оба сигнала из находки пилота 13.08.2026 (PLAN-INFRA-4.md §75):
 * забытый `autoSchedule: false` и пропущенный тик задачи с `autoSchedule: true`. Плюс — тот же
 * класс регрессии, что уже чинился в email-canary/backup-freshness: алерт обязан повторяться,
 * пока проблема жива, а не уйти один раз и замолчать навсегда.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RemoteJobStatus } from './jobs-observer'

const postDashboardAlert = vi.fn(async () => true)
let fakeState: Record<string, unknown> = {}
/** app -> jobs | Error (Error имитирует сетевой сбой fetch) */
let responses: Record<string, RemoteJobStatus[] | Error> = {}

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
  getAppCronSecret: () => 'test-secret',
}))

function fakeFetch(
  url: string,
): Promise<{ ok: boolean; status: number; statusText: string; json: () => Promise<unknown> }> {
  const app = url.split('://')[1]?.split(':')[0] ?? ''
  const result = responses[app]

  if (result instanceof Error) {
    return Promise.reject(result)
  }
  if (!result) {
    return Promise.reject(new Error(`no fake response configured for ${app}`))
  }

  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ ok: true, jobs: result }),
  })
}

vi.stubGlobal('fetch', vi.fn(fakeFetch))

const { runJobsObserverCheck } = await import('./jobs-observer')

function job(overrides: Partial<RemoteJobStatus> = {}): RemoteJobStatus {
  return {
    id: 'test-job',
    name: 'Test Job',
    description: 'd',
    schedule: '* * * * *',
    hasOverride: false,
    enabled: true,
    lastRunAt: null,
    lastRunState: null,
    lastRunError: null,
    lastRunDurationMs: null,
    nextRunAt: null,
    autoSchedule: true,
    ...overrides,
  }
}

beforeEach(() => {
  fakeState = {}
  responses = {}
  postDashboardAlert.mockClear()
  postDashboardAlert.mockResolvedValue(true)
})

describe('runJobsObserverCheck — autoSchedule: false', () => {
  it('алертит на включённую задачу без автотика', async () => {
    responses.dashboard = [job({ autoSchedule: false })]
    // остальные 5 приложений тиража — молчаливо ok, чтобы не путать сигнал
    for (const app of ['driving-school', 'dsperevod', 'aboi', 'time', 'svoichuzhie']) {
      responses[app] = []
    }

    const result = await runJobsObserverCheck()

    const dashboardResult = result.apps.find((a) => a.app === 'dashboard')
    expect(dashboardResult?.jobs[0]?.noAutoScheduleAlerted).toBe(true)
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
    expect(postDashboardAlert.mock.calls[0][0]).toMatchObject({
      type: 'CRON_FAILED',
      metadata: { jobId: 'test-job', app: 'dashboard' },
    })
  })

  it('не алертит на выключенную задачу без автотика — это не ошибка, а сознательный enabled: false', async () => {
    responses.dashboard = [job({ enabled: false, autoSchedule: false })]
    for (const app of ['driving-school', 'dsperevod', 'aboi', 'time', 'svoichuzhie']) {
      responses[app] = []
    }

    await runJobsObserverCheck()

    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('повторяет алерт при удвоении числа опросов, не молчит навсегда', async () => {
    for (const app of ['driving-school', 'dsperevod', 'aboi', 'time', 'svoichuzhie']) {
      responses[app] = []
    }
    responses.dashboard = [job({ autoSchedule: false })]

    // Порог = 1, поэтому первый алерт уходит уже на consecutivePolls=1, а не при первом
    // достижении порога после серии молчания — та же формула shouldRepeatAlert (alert-policy.ts),
    // что у email-canary/backup-freshness: 1, 2, 4, 8… Три прогона подряд без сброса дают
    // алерты на 1-м и 2-м опросе (2*1), но не на 3-м (2*2=4 ещё не достигнуто).
    await runJobsObserverCheck()
    await runJobsObserverCheck()
    await runJobsObserverCheck()

    expect(postDashboardAlert).toHaveBeenCalledTimes(2)
  })

  it('сбрасывает состояние, как только autoSchedule снова true', async () => {
    for (const app of ['driving-school', 'dsperevod', 'aboi', 'time', 'svoichuzhie']) {
      responses[app] = []
    }
    responses.dashboard = [job({ autoSchedule: false })]
    await runJobsObserverCheck()
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)

    responses.dashboard = [job({ autoSchedule: true })]
    await runJobsObserverCheck()

    responses.dashboard = [job({ autoSchedule: false })]
    await runJobsObserverCheck()

    // Условие снималось и наступило заново — это новый эпизод, алерт снова на первом же опросе.
    expect(postDashboardAlert).toHaveBeenCalledTimes(2)
  })
})

describe('runJobsObserverCheck — пропущенный тик', () => {
  it('не алертит, пока ожидавшийся запуск ещё не наступил или в пределах запаса', async () => {
    for (const app of ['driving-school', 'dsperevod', 'aboi', 'time', 'svoichuzhie']) {
      responses[app] = []
    }
    const soon = new Date(Date.now() + 5 * 60_000).toISOString()
    responses.dashboard = [job({ nextRunAt: soon })]
    await runJobsObserverCheck()

    responses.dashboard = [job({ nextRunAt: soon })] // тот же момент, ещё не прошёл + запас
    await runJobsObserverCheck()

    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('алертит, если ожидавшийся запуск давно прошёл, а lastRunAt его не догнал', async () => {
    for (const app of ['driving-school', 'dsperevod', 'aboi', 'time', 'svoichuzhie']) {
      responses[app] = []
    }
    const past = new Date(Date.now() - 60 * 60_000).toISOString()
    // Первый опрос запоминает ожидавшийся запуск
    responses.dashboard = [job({ nextRunAt: past })]
    await runJobsObserverCheck()
    expect(postDashboardAlert).not.toHaveBeenCalled() // на первом опросе ещё нечего сравнивать

    // Второй опрос: то же время уже в прошлом с запасом, lastRunAt не появился
    responses.dashboard = [job({ nextRunAt: past, lastRunAt: null })]
    await runJobsObserverCheck()

    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
    expect(postDashboardAlert.mock.calls[0][0]).toMatchObject({
      type: 'CRON_FAILED',
      metadata: { jobId: 'test-job', app: 'dashboard' },
    })
  })

  it('не алертит, если lastRunAt обновился позже ожидавшегося запуска', async () => {
    for (const app of ['driving-school', 'dsperevod', 'aboi', 'time', 'svoichuzhie']) {
      responses[app] = []
    }
    const past = new Date(Date.now() - 60 * 60_000).toISOString()
    responses.dashboard = [job({ nextRunAt: past })]
    await runJobsObserverCheck()

    const ranAfter = new Date(Date.now() - 30 * 60_000).toISOString() // позже past, раньше now
    responses.dashboard = [job({ nextRunAt: past, lastRunAt: ranAfter, lastRunState: 'completed' })]
    await runJobsObserverCheck()

    expect(postDashboardAlert).not.toHaveBeenCalled()
  })
})

describe('runJobsObserverCheck — сбой самого опроса', () => {
  it('алертит, если приложение недоступно, и не путает это с пустым списком задач', async () => {
    for (const app of ['dsperevod', 'aboi', 'time', 'svoichuzhie']) {
      responses[app] = []
    }
    responses['driving-school'] = new Error('ECONNREFUSED')
    responses.dashboard = []

    const result = await runJobsObserverCheck()

    const drivingSchoolResult = result.apps.find((a) => a.app === 'driving-school')
    expect(drivingSchoolResult?.ok).toBe(false)
    expect(drivingSchoolResult?.fetchFailureAlerted).toBe(true)
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
  })

  it('доставленный алерт следует формуле удвоения, а не спамит каждый опрос', async () => {
    for (const app of ['dsperevod', 'aboi', 'time', 'svoichuzhie']) {
      responses[app] = []
    }
    responses.dashboard = []
    responses['driving-school'] = new Error('ECONNREFUSED')

    // Порог = 1: алерты на consecutivePolls 1 и 2 (2*1), молчание на 3 (2*2=4 ещё не достигнуто).
    await runJobsObserverCheck()
    await runJobsObserverCheck()
    await runJobsObserverCheck()

    expect(postDashboardAlert).toHaveBeenCalledTimes(2)
  })
})
