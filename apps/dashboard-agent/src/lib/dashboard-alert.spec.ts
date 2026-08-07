import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearEnvCache } from './app-secrets'
import { postDashboardAlert } from './dashboard-alert'

/**
 * Регрессия §52: канал алертов был единственным сторожем cron-задач и молчал восемь дней.
 * Отправка не проверяла результат `fetch` вообще — не-2xx ответ уходил в тишину, и провал
 * сторожа выглядел неотличимо от «всё хорошо». Эти тесты фиксируют обратное: каждая причина
 * недоставки обязана оставить строку в логе.
 */
describe('postDashboardAlert', () => {
  let secretsDir: string
  const originalSecretsDir = process.env.SECRETS_DIR
  let errorSpy: ReturnType<typeof vi.spyOn>

  const alert = {
    type: 'CRON_FAILED' as const,
    severity: 'ERROR' as const,
    title: 'Cron задача провалилась: тест',
    message: 'HTTP 401: Unauthorized',
  }

  beforeEach(() => {
    secretsDir = mkdtempSync(path.join(tmpdir(), 'dashboard-alert-'))
    process.env.SECRETS_DIR = secretsDir
    clearEnvCache()
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    rmSync(secretsDir, { recursive: true, force: true })
    process.env.SECRETS_DIR = originalSecretsDir
    clearEnvCache()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function writeDashboardSecret(): void {
    writeFileSync(path.join(secretsDir, 'dashboard.env'), 'CRON_SECRET=секрет-дашборда\n')
  }

  function loggedText(): string {
    return errorSpy.mock.calls.map((call) => call.map(String).join(' ')).join('\n')
  }

  it('шлёт секрет dashboard, а не агента', async () => {
    writeDashboardSecret()
    process.env.CRON_SECRET = 'секрет-агента'
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await postDashboardAlert(alert)

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['X-Cron-Secret']).toBe('секрет-дашборда')
  })

  // Ядро регрессии: раньше здесь не было ни проверки, ни записи в лог.
  it('логирует не-2xx ответ вместе с телом', async () => {
    writeDashboardSecret()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"Unauthorized"}', { status: 401 })))

    await postDashboardAlert(alert)

    expect(loggedText()).toContain('401')
    expect(loggedText()).toContain('Unauthorized')
  })

  it('на успешном ответе молчит', async () => {
    writeDashboardSecret()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"success":true}', { status: 200 })))

    await postDashboardAlert(alert)

    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('логирует исключение fetch и не бросает его наружу', async () => {
    writeDashboardSecret()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')))

    await expect(postDashboardAlert(alert)).resolves.toBeUndefined()
    expect(loggedText()).toContain('ECONNREFUSED')
  })

  it('без секрета dashboard не отправляет запрос вовсе', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await postDashboardAlert(alert)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(loggedText()).toContain('dashboard')
  })
})
