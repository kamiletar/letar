import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRedisClient } from './redis-client'

describe('createRedisClient', () => {
  const ENV_VAR = 'REDIS_CLIENT_TEST_URL'

  afterEach(() => {
    delete process.env[ENV_VAR]
    vi.restoreAllMocks()
  })

  it('возвращает null если переменная окружения и fallbackUrl не заданы', () => {
    const getRedis = createRedisClient({ envVar: ENV_VAR })
    expect(getRedis()).toBeNull()
  })

  it('возвращает null если задан только несуществующий envVar без fallbackUrl', () => {
    const getRedis = createRedisClient({ envVar: 'REDIS_CLIENT_TEST_URL_UNSET' })
    expect(getRedis()).toBeNull()
  })

  it('использует fallbackUrl если переменная окружения не задана', () => {
    const getRedis = createRedisClient({ envVar: ENV_VAR, fallbackUrl: 'redis://localhost:6379' })
    expect(getRedis()).not.toBeNull()
  })

  it('переиспользует один и тот же клиент между вызовами (singleton)', () => {
    process.env[ENV_VAR] = 'redis://localhost:6379'
    const getRedis = createRedisClient({ envVar: ENV_VAR })
    expect(getRedis()).toBe(getRedis())
  })

  it('разные инстансы createRedisClient() не шарят состояние', () => {
    process.env[ENV_VAR] = 'redis://localhost:6379'
    const getRedisA = createRedisClient({ envVar: ENV_VAR })
    const getRedisB = createRedisClient({ envVar: ENV_VAR })
    expect(getRedisA()).not.toBe(getRedisB())
  })

  it('по умолчанию отключает офлайн-очередь ioredis (fail-fast вместо зависания при недоступном Redis)', () => {
    process.env[ENV_VAR] = 'redis://localhost:6379'
    const getRedis = createRedisClient({ envVar: ENV_VAR })
    expect(getRedis()?.options.enableOfflineQueue).toBe(false)
  })

  it('redisOptions.enableOfflineQueue переопределяет дефолт', () => {
    process.env[ENV_VAR] = 'redis://localhost:6379'
    const getRedis = createRedisClient({ envVar: ENV_VAR, redisOptions: { enableOfflineQueue: true } })
    expect(getRedis()?.options.enableOfflineQueue).toBe(true)
  })
})

/**
 * Схлопывание повторяющихся ошибок подключения. При лежащем Redis `retryStrategy`
 * переподключается бесконечно, и событие `error` приходит вечно — печать каждого забивает
 * `docker logs` долгоживущих процессов. Проверяем: первая ошибка видна сразу, повторы молчат,
 * смена текста ошибки дублем не считается, восстановление подводит итог.
 *
 * События эмитим синхронно на самом клиенте: настоящий сокет здесь не нужен, а `disconnect()`
 * останавливает реальные попытки подключения, чтобы их ошибки не попадали в спаи.
 */
describe('createRedisClient — лог ошибок подключения', () => {
  const ENV_VAR = 'REDIS_CLIENT_LOG_TEST_URL'

  function makeClient(options: Parameters<typeof createRedisClient>[0] = {}) {
    process.env[ENV_VAR] = 'redis://127.0.0.1:6379'
    const client = createRedisClient({ envVar: ENV_VAR, ...options })()
    if (!client) {
      throw new Error('клиент не создан — проверь envVar в тесте')
    }
    client.disconnect()
    return client
  }

  function spies() {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Восстановление соединения и «не удалось подключиться» оба идут через console.warn
    const info = vi.spyOn(console, 'warn').mockImplementation(() => {})
    error.mockClear()
    info.mockClear()
    return { error, info }
  }

  afterEach(() => {
    delete process.env[ENV_VAR]
    vi.restoreAllMocks()
  })

  it('печатает первую ошибку сразу', () => {
    const client = makeClient()
    const { error } = spies()

    client.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:6379'))

    expect(error).toHaveBeenCalledTimes(1)
    expect(error.mock.calls[0]?.join(' ')).toContain('connect ECONNREFUSED')
  })

  it('не печатает повторы той же ошибки', () => {
    const client = makeClient()
    const { error } = spies()

    for (let i = 0; i < 10; i++) {
      client.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:6379'))
    }

    expect(error).toHaveBeenCalledTimes(1)
  })

  it('печатает ошибку с другим текстом — она не считается дублем', () => {
    const client = makeClient()
    const { error } = spies()

    client.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:6379'))
    client.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:6379'))
    client.emit('error', new Error('WRONGPASS invalid username-password pair'))

    expect(error).toHaveBeenCalledTimes(2)
    expect(error.mock.calls[1]?.join(' ')).toContain('WRONGPASS')
    // счётчик проглоченных повторов предыдущей ошибки не теряется
    expect(error.mock.calls[1]?.join(' ')).toContain('подавлено повторов предыдущей ошибки: 1')
  })

  it('при восстановлении соединения печатает одну строку с числом подавленных повторов', () => {
    const client = makeClient()
    const { error, info } = spies()

    for (let i = 0; i < 5; i++) {
      client.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:6379'))
    }
    client.emit('connect')

    expect(error).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledTimes(1)
    expect(info.mock.calls[0]?.join(' ')).toContain('Соединение восстановлено')
    expect(info.mock.calls[0]?.join(' ')).toContain('подавлено повторов: 4')
  })

  it('после восстановления та же ошибка снова печатается (счётчик сброшен)', () => {
    const client = makeClient()
    const { error } = spies()

    client.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:6379'))
    client.emit('connect')
    client.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:6379'))

    expect(error).toHaveBeenCalledTimes(2)
  })

  it('первое подключение без предшествующих ошибок ничего не печатает', () => {
    const client = makeClient()
    const { error, info } = spies()

    client.emit('connect')

    expect(error).not.toHaveBeenCalled()
    expect(info).not.toHaveBeenCalled()
  })

  it('silent: true подавляет и ошибки, и сообщение о восстановлении', () => {
    const client = makeClient({ silent: true })
    const { error, info } = spies()

    client.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:6379'))
    client.emit('error', new Error('WRONGPASS invalid username-password pair'))
    client.emit('connect')

    expect(error).not.toHaveBeenCalled()
    expect(info).not.toHaveBeenCalled()
  })

  it('логи разных инстансов createRedisClient() не мешают друг другу', () => {
    process.env[ENV_VAR] = 'redis://127.0.0.1:6379'
    const clientA = createRedisClient({ envVar: ENV_VAR, logPrefix: '[redis:a]' })()
    const clientB = createRedisClient({ envVar: ENV_VAR, logPrefix: '[redis:b]' })()
    clientA?.disconnect()
    clientB?.disconnect()
    const { error } = spies()

    clientA?.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:6379'))
    clientB?.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:6379'))

    // одинаковый текст, но состояние у инстансов своё — печатаются обе
    expect(error).toHaveBeenCalledTimes(2)
    expect(error.mock.calls[0]?.join(' ')).toContain('[redis:a]')
    expect(error.mock.calls[1]?.join(' ')).toContain('[redis:b]')
  })
})
