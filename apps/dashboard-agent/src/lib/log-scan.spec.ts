/**
 * Тесты log-scan.ts — тот же класс дефекта, что §62: `postDashboardAlert()` вызывался без
 * проверки boolean-возврата, а курсор `lastSeenAt` продвигался безусловно. Недоставленный
 * алерт об ошибках в логах терял эти строки навсегда — курсор уже ушёл вперёд, при следующем
 * сканировании они больше не попадали в "новые".
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const postDashboardAlert = vi.fn(async () => true)
let fakeState: Record<string, unknown> = {}

vi.mock('./dashboard-alert', () => ({
  postDashboardAlert: (...args: unknown[]) => postDashboardAlert(...(args as [])),
}))

vi.mock('./json-state-file', () => ({
  // Клонируем при каждом чтении — как настоящий JSON.parse(readFileSync(...)) на диске,
  // чтобы состояние не утекало между тестами через общий объект-ссылку.
  loadJsonState: (_path: string, fallback: unknown) =>
    JSON.parse(JSON.stringify(Object.keys(fakeState).length > 0 ? fakeState : fallback)),
  saveJsonState: (_path: string, state: unknown) => {
    fakeState = state as Record<string, unknown>
  },
}))

const getContainers = vi.fn(async () => [{ id: 'c1', name: 'app', state: 'running', status: 'Up' }])
const getContainerLogs = vi.fn(async () => ({ stdout: '', stderr: '' }))

vi.mock('./docker', () => ({
  getContainers: (...args: unknown[]) => getContainers(...(args as [])),
  getContainerLogs: (...args: unknown[]) => getContainerLogs(...(args as [])),
}))

const { runLogScan } = await import('./log-scan')

function logLine(iso: string, text: string): string {
  return `${iso} ${text}`
}

/** Timestamp гарантированно позже курсора, инициализированного на реальное "сейчас" в предыдущем прогоне. */
function futureIso(offsetMs = 60_000): string {
  return new Date(Date.now() + offsetMs).toISOString()
}

describe('runLogScan', () => {
  beforeEach(() => {
    postDashboardAlert.mockClear()
    postDashboardAlert.mockResolvedValue(true)
    fakeState = {}
    getContainers.mockResolvedValue([{ id: 'c1', name: 'app', state: 'running', status: 'Up' }])
    getContainerLogs.mockResolvedValue({ stdout: '', stderr: '' })
  })

  it('контейнер встречен впервые — курсор инициализируется, алерта нет (без шквала по бэклогу)', async () => {
    getContainerLogs.mockResolvedValue({
      stdout: logLine('2026-08-08T10:00:00.000Z', 'FATAL: something broke'),
      stderr: '',
    })

    const result = await runLogScan()

    expect(result.alertsTriggered).toHaveLength(0)
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('новая ошибка после инициализации курсора — алерт доставлен, курсор продвинут', async () => {
    getContainerLogs.mockResolvedValue({ stdout: '', stderr: '' })
    await runLogScan()

    getContainerLogs.mockResolvedValue({
      stdout: logLine(futureIso(), 'ERROR: db timeout'),
      stderr: '',
    })
    const result = await runLogScan()

    expect(result.alertsTriggered).toContain('app')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)

    // Курсор продвинут — то же самое сообщение при следующем сканировании больше не новое.
    postDashboardAlert.mockClear()
    const third = await runLogScan()
    expect(third.alertsTriggered).not.toContain('app')
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('доставка алерта провалилась — ошибка не теряется, следующий прогон повторяет попытку', async () => {
    getContainerLogs.mockResolvedValue({ stdout: '', stderr: '' })
    await runLogScan()

    getContainerLogs.mockResolvedValue({
      stdout: logLine(futureIso(), 'ERROR: db timeout'),
      stderr: '',
    })
    postDashboardAlert.mockResolvedValue(false)

    const first = await runLogScan()
    expect(first.alertsTriggered).toContain('app')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)

    postDashboardAlert.mockClear()
    const second = await runLogScan()
    expect(second.alertsTriggered).toContain('app')
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
  })

  it('после успешной доставки повторной попытки на следующем прогоне нет', async () => {
    getContainerLogs.mockResolvedValue({ stdout: '', stderr: '' })
    await runLogScan()

    getContainerLogs.mockResolvedValue({
      stdout: logLine(futureIso(), 'ERROR: db timeout'),
      stderr: '',
    })
    const first = await runLogScan()
    expect(first.alertsTriggered).toContain('app')

    postDashboardAlert.mockClear()
    const second = await runLogScan()
    expect(second.alertsTriggered).not.toContain('app')
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })
})
