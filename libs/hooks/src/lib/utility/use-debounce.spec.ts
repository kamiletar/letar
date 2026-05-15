import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

  it('не обновляет значение до истечения delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    // Значение ещё не обновилось
    expect(result.current).toBe('initial')

    // Ждём половину времени
    act(() => {
      vi.advanceTimersByTime(150)
    })

    // Всё ещё старое значение
    expect(result.current).toBe('initial')
  })

  it('обновляет значение после истечения delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('updated')
  })

  it('сбрасывает таймер при новом значении', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'first' },
    })

    rerender({ value: 'second' })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Меняем значение — таймер сбрасывается
    rerender({ value: 'third' })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Значение ещё не обновилось (прошло только 200мс с последнего изменения)
    expect(result.current).toBe('first')

    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Теперь обновилось
    expect(result.current).toBe('third')
  })

  it('использует 300мс по умолчанию', () => {
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

  it('работает с разными типами', () => {
    // Числа
    const { result: numberResult, rerender: rerenderNumber } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: 42 },
    })

    rerenderNumber({ value: 100 })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(numberResult.current).toBe(100)

    // Объекты
    const obj1 = { a: 1 }
    const obj2 = { b: 2 }
    const { result: objResult, rerender: rerenderObj } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: obj1 },
    })

    rerenderObj({ value: obj2 })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(objResult.current).toBe(obj2)
  })
})
