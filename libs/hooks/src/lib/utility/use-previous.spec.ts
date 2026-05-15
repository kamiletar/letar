import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePrevious } from './use-previous'

describe('usePrevious', () => {
  it('возвращает undefined при первом рендере', () => {
    const { result } = renderHook(() => usePrevious('initial'))
    expect(result.current).toBeUndefined()
  })

  it('возвращает предыдущее значение после ререндера', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 'first' },
    })

    // После первого рендера - undefined
    expect(result.current).toBeUndefined()

    // После второго рендера - предыдущее значение
    rerender({ value: 'second' })
    expect(result.current).toBe('first')

    // После третьего рендера
    rerender({ value: 'third' })
    expect(result.current).toBe('second')
  })

  it('работает с числами', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 1 },
    })

    rerender({ value: 2 })
    expect(result.current).toBe(1)

    rerender({ value: 3 })
    expect(result.current).toBe(2)
  })

  it('работает с объектами', () => {
    const obj1 = { a: 1 }
    const obj2 = { b: 2 }

    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: obj1 },
    })

    rerender({ value: obj2 })
    expect(result.current).toBe(obj1)
  })

  it('работает с null и undefined', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: null as string | null },
    })

    rerender({ value: 'value' })
    expect(result.current).toBeNull()

    rerender({ value: null })
    expect(result.current).toBe('value')
  })

  it('сохраняет то же значение при одинаковых ререндерах', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 'same' },
    })

    rerender({ value: 'same' })
    expect(result.current).toBe('same')

    rerender({ value: 'same' })
    expect(result.current).toBe('same')
  })
})
