import { EventEmitter } from 'events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_WAIT_SECONDS, MAX_WAIT_SECONDS, parseWaitMs, waitUntil } from './long-poll'

describe('parseWaitMs', () => {
  it('без значения и на мусоре — дефолт', () => {
    expect(parseWaitMs(undefined)).toBe(DEFAULT_WAIT_SECONDS * 1000)
    expect(parseWaitMs('abc')).toBe(DEFAULT_WAIT_SECONDS * 1000)
  })

  it('капает сверху и снизу', () => {
    expect(parseWaitMs('9999')).toBe(MAX_WAIT_SECONDS * 1000)
    expect(parseWaitMs('-5')).toBe(1000)
    expect(parseWaitMs('30')).toBe(30_000)
  })
})

describe('waitUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('резолвится сразу, если уже готово, и не вешает слушатель', async () => {
    const emitter = new EventEmitter()
    await waitUntil({ emitter, key: 'r', waitMs: 1000, ready: () => true })
    expect(emitter.listenerCount('r')).toBe(0)
  })

  it('отпускает на событии, после которого ready() true', async () => {
    const emitter = new EventEmitter()
    let ready = false
    let done = false
    const p = waitUntil({ emitter, key: 'r', waitMs: 60_000, ready: () => ready }).then(() => {
      done = true
    })
    emitter.emit('r') // событие без прогресса — не отпускает
    await Promise.resolve()
    expect(done).toBe(false)
    ready = true
    emitter.emit('r')
    await p
    expect(done).toBe(true)
    expect(emitter.listenerCount('r')).toBe(0)
  })

  it('отпускает по таймауту и снимает слушатель', async () => {
    const emitter = new EventEmitter()
    const p = waitUntil({ emitter, key: 'r', waitMs: 5000, ready: () => false })
    expect(emitter.listenerCount('r')).toBe(1)
    await vi.advanceTimersByTimeAsync(5000)
    await p
    expect(emitter.listenerCount('r')).toBe(0)
  })
})
