/**
 * Тесты ожидания готовности Redis-клиента перед первой командой.
 *
 * Регрессия, ради которой это заведено (2026-09-06, s2): `createRedisClient` возвращает клиент
 * с ещё не открытым сокетом (`lazyConnect: true` + `connect()` без await), а `enableOfflineQueue:
 * false` не даёт команде подождать в очереди — обе функции восстановления состояния при старте
 * падали с `Stream isn't writeable and enableOfflineQueue options is false` и повторной попытки
 * не делали. Проверяем обе стороны размена: дожидаемся ready, но не зависаем, если его не будет.
 */

import { EventEmitter } from 'events'
import { describe, expect, it } from 'vitest'
import { waitForRedisReady } from './redis'

type RedisClientArg = Parameters<typeof waitForRedisReady>[0]

/** Минимальная подделка ioredis-клиента: только `status` и семантика событий ready/end */
class FakeRedis extends EventEmitter {
  constructor(public status: string) {
    super()
  }

  becomeReady(): void {
    this.status = 'ready'
    this.emit('ready')
  }

  becomeEnded(): void {
    this.status = 'end'
    this.emit('end')
  }
}

function makeClient(status: string): { fake: FakeRedis; arg: RedisClientArg } {
  const fake = new FakeRedis(status)
  return { fake, arg: fake as unknown as RedisClientArg }
}

describe('waitForRedisReady', () => {
  it('возвращает true сразу, если клиент уже в ready', async () => {
    const { arg } = makeClient('ready')
    await expect(waitForRedisReady(arg, 50)).resolves.toBe(true)
  })

  it('дожидается события ready, если клиент ещё подключается', async () => {
    const { fake, arg } = makeClient('connecting')
    const pending = waitForRedisReady(arg, 1000)
    // Ровно то окно, в котором раньше улетала команда и получала «Stream isn't writeable»
    setTimeout(() => fake.becomeReady(), 10)
    await expect(pending).resolves.toBe(true)
  })

  it('возвращает false по таймауту, если ready так и не наступил', async () => {
    const { arg } = makeClient('connecting')
    await expect(waitForRedisReady(arg, 20)).resolves.toBe(false)
  })

  it('возвращает false сразу при status=end, не выжидая таймаут', async () => {
    const { arg } = makeClient('end')
    const started = Date.now()
    await expect(waitForRedisReady(arg, 5000)).resolves.toBe(false)
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('возвращает false по событию end, не дожидаясь таймаута', async () => {
    const { fake, arg } = makeClient('connecting')
    const started = Date.now()
    const pending = waitForRedisReady(arg, 5000)
    setTimeout(() => fake.becomeEnded(), 10)
    await expect(pending).resolves.toBe(false)
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('снимает слушатели после разрешения — повторные события ничего не ломают', async () => {
    const { fake, arg } = makeClient('connecting')
    const pending = waitForRedisReady(arg, 1000)
    setTimeout(() => fake.becomeReady(), 10)
    await pending

    expect(fake.listenerCount('ready')).toBe(0)
    expect(fake.listenerCount('end')).toBe(0)
    // Поздний end после уже разрешённого ожидания не должен ничего делать (в т.ч. падать)
    expect(() => fake.becomeEnded()).not.toThrow()
  })

  it('не оставляет висящих слушателей после таймаута', async () => {
    const { fake, arg } = makeClient('connecting')
    await waitForRedisReady(arg, 20)

    expect(fake.listenerCount('ready')).toBe(0)
    expect(fake.listenerCount('end')).toBe(0)
  })
})
