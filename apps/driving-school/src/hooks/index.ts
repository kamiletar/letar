// Оффлайн хуки из библиотеки
export {
  useOfflineForm,
  useOfflineStatus,
  useSyncQueue,
  type OfflineSubmitResult,
  type ProcessQueueResult,
  type SyncAction,
  type SyncActionHandler,
  type SyncQueueItem,
  type UseOfflineFormOptions,
} from '@letar/forms/offline'

// Специфичные для driving-school хуки
export { useOfflineSchedule, type LessonData, type ScheduleState, type TimeSlotData } from './use-offline-schedule'
export { useServiceWorker } from './use-service-worker'
