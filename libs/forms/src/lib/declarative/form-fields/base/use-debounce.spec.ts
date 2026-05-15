import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebounce } from './use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('возвращает начальное значение сразу', () => {
    const { result } = renderHook(() => useDebounce('initial', 300))
    expect(result.current).toBe('initial')
  })

  it('не обновляет значение до истечения задержки', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    // Прошло только 100мс — значение не должно измениться
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe('initial')
  })

  it('обновляет значение после истечения задержки', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    // Прошло 300мс — значение должно измениться
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('updated')
  })

  it('сбрасывает таймер при быстрых изменениях', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    })

    // Быстрые изменения
    rerender({ value: 'update1' })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ value: 'update2' })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ value: 'update3' })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Значение всё ещё initial, потому что таймер сбрасывался
    expect(result.current).toBe('initial')

    // Ждём полные 300мс после последнего изменения
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe('update3')
  })

  it('использует задержку по умолчанию 300мс', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('updated')
  })

  it('работает с разными типами данных', () => {
    // Число
    const { result: numResult } = renderHook(() => useDebounce(42, 100))
    expect(numResult.current).toBe(42)

    // Объект
    const obj = { foo: 'bar' }
    const { result: objResult } = renderHook(() => useDebounce(obj, 100))
    expect(objResult.current).toBe(obj)

    // null
    const { result: nullResult } = renderHook(() => useDebounce(null, 100))
    expect(nullResult.current).toBeNull()
  })

  it('поддерживает кастомную задержку', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe('updated')
  })
})
