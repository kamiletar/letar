import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useConversationalState } from './use-conversational-state'

describe('useConversationalState', () => {
  it('должен начинать с индекса 0', () => {
    const { result } = renderHook(() => useConversationalState(5))
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.isFirst).toBe(true)
    expect(result.current.isLast).toBe(false)
    expect(result.current.isCompleted).toBe(false)
  })

  it('должен вычислить прогресс', () => {
    const { result } = renderHook(() => useConversationalState(4))
    // Индекс 0, прогресс = (0+1)/4 = 0.25
    expect(result.current.progress).toBe(0.25)
  })

  it('должен перейти к следующему полю', () => {
    const { result } = renderHook(() => useConversationalState(3))

    act(() => result.current.next())
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.isFirst).toBe(false)
    expect(result.current.progress).toBeCloseTo(2 / 3)
  })

  it('должен перейти к предыдущему полю', () => {
    const { result } = renderHook(() => useConversationalState(3))

    act(() => result.current.next())
    act(() => result.current.prev())
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.isFirst).toBe(true)
  })

  it('не должен уходить ниже 0 при prev', () => {
    const { result } = renderHook(() => useConversationalState(3))

    act(() => result.current.prev())
    expect(result.current.currentIndex).toBe(0)
  })

  it('должен завершиться при next на последнем поле', () => {
    const { result } = renderHook(() => useConversationalState(2))

    act(() => result.current.next()) // 0 → 1
    expect(result.current.isLast).toBe(true)

    act(() => result.current.next()) // 1 → completed
    expect(result.current.isCompleted).toBe(true)
    expect(result.current.currentIndex).toBe(1) // индекс не меняется
  })

  it('должен перейти к конкретному полю через goTo', () => {
    const { result } = renderHook(() => useConversationalState(5))

    act(() => result.current.goTo(3))
    expect(result.current.currentIndex).toBe(3)
    expect(result.current.progress).toBe(4 / 5)
  })

  it('goTo должен сбросить isCompleted', () => {
    const { result } = renderHook(() => useConversationalState(2))

    // Дойти до конца
    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.isCompleted).toBe(true)

    // Вернуться
    act(() => result.current.goTo(0))
    expect(result.current.isCompleted).toBe(false)
    expect(result.current.currentIndex).toBe(0)
  })

  it('goTo не должен выходить за пределы', () => {
    const { result } = renderHook(() => useConversationalState(3))

    act(() => result.current.goTo(-1))
    expect(result.current.currentIndex).toBe(0)

    act(() => result.current.goTo(5))
    expect(result.current.currentIndex).toBe(0)
  })

  it('должен вернуть progress=0 для 0 полей', () => {
    const { result } = renderHook(() => useConversationalState(0))
    expect(result.current.progress).toBe(0)
  })
})
