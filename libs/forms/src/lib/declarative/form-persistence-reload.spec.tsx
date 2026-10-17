import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFormPersistence } from './form-persistence'

const Wrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)
const key = 'reload-regression'
const storageKey = `form-persistence:${key}`
const data = { title: 'Последняя строка', password: 'secret' }

describe('persistence — повторная перезагрузка и последний ввод', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('сохраняет принятую копию после завершения восстановления и нового монтажа', () => {
    localStorage.setItem(storageKey, JSON.stringify({ data: { title: data.title }, version: 1, savedAt: Date.now() }))
    const first = renderHook(() => useFormPersistence({ key }), { wrapper: Wrapper })
    act(() => {
      first.result.current.acceptRestore()
    })
    act(() => {
      first.result.current.markRestoreComplete()
    })
    first.unmount()
    const second = renderHook(() => useFormPersistence({ key }), { wrapper: Wrapper })
    expect(second.result.current.isDialogOpen).toBe(true)
    expect(second.result.current.savedData).toEqual({ title: data.title })
  })

  it.each(['pagehide', 'unmount'] as const)('сбрасывает pending запись при %s без чувствительных полей', (event) => {
    const form = renderHook(() => useFormPersistence({ key, debounceMs: 1000, excludeFields: ['password'] }), {
      wrapper: Wrapper,
    })
    act(() => {
      form.result.current.saveValues(data)
    })
    expect(localStorage.getItem(storageKey)).toBeNull()
    act(() => {
      if (event === 'unmount') { form.unmount() }
      else { window.dispatchEvent(new Event('pagehide')) }
    })
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').data).toEqual({ title: data.title })
  })

  it('debounceMs=0 пишет синхронно без ожидания таймера', () => {
    const form = renderHook(() => useFormPersistence({ key, debounceMs: 0 }), { wrapper: Wrapper })
    act(() => {
      form.result.current.saveValues(data)
    })
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').data).toEqual(data)
  })

  it('очищенный черновик не воскресает при pagehide или unmount', () => {
    const form = renderHook(() => useFormPersistence({ key, debounceMs: 1000 }), { wrapper: Wrapper })
    act(() => {
      form.result.current.saveValues(data)
      form.result.current.clearSavedData()
    })
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    form.unmount()
    vi.runAllTimers()
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('смена ключа сбрасывает pending в старый ключ и не переносит данные между формами', () => {
    const form = renderHook(({ id }) => useFormPersistence({ key: id, debounceMs: 1000 }), {
      initialProps: { id: key },
      wrapper: Wrapper,
    })
    act(() => {
      form.result.current.saveValues(data)
    })
    form.rerender({ id: 'other-author' })
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').data).toEqual(data)
    expect(localStorage.getItem('form-persistence:other-author')).toBeNull()
    expect(form.result.current.hasSavedData).toBe(false)
    expect(form.result.current.savedData).toBeNull()
  })
})
