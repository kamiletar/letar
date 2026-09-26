import { describe, expect, it, vi } from 'vitest'
import { applyOptionOverlay } from './editable-options'
import { createPendingRegistry } from './pending-registry'

/** Промис, который завершается снаружи */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('createPendingRegistry (O13)', () => {
  it('пустой реестр: settleAll → true сразу, отправка в том же тике', async () => {
    const registry = createPendingRegistry()
    await expect(registry.settleAll()).resolves.toBe(true)
    const submit = vi.fn()
    const promise = registry.submitWhenSettled(submit)
    expect(submit).toHaveBeenCalledTimes(1) // до любого await
    await promise
  })

  it('count и подписчики: растёт при add, падает при завершении промиса', async () => {
    const registry = createPendingRegistry()
    const listener = vi.fn()
    registry.subscribe(listener)
    const a = deferred<boolean>()
    registry.add(a.promise)
    expect(registry.getSnapshot().count).toBe(1)
    expect(listener).toHaveBeenCalledTimes(1)
    a.resolve(true)
    await registry.settleAll()
    expect(registry.getSnapshot().count).toBe(0)
  })

  it('снимок стабилен, пока ничего не менялось (для useSyncExternalStore)', () => {
    const registry = createPendingRegistry()
    const first = registry.getSnapshot()
    expect(registry.getSnapshot()).toBe(first)
  })

  it('settleAll ждёт все записи; отказ одного → false', async () => {
    const registry = createPendingRegistry()
    const a = deferred<boolean>()
    const b = deferred<boolean>()
    registry.add(a.promise)
    registry.add(b.promise)
    const result = registry.settleAll()
    a.resolve(true)
    b.resolve(false)
    await expect(result).resolves.toBe(false)
  })

  it('reject промиса записи = отказ', async () => {
    const registry = createPendingRegistry()
    registry.add(Promise.reject(new Error('boom')))
    await expect(registry.settleAll()).resolves.toBe(false)
  })

  it('снятая запись не держит и не отменяет отправку', async () => {
    const registry = createPendingRegistry()
    const a = deferred<boolean>()
    const cancel = registry.add(a.promise)
    const submit = vi.fn()
    const sent = registry.submitWhenSettled(submit)
    expect(submit).not.toHaveBeenCalled()
    cancel()
    await sent
    expect(submit).toHaveBeenCalledTimes(1)
    a.resolve(false) // поздний вердикт снятой записи ничего не меняет
    expect(registry.getSnapshot().count).toBe(0)
  })

  it('запись, добавленная за время ожидания, тоже ждётся', async () => {
    const registry = createPendingRegistry()
    const a = deferred<boolean>()
    const b = deferred<boolean>()
    registry.add(a.promise)
    const result = registry.settleAll()
    registry.add(b.promise)
    a.resolve(true)
    await Promise.resolve()
    b.resolve(true)
    await expect(result).resolves.toBe(true)
  })

  it('submitWhenSettled: очередь, submitQueued, повторный вызов игнорируется', async () => {
    const registry = createPendingRegistry()
    const a = deferred<boolean>()
    registry.add(a.promise)
    const submit = vi.fn()
    const first = registry.submitWhenSettled(submit)
    expect(registry.getSnapshot().submitQueued).toBe(true)
    await registry.submitWhenSettled(submit) // дубль — сразу выходит
    a.resolve(true)
    await first
    expect(submit).toHaveBeenCalledTimes(1)
    expect(registry.getSnapshot().submitQueued).toBe(false)
  })

  it('submitWhenSettled: отказ → submit не вызван, фокус на поле с отказом', async () => {
    const registry = createPendingRegistry()
    const a = deferred<boolean>()
    const focus = vi.fn()
    registry.add(a.promise, { focus })
    const submit = vi.fn()
    const sent = registry.submitWhenSettled(submit)
    a.resolve(false)
    await sent
    expect(submit).not.toHaveBeenCalled()
    expect(focus).toHaveBeenCalledTimes(1)
    expect(registry.getSnapshot().submitQueued).toBe(false)
  })
})

describe('applyOptionOverlay: pending', () => {
  it('запись с pending помечает опцию, без — нет', () => {
    const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]
    const result = applyOptionOverlay(options, [
      { fromValue: 'a', label: 'A2', value: 'a', hasData: false, baselineText: 'A', pending: true },
    ])
    expect(result[0]).toMatchObject({ label: 'A2', pending: true })
    expect(result[1]).not.toHaveProperty('pending')
  })
})
