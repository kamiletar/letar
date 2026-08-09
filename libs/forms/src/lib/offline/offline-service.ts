/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./offline-service`) по всей `libs/forms` не пришлось переписывать.
 */
export {
  addToQueue,
  clearQueue,
  createSyncQueueStore,
  getOfflineStatus,
  getQueueFromStorage,
  processQueueItem,
  removeFromQueue,
  subscribeToStatusChanges,
} from '@letar/forms-core/offline'
