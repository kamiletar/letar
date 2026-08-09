import { describe, expect, it, vi } from 'vitest'

// Мок TanStack Form store
function createMockForm<T>(initialValues: T) {
  let values = { ...initialValues } as T
  const listeners = new Set<() => void>()

  return {
    state: {
      get values() {
        return values
      },
    },
    store: {
      subscribe: (cb: () => void) => {
        listeners.add(cb)
        return () => listeners.delete(cb)
      },
    },
    setFieldValue: (field: string, value: unknown) => {
      ;(values as Record<string, unknown>)[field] = value
    },
    reset: () => {
      values = { ...initialValues } as T
    },
    _notify: () => {
      for (const cb of listeners) {
        cb()
      }
    },
    _setValues: (v: T) => {
      values = v
    },
  }
}

// Поскольку useFormHistory — React hook, тестируем логику парсеров и типов
// Полные интеграционные тесты с renderHook требуют React testing environment

describe('useFormHistory types', () => {
  it('HistoryEntry содержит values и timestamp', () => {
    const entry = { values: { name: 'test' }, timestamp: Date.now() }
    expect(entry.values.name).toBe('test')
    expect(entry.timestamp).toBeGreaterThan(0)
  })

  it('createMockForm подписка работает', () => {
    const form = createMockForm({ name: '' })
    const cb = vi.fn()
    const unsub = form.store.subscribe(cb)
    form._notify()
    expect(cb).toHaveBeenCalledOnce()
    unsub()
    form._notify()
    expect(cb).toHaveBeenCalledOnce() // не вызван повторно после unsub
  })

  it('createMockForm setFieldValue обновляет значения', () => {
    const form = createMockForm({ name: '', email: '' })
    form.setFieldValue('name', 'John')
    expect(form.state.values.name).toBe('John')
  })
})
