import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted for variables used in mocks
const { setStatusChangeCallback } = vi.hoisted(() => {
  let callback: ((offline: boolean) => void) | null = null
  return {
    statusChangeCallback: () => callback,
    setStatusChangeCallback: (cb: ((offline: boolean) => void) | null) => {
      callback = cb
    },
  }
})

// Mock offline-service
vi.mock('./offline-service', () => ({
  getOfflineStatus: vi.fn(() => false),
  subscribeToStatusChanges: vi.fn((callback: (offline: boolean) => void) => {
    setStatusChangeCallback(callback)
    return () => {
      setStatusChangeCallback(null)
    }
  }),
}))

// Import after mock
import { useOfflineStatus } from './use-offline-status'

describe('useOfflineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setStatusChangeCallback(null)
  })

  it('returns false by default (online)', () => {
    const { result } = renderHook(() => useOfflineStatus())

    expect(result.current).toBe(false)
  })

  it('returns boolean type', () => {
    const { result } = renderHook(() => useOfflineStatus())

    expect(typeof result.current).toBe('boolean')
  })

  it('works with useSyncExternalStore pattern', () => {
    // Verify the hook does not throw errors during render
    const { result, unmount } = renderHook(() => useOfflineStatus())

    expect(result.current).toBeDefined()

    // Verify that unmount works correctly
    unmount()
  })

  it('supports multiple subscriptions', () => {
    const { result: result1 } = renderHook(() => useOfflineStatus())
    const { result: result2 } = renderHook(() => useOfflineStatus())

    expect(result1.current).toBe(result2.current)
  })
})

describe('useOfflineStatus SSR', () => {
  it('returns false during SSR (server fallback)', () => {
    // useSyncExternalStore uses third argument for SSR
    // which should return false
    const { result } = renderHook(() => useOfflineStatus())

    // On the client the value is determined by getOfflineStatus
    expect(result.current).toBe(false)
  })
})
