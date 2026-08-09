/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./types`) по всей `libs/forms` не пришлось переписывать.
 */
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
} from '@letar/forms-core/offline'
