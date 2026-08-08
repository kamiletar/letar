import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRedisStorageFromClient, type RedisStorageClient } from './redis-storage'

function fakeClient(overrides: Partial<RedisStorageClient> = {}): RedisStorageClient {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    ...overrides,
  }
}

describe('createRedisStorageFromClient', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('get() возвращает значение при успешном ответе Redis', async () => {
    const client = fakeClient({ get: vi.fn().mockResolvedValue('cached-value') })
    const storage = createRedisStorageFromClient(client)

    await expect(storage.get('k')).resolves.toBe('cached-value')
  })

  it('get() возвращает null вместо зависания, если Redis не отвечает дольше timeoutMs', async () => {
    vi.useFakeTimers()
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- никогда не резолвится, эмулирует зависший Redis
    const client = fakeClient({ get: vi.fn().mockReturnValue(new Promise(() => {})) })
    const storage = createRedisStorageFromClient(client, { timeoutMs: 50 })

    const promise = storage.get('k')
    await vi.advanceTimersByTimeAsync(50)

    await expect(promise).resolves.toBeNull()
  })

  it('get() возвращает null вместо броска, если Redis отклоняет команду', async () => {
    const client = fakeClient({ get: vi.fn().mockRejectedValue(new Error('Connection is closed')) })
    const storage = createRedisStorageFromClient(client)

    await expect(storage.get('k')).resolves.toBeNull()
  })

  it('set() не бросает и не виснет при ошибке Redis (best-effort)', async () => {
    const client = fakeClient({ set: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) })
    const storage = createRedisStorageFromClient(client)

    await expect(storage.set('k', 'v')).resolves.toBeUndefined()
  })

  it('set() с ttl вызывает setex, а не set', async () => {
    const client = fakeClient()
    const storage = createRedisStorageFromClient(client)

    await storage.set('k', 'v', 60)

    expect(client.setex).toHaveBeenCalledWith('k', 60, 'v')
    expect(client.set).not.toHaveBeenCalled()
  })

  it('delete() не бросает при ошибке Redis', async () => {
    const client = fakeClient({ del: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) })
    const storage = createRedisStorageFromClient(client)

    await expect(storage.delete('k')).resolves.toBeUndefined()
  })
})
