'use client'

import { useSyncExternalStore } from 'react'

import { getOfflineStatus, subscribeToStatusChanges } from './offline-service'

// Global state for synchronization across tabs
let isOffline = false

const listeners = new Set<() => void>()

const notifyListeners = () => {
  listeners.forEach((listener) => listener())
}

// Initialize on first load
if (typeof window !== 'undefined') {
  isOffline = getOfflineStatus()

  subscribeToStatusChanges((offline) => {
    isOffline = offline
    notifyListeners()
  })
}

/**
 * Hook for detecting offline status
 *
 * @returns true if the browser is offline
 *
 * @example
 * ```tsx
 * import { useOfflineStatus } from '@letar/forms/offline'
 *
 * function MyComponent() {
 *   const isOffline = useOfflineStatus()
 *
 *   if (isOffline) {
 *     return <OfflineBanner />
 *   }
 *
 *   return <OnlineContent />
 * }
 * ```
 */
export function useOfflineStatus(): boolean {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    () => isOffline,
    () => false, // SSR fallback — assume online
  )
}
