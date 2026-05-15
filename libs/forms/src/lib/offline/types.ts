/**
 * Types for form offline functionality
 */

// ============================================
// EXTENSIBLE ACTION TYPES
// ============================================

/**
 * Base sync action types
 */
export type BaseSyncActionType = 'FORM_SUBMIT' | 'FORM_UPDATE' | 'FORM_DELETE'

/**
 * Registry for extending action types in applications
 *
 * @example In an application:
 * ```ts
 * declare module '@letar/forms/offline' {
 *   interface SyncActionTypeRegistry {
 *     'BOOK_LESSON': true
 *     'UPDATE_PROFILE': true
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
export interface SyncActionTypeRegistry {}

/**
 * All available action types (base + extended)
 */
export type SyncActionType = BaseSyncActionType | keyof SyncActionTypeRegistry | (string & {})

// ============================================
// ACTIONS AND QUEUE
// ============================================

/**
 * Action for synchronization
 */
export interface SyncAction {
  type: SyncActionType
  payload: Record<string, unknown>
}

/**
 * Queue item status
 */
export type SyncItemStatus = 'PENDING' | 'SYNCED' | 'FAILED'

/**
 * Sync queue item
 */
export interface SyncQueueItem {
  id: string
  action: SyncAction
  createdAt: number
  attempts: number
  maxAttempts: number
  status: SyncItemStatus
  error?: string
}

/**
 * Queue item processing result
 */
export interface ProcessQueueResult {
  success: boolean
  item?: SyncQueueItem
  error?: string
}

/**
 * Sync action handler
 */
export type SyncActionHandler = (action: SyncAction) => Promise<{ success: boolean; error?: string }>

// ============================================
// STORE TYPES
// ============================================

/**
 * Sync queue store
 */
export interface SyncQueueStore {
  getQueue: () => SyncQueueItem[]
  getQueueLength: () => number
  subscribe: (listener: () => void) => () => void
  initialize: () => Promise<void>
  add: (action: SyncAction) => Promise<SyncQueueItem>
  remove: (id: string) => Promise<boolean>
  processAll: (handler: SyncActionHandler) => Promise<ProcessQueueResult[]>
}

// ============================================
// HOOK TYPES
// ============================================

/**
 * Offline form submission result
 */
export interface OfflineSubmitResult {
  /** Whether the action was successful */
  success: boolean
  /** Error message */
  error?: string
  /** Whether the action was added to queue (offline) */
  queued?: boolean
  /** Queue item ID */
  queueItemId?: string
}

/**
 * Form submit handler
 */
export type FormSubmitHandler<T> = (value: T) => Promise<{ success: boolean; error?: string }>

/**
 * useOfflineForm hook options
 */
export interface UseOfflineFormOptions<T> {
  /** Action type for the sync queue */
  actionType: SyncActionType
  /** Online submit handler */
  onlineSubmit: FormSubmitHandler<T>
  /** Callback on successful submit */
  onSuccess?: () => void
  /** Callback when added to queue */
  onQueued?: () => void
  /** Callback on error */
  onError?: (error: string) => void
}

/**
 * useOfflineForm hook result
 */
export interface UseOfflineFormResult<T> {
  /** Form submit function */
  submit: (value: T) => Promise<OfflineSubmitResult>
  /** Current offline status */
  isOffline: boolean
  /** Number of actions pending synchronization */
  pendingCount: number
  /** Total number of items in queue */
  queueLength: number
  /** Whether queue is being processed */
  isProcessing: boolean
  /** Time of last sync attempt */
  lastSyncAttempt: number | null
}

/**
 * useSyncQueue hook result
 */
export interface UseSyncQueueResult {
  /** Queue items */
  queue: SyncQueueItem[]
  /** Number of items in queue */
  queueLength: number
  /** Only pending items */
  pendingCount: number
  /** Whether queue is loading from IndexedDB */
  isLoading: boolean
  /** Whether queue is being processed */
  isProcessing: boolean
  /** Add action to queue */
  addAction: (action: SyncAction) => Promise<SyncQueueItem>
  /** Remove action from queue */
  removeAction: (id: string) => Promise<boolean>
  /** Process entire queue */
  processQueue: (handler: SyncActionHandler) => Promise<ProcessQueueResult[]>
}

// ============================================
// COMPONENT TYPES
// ============================================

/**
 * Offline mode configuration for Form
 */
export interface FormOfflineConfig {
  /** Action type for the sync queue */
  actionType: SyncActionType
  /** Key for queue storage (optional) */
  storageKey?: string
  /** Callback when added to queue */
  onQueued?: () => void
  /** Callback on successful sync */
  onSynced?: () => void
  /** Callback on sync error */
  onSyncError?: (error: string) => void
}

/**
 * Props for Form.OfflineIndicator
 */
export interface OfflineIndicatorProps {
  /** Indicator text */
  label?: string
  /** Color palette */
  colorPalette?: string
  /** Display variant */
  variant?: 'subtle' | 'solid' | 'outline'
}

/**
 * Props for Form.SyncStatus
 */
export interface SyncStatusProps {
  /** Show when queue is empty */
  showWhenEmpty?: boolean
  /** Text during synchronization */
  syncingLabel?: string
  /** Text for pending items */
  pendingLabel?: string | ((count: number) => string)
  /** Text when synced */
  syncedLabel?: string
  /** Color palette */
  colorPalette?: string
}
