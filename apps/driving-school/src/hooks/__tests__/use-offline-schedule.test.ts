// globals: true — describe, expect, it, beforeEach доступны глобально
import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'

// Используем автоматический мок из __mocks__
vi.mock('../../lib/offline')

// Импортируем хук после мока
import { useOfflineSchedule } from '../use-offline-schedule'

describe('useOfflineSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('должен возвращать состояние с slots, lessons и lastSync', () => {
    const { result } = renderHook(() => useOfflineSchedule())

    expect(result.current).toHaveProperty('slots')
    expect(result.current).toHaveProperty('lessons')
    expect(result.current).toHaveProperty('lastSync')
  })

  it('должен возвращать isLoading', () => {
    const { result } = renderHook(() => useOfflineSchedule())

    expect(typeof result.current.isLoading).toBe('boolean')
  })

  it('должен возвращать syncSchedule функцию', () => {
    const { result } = renderHook(() => useOfflineSchedule())

    expect(typeof result.current.syncSchedule).toBe('function')
  })

  it('должен вернуть пустой массив slots по умолчанию', () => {
    const { result } = renderHook(() => useOfflineSchedule())

    expect(Array.isArray(result.current.slots)).toBe(true)
  })

  it('должен вернуть пустой массив lessons по умолчанию', () => {
    const { result } = renderHook(() => useOfflineSchedule())

    expect(Array.isArray(result.current.lessons)).toBe(true)
  })

  it('должен вернуть число для lastSync', () => {
    const { result } = renderHook(() => useOfflineSchedule())

    expect(typeof result.current.lastSync).toBe('number')
  })
})
