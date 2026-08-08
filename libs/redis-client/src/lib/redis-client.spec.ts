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
