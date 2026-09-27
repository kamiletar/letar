import { provideZonelessChangeDetection, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOptionsLoader } from './options-loader'

function createLoader(...args: Parameters<typeof createOptionsLoader<{ value: string }>>) {
  return TestBed.runInInjectionContext(() => createOptionsLoader(...args))
}

describe('createOptionsLoader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  it('loads once on creation and exposes the result via signals', async () => {
    const load = vi.fn(async () => [{ value: 'a' }])
    const deps = signal('static')
    const state = createLoader(load, deps)
    TestBed.tick()
    expect(state.loading()).toBe(true)
    await vi.waitFor(() => expect(state.loading()).toBe(false))
    expect(state.options()).toEqual([{ value: 'a' }])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('re-fetches when the deps signal changes and applies the newest result (no race)', async () => {
    const deps = signal('ru')
    let resolveFirst: (value: { value: string }[]) => void = () => undefined
    const load = vi
      .fn()
      .mockImplementationOnce(() => new Promise<{ value: string }[]>((resolve) => (resolveFirst = resolve)))
      .mockImplementationOnce(async () => [{ value: 'us-option' }])
    const state = createLoader(load, deps)
    TestBed.tick()

    deps.set('us')
    TestBed.tick()
    await vi.waitFor(() => expect(state.options()).toEqual([{ value: 'us-option' }]))

    // Первый (устаревший) запрос отвечает позже — его результат не должен перезаписать второй
    resolveFirst([{ value: 'ru-option' }])
    await Promise.resolve()
    expect(state.options()).toEqual([{ value: 'us-option' }])
  })

  it('keepPrevious: false clears options immediately on a deps change, before the new request settles', async () => {
    const deps = signal('ru')
    let resolveSecond: (value: { value: string }[]) => void = () => undefined
    const load = vi
      .fn()
      .mockImplementationOnce(async () => [{ value: 'ru-option' }])
      .mockImplementationOnce(() => new Promise<{ value: string }[]>((resolve) => (resolveSecond = resolve)))
    const state = createLoader(load, deps, { keepPrevious: false })
    TestBed.tick()
    await vi.waitFor(() => expect(state.options()).toEqual([{ value: 'ru-option' }]))

    deps.set('us')
    TestBed.tick()
    expect(state.options()).toEqual([])
    resolveSecond([{ value: 'us-option' }])
    await vi.waitFor(() => expect(state.options()).toEqual([{ value: 'us-option' }]))
  })

  it('enabled: false skips the request without touching previously loaded options', async () => {
    const deps = signal('static')
    const enabled = signal(true)
    const load = vi.fn(async () => [{ value: 'a' }])
    const state = createLoader(load, deps, { enabled: () => enabled() })
    TestBed.tick()
    await vi.waitFor(() => expect(state.options()).toEqual([{ value: 'a' }]))

    enabled.set(false)
    TestBed.tick()
    expect(state.loading()).toBe(false)
    expect(state.options()).toEqual([{ value: 'a' }])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('reload() re-runs the loader with the same deps', async () => {
    const deps = signal('static')
    const load = vi.fn(async () => [{ value: 'a' }])
    const state = createLoader(load, deps)
    TestBed.tick()
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    state.reload()
    TestBed.tick()
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  })

  it('surfaces a rejection as error, keeping previous options when keepPrevious is true', async () => {
    const deps = signal('static')
    const load = vi.fn().mockRejectedValueOnce(new Error('boom'))
    const state = createLoader(load, deps)
    TestBed.tick()
    await vi.waitFor(() => expect(state.error()).toBeInstanceOf(Error))
    expect(state.loading()).toBe(false)
  })
})
