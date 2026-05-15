'use client'

// Types
export type {
  BaseSyncActionType,
  FormOfflineConfig,
  FormSubmitHandler,
  OfflineIndicatorProps,
  OfflineSubmitResult,
  ProcessQueueResult,
  SyncAction,
  SyncActionHandler,
  SyncActionType,
  SyncActionTypeRegistry,
  SyncItemStatus,
  SyncQueueItem,
  SyncQueueStore,
  SyncStatusProps,
  UseOfflineFormOptions,
  UseOfflineFormResult,
  UseSyncQueueResult,
} from './types'

// Service functions
export {
  addToQueue,
  clearQueue,
  createSyncQueueStore,
  getOfflineStatus,
  getQueueFromStorage,
  processQueueItem,
  removeFromQueue,
  subscribeToStatusChanges,
} from './offline-service'

// Hooks
export { useOfflineForm } from './use-offline-form'
export { useOfflineStatus } from './use-offline-status'
export { useSyncQueue } from './use-sync-queue'

// Components
export { FormOfflineIndicator } from './form-offline-indicator'
export { FormSyncStatus } from './form-sync-status'
