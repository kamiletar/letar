export {
  addToQueue,
  clearQueue,
  clearScheduleStorage,
  createScheduleStore,
  createSyncQueueStore,
  // Статус соединения
  getOfflineStatus,
  // Очередь синхронизации
  getQueueFromStorage,
  // Расписание
  getScheduleFromStorage,
  processQueueItem,
  removeFromQueue,
  saveScheduleToStorage,
  subscribeToStatusChanges,
  type LessonData,
  type ProcessQueueResult,
  type ScheduleState,
  type ScheduleStore,
  type SyncAction,
  type SyncActionHandler,
  type SyncActionType,
  type SyncItemStatus,
  type SyncQueueItem,
  type SyncQueueStore,
  // Константы и типы
  type TimeSlotData,
} from './offline-service'
