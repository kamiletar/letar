/**
 * Тесты проверки сроков сертификатов: главное — решения про алерт.
 *
 * Регрессия инцидента 2026-09-20: проверка целиком зависела от NPM, которого на s2 давно нет,
 * ошибка возвращалась значением и обрабатывалась молча, сертификат почты истёк незамеченным.
 * Поэтому здесь отдельно закреплено: недоступный NPM не мешает прямой проверке, а недоступная
 * цель не закрывает активный алерт и не выглядит как «всё хорошо».
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAlert = vi.fn()
const resolveAlertsByType = vi.fn()
const getAlertSettings = vi.fn()
const markAlertNotified = vi.fn()
const sendNotification = vi.fn()
const getCertificates = vi.fn()
const probeCertificate = vi.fn()

vi.mock('@/lib/alerts', () => ({
  AlertSeverity: { WARNING: 'WARNING', ERROR: 'ERROR', CRITICAL: 'CRITICAL' },
  AlertType: { SSL_EXPIRING: 'SSL_EXPIRING' },
  createAlert: (...args: unknown[]) => createAlert(...args),
  resolveAlertsByType: (...args: unknown[]) => resolveAlertsByType(...args),
  getAlertSettings: (...args: unknown[]) => getAlertSettings(...args),
  markAlertNotified: (...args: unknown[]) => markAlertNotified(...args),
}))
vi.mock('@/lib/notifications', () => ({
  sendNotification: (...args: unknown[]) => sendNotification(...args),
}))
vi.mock('@/lib/nginx-proxy-manager', () => ({
  npmApi: { getCertificates: (...args: unknown[]) => getCertificates(...args) },
}))
vi.mock('@/lib/tls-cert-probe', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/tls-cert-probe')>()
  return { ...original, probeCertificate: (...args: unknown[]) => probeCertificate(...args) }
})

const { checkSslCertificates } = await import('./ssl-monitor')

const ok = (target: string, days: number) => ({ target, validTo: new Date(), daysUntilExpiry: days })
const unreachable = (target: string, error: string) => ({ target, validTo: null, daysUntilExpiry: null, error })

beforeEach(() => {
  delete process.env.SSL_CHECK_TARGETS
  createAlert.mockReset().mockResolvedValue({ id: 'alert-1' })
  resolveAlertsByType.mockReset()
  getAlertSettings.mockReset().mockResolvedValue({
    enabled: true,
    telegramEnabled: true,
    telegramBotToken: 't',
    telegramChatId: 'c',
  })
  markAlertNotified.mockReset()
  sendNotification.mockReset().mockResolvedValue(true)
  // По умолчанию NPM недоступен — как на s2 после его удаления
  getCertificates.mockReset().mockRejectedValue(new Error('getaddrinfo ENOTFOUND nginx-proxy-manager-app-1'))
  probeCertificate.mockReset()
})

describe('checkSslCertificates', () => {
  it('NPM недоступен, почтовый сертификат в порядке — алерт закрывается, NPM не считается ошибкой проверки', async () => {
    probeCertificate.mockImplementation(async ({ host, port }) => ok(`${host}:${port}`, 60))

    const result = await checkSslCertificates()

    expect(createAlert).not.toHaveBeenCalled()
    expect(resolveAlertsByType).toHaveBeenCalledWith('SSL_EXPIRING')
    expect(result.probeErrors).toEqual([])
    expect(result.npmError).toMatch(/ENOTFOUND/)
    expect(result.checked).toBe(2)
  })

  it('по умолчанию проверяет оба порта Maddy, цели можно переопределить через env', async () => {
    probeCertificate.mockImplementation(async ({ host, port }) => ok(`${host}:${port}`, 60))

    await checkSslCertificates()
    expect(probeCertificate.mock.calls.map(([target]) => `${target.host}:${target.port}`)).toEqual([
      'mail.letar.best:993',
      'mail.letar.best:465',
    ])

    probeCertificate.mockClear()
    process.env.SSL_CHECK_TARGETS = 'other.example:443'
    await checkSslCertificates()
    expect(probeCertificate.mock.calls.map(([target]) => `${target.host}:${target.port}`)).toEqual([
      'other.example:443',
    ])
  })

  it('до истечения меньше 30 дней — WARNING со списком и уведомлением в Telegram', async () => {
    probeCertificate.mockImplementation(async ({ host, port }) => ok(`${host}:${port}`, 12))

    await checkSslCertificates()

    expect(resolveAlertsByType).not.toHaveBeenCalled()
    expect(createAlert).toHaveBeenCalledTimes(1)
    const [type, severity, title, message] = createAlert.mock.calls[0]!
    expect(type).toBe('SSL_EXPIRING')
    expect(severity).toBe('WARNING')
    expect(title).toBe('SSL: 2 сертификата(ов) требуют внимания')
    expect(message).toContain('• mail.letar.best:993 — истекает через 12 дн.')
    expect(sendNotification).toHaveBeenCalled()
    expect(markAlertNotified).toHaveBeenCalledWith('alert-1', true)
  })

  it('7 дней и меньше — ERROR', async () => {
    probeCertificate.mockImplementation(async ({ host, port }) => ok(`${host}:${port}`, 7))
    await checkSslCertificates()
    expect(createAlert.mock.calls[0]![1]).toBe('ERROR')
  })

  it('уже истёк — CRITICAL с понятной формулировкой (сценарий 2026-09-20)', async () => {
    probeCertificate.mockImplementation(async ({ host, port }) => ok(`${host}:${port}`, -1))

    await checkSslCertificates()

    const [, severity, , message] = createAlert.mock.calls[0]!
    expect(severity).toBe('CRITICAL')
    expect(message).toContain('• mail.letar.best:993 — истёк 1 дн. назад')
  })

  it('один сертификат проблемный — заголовок называет его по имени', async () => {
    process.env.SSL_CHECK_TARGETS = 'mail.letar.best:993'
    probeCertificate.mockResolvedValue(ok('mail.letar.best:993', 3))

    await checkSslCertificates()

    expect(createAlert.mock.calls[0]![2]).toBe('SSL сертификат скоро истекает: mail.letar.best:993')
  })

  it('цель недоступна, остальное в порядке — алерт НЕ закрываем и новый не создаём, ошибка возвращается', async () => {
    probeCertificate
      .mockResolvedValueOnce(ok('mail.letar.best:993', 60))
      .mockResolvedValueOnce(unreachable('mail.letar.best:465', 'connect ECONNREFUSED'))

    const result = await checkSslCertificates()

    expect(resolveAlertsByType).not.toHaveBeenCalled()
    expect(createAlert).not.toHaveBeenCalled()
    expect(result.probeErrors).toEqual(['mail.letar.best:465 — connect ECONNREFUSED'])
  })

  it('одна цель истекает, другая недоступна — алерт по истекающей создаётся, недоступность не глушит его', async () => {
    probeCertificate
      .mockResolvedValueOnce(ok('mail.letar.best:993', 5))
      .mockResolvedValueOnce(unreachable('mail.letar.best:465', 'таймаут 10000 мс'))

    const result = await checkSslCertificates()

    expect(createAlert).toHaveBeenCalledTimes(1)
    expect(createAlert.mock.calls[0]![1]).toBe('ERROR')
    expect(result.probeErrors).toHaveLength(1)
  })

  it('недоступны все цели — ничего не закрываем и не создаём', async () => {
    probeCertificate.mockImplementation(async ({ host, port }) => unreachable(`${host}:${port}`, 'ECONNREFUSED'))

    const result = await checkSslCertificates()

    expect(resolveAlertsByType).not.toHaveBeenCalled()
    expect(createAlert).not.toHaveBeenCalled()
    expect(result.checked).toBe(0)
    expect(result.probeErrors).toHaveLength(2)
  })

  it('NPM доступен — его сертификаты учитываются вместе с прямыми проверками', async () => {
    getCertificates.mockResolvedValue([
      {
        id: 1,
        nice_name: 'old.example',
        domain_names: ['old.example'],
        expires_on: new Date(Date.now() - 86_400_000 * 2).toISOString(),
      },
    ])
    probeCertificate.mockImplementation(async ({ host, port }) => ok(`${host}:${port}`, 60))

    const result = await checkSslCertificates()

    expect(result.npmError).toBeUndefined()
    expect(result.checked).toBe(3)
    expect(createAlert.mock.calls[0]![1]).toBe('CRITICAL')
    expect(createAlert.mock.calls[0]![2]).toBe('SSL сертификат скоро истекает: old.example')
  })

  it('уведомления в Telegram выключены в настройках — алерт создаётся, отправки нет', async () => {
    getAlertSettings.mockResolvedValue({ enabled: false })
    probeCertificate.mockImplementation(async ({ host, port }) => ok(`${host}:${port}`, 3))

    await checkSslCertificates()

    expect(createAlert).toHaveBeenCalled()
    expect(sendNotification).not.toHaveBeenCalled()
  })
})
