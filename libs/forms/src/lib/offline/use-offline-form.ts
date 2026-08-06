'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { OfflineSubmitResult, SyncAction, UseOfflineFormOptions, UseOfflineFormResult } from './types'
import { useOfflineStatus } from './use-offline-status'
import { useSyncQueue } from './use-sync-queue'

/**
 * Hook for offline form support with TanStack Form
 *
 * Automatically detects connection status and:
 * - Online: sends data directly
 * - Offline: saves to IndexedDB queue for synchronization
 *
 * @example
 * ```tsx
 * import { useOfflineForm } from '@letar/forms/offline'
 *
 * function ProfileForm({ initialData }) {
 *   const { submit, isOffline, pendingCount, isProcessing } = useOfflineForm({
 *     actionType: 'UPDATE_PROFILE',
 *     onlineSubmit: async (value) => {
 *       const result = await updateProfileAction(value)
 *       return { success: result.success, error: result.error?.formErrors?.[0] }
 *     },
 *     onSuccess: () => toaster.success({ title: 'Saved' }),
 *     onQueued: () => toaster.info({ title: 'Saved locally' }),
 *     onError: (error) => toaster.error({ title: 'Error', description: error }),
 *   })
 *
 *   const form = useAppForm({
 *     defaultValues: initialData,
 *     onSubmit: async ({ value }) => {
 *       await submit(value)
 *     },
 *   })
 *
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
 *       {isOffline && <Badge colorPalette="orange">Offline mode</Badge>}
 *       {pendingCount > 0 && (
 *         <Badge colorPalette="blue">
 *           {isProcessing ? 'Syncing...' : `Pending: ${pendingCount}`}
 *         </Badge>
 *       )}
 *       <form.AppField name="name" children={(field) => <field.TextField label="Name" />} />
 *       <Button type="submit">{isOffline ? 'Save locally' : 'Save'}</Button>
 *     </form>
 *   )
 * }
 * ```
 */
export function useOfflineForm<T extends object>({
  actionType,
  onlineSubmit,
  onSuccess,
  onQueued,
  onError,
}: UseOfflineFormOptions<T>): UseOfflineFormResult<T> {
  const isOffline = useOfflineStatus()
  const { addAction, processQueue, pendingCount, isProcessing, queueLength } = useSyncQueue()
  const [lastSyncAttempt, setLastSyncAttempt] = useState<number | null>(null)

  // Ref to prevent repeated queue processing
  const processingRef = useRef(false)

  /**
   * Form submission with offline support
   */
  const submit = useCallback(
    async (value: T): Promise<OfflineSubmitResult> => {
      // Offline — add to queue
      if (isOffline) {
        try {
          const queueItem = await addAction({
            type: actionType,
            payload: value as Record<string, unknown>,
          })

          onQueued?.()

          return {
            success: true,
            queued: true,
            queueItemId: queueItem.id,
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error saving to queue'
          onError?.(errorMessage)
          return {
            success: false,
            error: errorMessage,
          }
        }
      }

      // Online — send directly
      try {
        const result = await onlineSubmit(value)

        if (result.success) {
          onSuccess?.()
        } else if (result.error) {
          onError?.(result.error)
        }

        return {
          success: result.success,
          error: result.error,
          queued: false,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Submission error'
        onError?.(errorMessage)
        return {
          success: false,
          error: errorMessage,
          queued: false,
        }
      }
    },
    [isOffline, actionType, addAction, onlineSubmit, onSuccess, onQueued, onError],
  )

  /**
   * Handler for queued actions
   * Called when connection is restored
   */
  const handleQueuedAction = useCallback(
    async (action: SyncAction): Promise<{ success: boolean; error?: string }> => {
      // Process only our action type
      if (action.type !== actionType) {
        return { success: true } // Skip other action types
      }

      return onlineSubmit(action.payload as T)
    },
    [actionType, onlineSubmit],
  )

  // Automatic sync when connection is restored
  useEffect(() => {
    // If online and there are items in queue — try to sync
    if (!isOffline && pendingCount > 0 && !processingRef.current) {
      processingRef.current = true
      setLastSyncAttempt(Date.now())

      processQueue(handleQueuedAction)
        .then((results) => {
          const failed = results.filter((r) => !r.success)
          if (failed.length > 0) {
            console.warn(`[OfflineForm] ${failed.length} actions failed to sync`)
          }
        })
        .finally(() => {
          processingRef.current = false
        })
    }
  }, [isOffline, pendingCount, processQueue, handleQueuedAction])

  return {
    submit,
    isOffline,
    pendingCount,
    queueLength,
    isProcessing,
    lastSyncAttempt,
  }
}
