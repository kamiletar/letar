'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import { createSyncQueueStore } from './offline-service'
import type { ProcessQueueResult, SyncAction, SyncActionHandler, SyncQueueItem, UseSyncQueueResult } from './types'
import { useOfflineStatus } from './use-offline-status'

// Global sync queue store (default)
const defaultSyncQueueStore = createSyncQueueStore()
const EMPTY_QUEUE: SyncQueueItem[] = []

// Initialization flag
let initialized = false

const initialize = async () => {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    await defaultSyncQueueStore.initialize()
  }
}

/**
 * Hook for working with the sync queue
 *
 * Allows adding actions to the queue in offline mode
 * and synchronizing them when connection is restored.
 *
 * @example
 * ```tsx
 * import { useSyncQueue } from '@letar/forms/offline'
 *
 * function MyComponent() {
 *   const { queue, queueLength, addAction, processQueue, isProcessing } = useSyncQueue()
 *
 *   // Add action to queue (works offline too)
 *   const handleBookLesson = async (slotId: string) => {
 *     if (isOffline) {
 *       await addAction({ type: 'BOOK_LESSON', payload: { slotId } })
 *       toast({ title: 'Action added to sync queue' })
 *     } else {
 *       await api.bookLesson(slotId)
 *     }
 *   }
 *
 *   // Process queue when connection is restored
 *   useEffect(() => {
 *     if (!isOffline && queueLength > 0) {
 *       processQueue(async (action) => {
 *         switch (action.type) {
 *           case 'BOOK_LESSON':
 *             return api.bookLesson(action.payload.slotId)
 *           // ... other action types
 *         }
 *       })
 *     }
 *   }, [isOffline, queueLength, processQueue])
 * }
 * ```
 */
export function useSyncQueue(): UseSyncQueueResult {
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const isOffline = useOfflineStatus()

  // Subscribe to queue changes
  const queue = useSyncExternalStore(
    (callback) => defaultSyncQueueStore.subscribe(callback),
    () => defaultSyncQueueStore.getQueue(),
    () => EMPTY_QUEUE, // SSR fallback
  )

  // Initialize on mount
  useEffect(() => {
    let cancelled = false
    initialize().then(() => {
      if (!cancelled) {
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Add action to queue
  const addAction = useCallback(async (action: SyncAction): Promise<SyncQueueItem> => {
    return defaultSyncQueueStore.add(action)
  }, [])

  // Remove action from queue
  const removeAction = useCallback(async (id: string): Promise<boolean> => {
    return defaultSyncQueueStore.remove(id)
  }, [])

  // Process entire queue
  const processQueue = useCallback(
    async (handler: SyncActionHandler): Promise<ProcessQueueResult[]> => {
      if (isOffline) {
        console.warn('[SyncQueue] Cannot process queue in offline mode')
        return []
      }

      setIsProcessing(true)
      try {
        return await defaultSyncQueueStore.processAll(handler)
      } finally {
        setIsProcessing(false)
      }
    },
    [isOffline],
  )

  return {
    queue,
    queueLength: queue.length,
    pendingCount: queue.filter((item) => item.status === 'PENDING').length,
    isLoading,
    isProcessing,
    addAction,
    removeAction,
    processQueue,
  }
}
