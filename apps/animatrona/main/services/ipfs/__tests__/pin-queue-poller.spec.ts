import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../utils/db', () => ({ prisma: {} }))
vi.mock('../../../utils/logger', () => ({
  createModuleLogger: () => ({
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  }),
}))
vi.mock('../pin-status-service', () => ({
  markAsFailed: async () => undefined,
  markAsPinnedRemote: async () => undefined,
  markAsQueued: async () => undefined,
}))

const { cancelRemotePin, pinQueueAuthToken, queueRemotePin } = await import('../pin-queue-poller')

/**
 * Регрессия: токен доступа к pin-queue был вписан в исходник строкой и лежал в публичном
 * репозитории с первого коммита. Эти тесты закрепляют два свойства — секрет берётся только из
 * окружения, и при его отсутствии запрос НЕ уходит вовсе (иначе сервер ответит 401, неотличимым
 * от настоящей проблемы авторизации).
 */
describe('pin-queue: доступ по токену', () => {
  const originalToken = process.env.PIN_QUEUE_AUTH_TOKEN

  beforeEach(() => {
    process.env.PIN_QUEUE_AUTH_TOKEN = 'токен-из-окружения'
  })

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.PIN_QUEUE_AUTH_TOKEN
    } else {
      process.env.PIN_QUEUE_AUTH_TOKEN = originalToken
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('pinQueueAuthToken', () => {
    it('берёт значение из окружения', () => {
      expect(pinQueueAuthToken()).toBe('токен-из-окружения')
    })

    it('без переменной бросает ошибку, называющую её имя', () => {
      delete process.env.PIN_QUEUE_AUTH_TOKEN

      expect(() => pinQueueAuthToken()).toThrowError(/PIN_QUEUE_AUTH_TOKEN/)
    })

    it('пустая строка приравнивается к отсутствию', () => {
      process.env.PIN_QUEUE_AUTH_TOKEN = ''

      expect(() => pinQueueAuthToken()).toThrowError(/PIN_QUEUE_AUTH_TOKEN/)
    })
  })

  describe('запросы к сервису', () => {
    it('подставляет токен в заголовок Authorization', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)

      await queueRemotePin('bafyTest')

      const [, init] = fetchMock.mock.calls[0]
      expect(init.headers.Authorization).toBe('Bearer токен-из-окружения')
    })

    // Ядро регрессии: без секрета запрос не должен уходить ВООБЩЕ.
    it('без токена не отправляет запрос', async () => {
      delete process.env.PIN_QUEUE_AUTH_TOKEN
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      await expect(queueRemotePin('bafyTest')).rejects.toThrowError(/PIN_QUEUE_AUTH_TOKEN/)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('то же самое для отмены пина', async () => {
      delete process.env.PIN_QUEUE_AUTH_TOKEN
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      await expect(cancelRemotePin('bafyTest')).rejects.toThrowError(/PIN_QUEUE_AUTH_TOKEN/)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('адрес сервиса', () => {
    // Раньше здесь стоял http://mail.letar.best:42080 — сервер, на котором этот порт не слушает
    // никто (сам pin-queue на s3), и вдобавок открытая схема для запроса с токеном.
    it('по умолчанию https, а не открытый http', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)

      await queueRemotePin('bafyTest')

      expect(String(fetchMock.mock.calls[0][0])).toMatch(/^https:\/\//)
    })
  })
})
