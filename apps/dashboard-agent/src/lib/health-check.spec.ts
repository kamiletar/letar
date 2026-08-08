/**
 * Тесты health-check.ts — фокус на дефекте того же класса, что §62 (email-canary): все три
 * механизма дедупликации (метрики, контейнеры, БД) обновляли состояние безусловно, не проверяя
 * boolean-возврат `postDashboardAlert()`. Недоставленный алерт помечался как "уже уведомили" —
 * и до восстановления метрики/контейнера/БД повтор не наступал никогда.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const postDashboardAlert = vi.fn(async () => true)
let fakeState: Record<string, unknown> = {}

vi.mock('./dashboard-alert', () => ({
  postDashboardAlert: (...args: unknown[]) => postDashboardAlert(...(args as [])),
}))

vi.mock('./json-state-file', () => ({
  // Клонируем при каждом чтении — как настоящий JSON.parse(readFileSync(...)) на диске.
  // Без клона `fallback`/`fakeState` возвращались бы по ссылке, и мутация состояния внутри
  // health-check.ts (`state.metricsAlerted[key] = ...`) утекала бы между независимыми
  // прогонами теста через общий объект-синглтон EMPTY_STATE.
  loadJsonState: (_path: string, fallback: unknown) =>
    JSON.parse(JSON.stringify(Object.keys(fakeState).length > 0 ? fakeState : fallback)),
  saveJsonState: (_path: string, state: unknown) => {
    fakeState = state as Record<string, unknown>
  },
}))

const getCPUInfo = vi.fn(async () => ({ currentLoad: 10 }))
const getMemoryInfo = vi.fn(async () => ({ usedPercent: 10 }))
const getDiskInfo = vi.fn(async () => [] as Array<{ mount: string; usedPercent: number }>)

vi.mock('./system', () => ({
  getCPUInfo: (...args: unknown[]) => getCPUInfo(...(args as [])),
  getMemoryInfo: (...args: unknown[]) => getMemoryInfo(...(args as [])),
  getDiskInfo: (...args: unknown[]) => getDiskInfo(...(args as [])),
}))

const getContainers = vi.fn(async () => [] as Array<{ id: string; name: string; state: string; status: string }>)

vi.mock('./docker', () => ({
  getContainers: (...args: unknown[]) => getContainers(...(args as [])),
}))

const getAllDatabaseStatuses = vi.fn(async () =>
  [] as Array<{
    name: string
    database: string
    host: string
    port: number
    containerStatus: { running: boolean; containerName: string }
    connectionOk: boolean
  }>
)

vi.mock('./database', () => ({
  getAllDatabaseStatuses: (...args: unknown[]) => getAllDatabaseStatuses(...(args as [])),
}))

const { runHealthCheck } = await import('./health-check')

describe('runHealthCheck — метрики', () => {
  beforeEach(() => {
    postDashboardAlert.mockClear()
    postDashboardAlert.mockResolvedValue(true)
    fakeState = {}
    getCPUInfo.mockResolvedValue({ currentLoad: 10 })
    getMemoryInfo.mockResolvedValue({ usedPercent: 10 })
    getDiskInfo.mockResolvedValue([])
    getContainers.mockResolvedValue([])
    getAllDatabaseStatuses.mockResolvedValue([])
  })

  it('CPU ниже порога — алерта нет', async () => {
    const result = await runHealthCheck()
    expect(result.alertsTriggered).not.toContain('CPU_HIGH')
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('CPU выше порога, алерт доставлен — не повторяется на следующем прогоне', async () => {
    getCPUInfo.mockResolvedValue({ currentLoad: 95 })

    const first = await runHealthCheck()
    expect(first.alertsTriggered).toContain('CPU_HIGH')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)

    postDashboardAlert.mockClear()
    const second = await runHealthCheck()
    expect(second.alertsTriggered).not.toContain('CPU_HIGH')
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('CPU выше порога, доставка провалилась — следующий прогон повторяет попытку', async () => {
    getCPUInfo.mockResolvedValue({ currentLoad: 95 })
    postDashboardAlert.mockResolvedValue(false)

    const first = await runHealthCheck()
    expect(first.alertsTriggered).toContain('CPU_HIGH')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)

    postDashboardAlert.mockClear()
    const second = await runHealthCheck()
    expect(second.alertsTriggered).toContain('CPU_HIGH')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
  })

  it('восстановление ниже порога сбрасывает дедуп — новый эпизод снова алертит', async () => {
    getCPUInfo.mockResolvedValue({ currentLoad: 95 })
    await runHealthCheck()

    getCPUInfo.mockResolvedValue({ currentLoad: 10 })
    await runHealthCheck()

    getCPUInfo.mockResolvedValue({ currentLoad: 95 })
    postDashboardAlert.mockClear()
    const result = await runHealthCheck()

    expect(result.alertsTriggered).toContain('CPU_HIGH')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
  })
})

describe('runHealthCheck — контейнеры', () => {
  beforeEach(() => {
    postDashboardAlert.mockClear()
    postDashboardAlert.mockResolvedValue(true)
    fakeState = {}
    getCPUInfo.mockResolvedValue({ currentLoad: 10 })
    getMemoryInfo.mockResolvedValue({ usedPercent: 10 })
    getDiskInfo.mockResolvedValue([])
    getAllDatabaseStatuses.mockResolvedValue([])
  })

  it('переход running → exited, доставка провалилась — следующий прогон повторяет CONTAINER_DOWN', async () => {
    getContainers.mockResolvedValue([{ id: 'c1', name: 'app', state: 'running', status: 'Up' }])
    await runHealthCheck()

    getContainers.mockResolvedValue([{ id: 'c1', name: 'app', state: 'exited', status: 'Exited (1)' }])
    postDashboardAlert.mockResolvedValue(false)
    const first = await runHealthCheck()
    expect(first.alertsTriggered).toContain('CONTAINER_DOWN')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)

    postDashboardAlert.mockClear()
    const second = await runHealthCheck()
    expect(second.alertsTriggered).toContain('CONTAINER_DOWN')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
  })

  it('переход running → exited, доставка успешна — повтор не наступает', async () => {
    getContainers.mockResolvedValue([{ id: 'c1', name: 'app', state: 'running', status: 'Up' }])
    await runHealthCheck()

    getContainers.mockResolvedValue([{ id: 'c1', name: 'app', state: 'exited', status: 'Exited (1)' }])
    const first = await runHealthCheck()
    expect(first.alertsTriggered).toContain('CONTAINER_DOWN')

    postDashboardAlert.mockClear()
    const second = await runHealthCheck()
    expect(second.alertsTriggered).not.toContain('CONTAINER_DOWN')
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })
})

describe('runHealthCheck — БД', () => {
  beforeEach(() => {
    postDashboardAlert.mockClear()
    postDashboardAlert.mockResolvedValue(true)
    fakeState = {}
    getCPUInfo.mockResolvedValue({ currentLoad: 10 })
    getMemoryInfo.mockResolvedValue({ usedPercent: 10 })
    getDiskInfo.mockResolvedValue([])
    getContainers.mockResolvedValue([])
  })

  function dbStatus(connectionOk: boolean) {
    return [{
      name: 'kami',
      database: 'kami',
      host: '127.0.0.1',
      port: 5432,
      containerStatus: { running: true, containerName: 'kami-postgres' },
      connectionOk,
    }]
  }

  it('БД недоступна, доставка провалилась — следующий прогон повторяет DATABASE_DOWN', async () => {
    getAllDatabaseStatuses.mockResolvedValue(dbStatus(false))
    postDashboardAlert.mockResolvedValue(false)

    const first = await runHealthCheck()
    expect(first.alertsTriggered).toContain('DATABASE_DOWN')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)

    postDashboardAlert.mockClear()
    const second = await runHealthCheck()
    expect(second.alertsTriggered).toContain('DATABASE_DOWN')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
  })

  it('БД недоступна, доставка успешна — повтор не наступает, пока не восстановится', async () => {
    getAllDatabaseStatuses.mockResolvedValue(dbStatus(false))

    const first = await runHealthCheck()
    expect(first.alertsTriggered).toContain('DATABASE_DOWN')

    postDashboardAlert.mockClear()
    const second = await runHealthCheck()
    expect(second.alertsTriggered).not.toContain('DATABASE_DOWN')
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })
})
