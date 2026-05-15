/**
 * Сервис оффлайн-функциональности
 *
 * Бизнес-логика:
 * - Определение статуса онлайн/оффлайн
 * - Кэширование расписания в IndexedDB
 * - Очередь синхронизации действий
 */

import type { LessonStatus, SlotStatus } from '@letar/driving-school-db/prisma'
import { del, get, set } from 'idb-keyval'

// ============================================
// КОНСТАНТЫ
// ============================================

const SCHEDULE_STORAGE_KEY = 'driving-school-schedule'
const SYNC_QUEUE_STORAGE_KEY = 'driving-school-sync-queue'
// Максимальный размер очереди для предотвращения переполнения памяти
const MAX_QUEUE_SIZE = 1000

// ============================================
// ТИПЫ
// ============================================

/** Данные таймслота для оффлайн хранения */
export interface TimeSlotData {
  id: string
  instructorId: string
  startTime: Date
  endTime: Date
  status: SlotStatus
}

/** Данные занятия для оффлайн хранения */
export interface LessonData {
  id: string
  slotId: string
  studentId: string
  instructorId: string
  status: LessonStatus
  createdBy: string
  createdAt: Date
}

/** Состояние расписания */
export interface ScheduleState {
  slots: TimeSlotData[]
  lessons: LessonData[]
  lastSync: number
}

/** Типы действий синхронизации */
export type SyncActionType =
  | 'BOOK_LESSON'
  | 'CANCEL_LESSON'
  | 'CONFIRM_LESSON'
  | 'COMPLETE_LESSON'
  | 'MARK_NO_SHOW'
  | 'UPDATE_INSTRUCTOR_PROFILE'
  | 'UPDATE_STUDENT_PROFILE'
  | 'UPDATE_SCHOOL_SETTINGS'
  | 'UPDATE_SCHEDULE_SETTINGS'

/** Действие для синхронизации */
export interface SyncAction {
  type: SyncActionType
  payload: Record<string, unknown>
}

/** Статус элемента очереди */
export type SyncItemStatus = 'PENDING' | 'SYNCED' | 'FAILED'

/** Элемент очереди синхронизации */
export interface SyncQueueItem {
  id: string
  action: SyncAction
  createdAt: number
  attempts: number
  maxAttempts: number
  status: SyncItemStatus
  error?: string
}

/** Результат обработки элемента очереди */
export interface ProcessQueueResult {
  success: boolean
  item?: SyncQueueItem
  error?: string
}

/** Обработчик действия синхронизации */
export type SyncActionHandler = (action: SyncAction) => Promise<{ success: boolean; error?: string }>

/** Store расписания */
export interface ScheduleStore {
  getState: () => ScheduleState
  setState: (state: ScheduleState) => void
  subscribe: (listener: () => void) => () => void
  initialize: () => Promise<void>
  syncSchedule: (data: Omit<ScheduleState, 'lastSync'>) => Promise<void>
}

/** Store очереди синхронизации */
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
// СТАТУС СОЕДИНЕНИЯ
// ============================================

/**
 * Получить текущий статус оффлайн
 * @returns true если оффлайн, false если онлайн
 */
export function getOfflineStatus(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  return !navigator.onLine
}

/**
 * Подписаться на изменения статуса соединения
 * @param callback - функция, вызываемая при изменении статуса
 * @returns функция отписки
 */
export function subscribeToStatusChanges(callback: (isOffline: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {}
  }

  const handleOnline = () => callback(false)
  const handleOffline = () => callback(true)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// ============================================
// РАСПИСАНИЕ
// ============================================

/**
 * Получить расписание из IndexedDB
 */
export async function getScheduleFromStorage(): Promise<ScheduleState | null> {
  try {
    const stored = await get<ScheduleState>(SCHEDULE_STORAGE_KEY)
    return stored ?? null
  } catch (error) {
    console.error('Ошибка загрузки расписания из IndexedDB:', error)
    return null
  }
}

/**
 * Сохранить расписание в IndexedDB
 */
export async function saveScheduleToStorage(state: ScheduleState): Promise<void> {
  try {
    await set(SCHEDULE_STORAGE_KEY, state)
  } catch (error) {
    console.error('Ошибка сохранения расписания в IndexedDB:', error)
  }
}

/**
 * Очистить расписание из IndexedDB
 */
export async function clearScheduleStorage(): Promise<void> {
  try {
    await del(SCHEDULE_STORAGE_KEY)
  } catch (error) {
    console.error('Ошибка очистки расписания из IndexedDB:', error)
  }
}

/**
 * Создать store для расписания
 */
export function createScheduleStore(): ScheduleStore {
  let state: ScheduleState = {
    slots: [],
    lessons: [],
    lastSync: 0,
  }
  const listeners = new Set<() => void>()

  const notifyListeners = () => {
    listeners.forEach((listener) => listener())
  }

  return {
    getState: () => state,

    setState: (newState: ScheduleState) => {
      state = newState
      notifyListeners()
    },

    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    initialize: async () => {
      const stored = await getScheduleFromStorage()
      if (stored) {
        state = stored
        notifyListeners()
      }
    },

    syncSchedule: async (data: Omit<ScheduleState, 'lastSync'>) => {
      state = {
        ...data,
        lastSync: Date.now(),
      }
      notifyListeners()
      await saveScheduleToStorage(state)
    },
  }
}

// ============================================
// ОЧЕРЕДЬ СИНХРОНИЗАЦИИ
// ============================================

/**
 * Генерация уникального ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Получить очередь из IndexedDB
 */
export async function getQueueFromStorage(): Promise<SyncQueueItem[]> {
  try {
    const stored = await get<SyncQueueItem[]>(SYNC_QUEUE_STORAGE_KEY)
    return stored ?? []
  } catch (error) {
    console.error('Ошибка загрузки очереди из IndexedDB:', error)
    return []
  }
}

/**
 * Сохранить очередь в IndexedDB
 */
async function saveQueueToStorage(queue: SyncQueueItem[]): Promise<void> {
  try {
    await set(SYNC_QUEUE_STORAGE_KEY, queue)
  } catch (error) {
    console.error('Ошибка сохранения очереди в IndexedDB:', error)
  }
}

/**
 * Добавить действие в очередь
 * При превышении MAX_QUEUE_SIZE удаляет самые старые элементы (FIFO)
 */
export async function addToQueue(action: SyncAction): Promise<SyncQueueItem> {
  let queue = await getQueueFromStorage()

  // FIFO очистка при превышении лимита
  if (queue.length >= MAX_QUEUE_SIZE) {
    const removeCount = queue.length - MAX_QUEUE_SIZE + 1
    console.warn(`[SyncQueue] Очередь переполнена, удаляем ${removeCount} старых элементов`)
    queue = queue.slice(removeCount)
  }

  const item: SyncQueueItem = {
    id: generateId(),
    action,
    createdAt: Date.now(),
    attempts: 0,
    maxAttempts: 3,
    status: 'PENDING',
  }

  queue.push(item)
  await saveQueueToStorage(queue)

  return item
}

/**
 * Удалить элемент из очереди
 */
export async function removeFromQueue(id: string): Promise<boolean> {
  const queue = await getQueueFromStorage()
  const index = queue.findIndex((item) => item.id === id)

  if (index === -1) {
    return false
  }

  queue.splice(index, 1)
  await saveQueueToStorage(queue)

  return true
}

/**
 * Обработать один элемент очереди
 */
export async function processQueueItem(item: SyncQueueItem, handler: SyncActionHandler): Promise<ProcessQueueResult> {
  try {
    const result = await handler(item.action)

    if (result.success) {
      return {
        success: true,
        item: { ...item, status: 'SYNCED' as const },
      }
    }

    // Неуспешный результат без исключения
    const updatedItem: SyncQueueItem = {
      ...item,
      attempts: item.attempts + 1,
      status: item.attempts + 1 >= item.maxAttempts ? 'FAILED' : 'PENDING',
      error: result.error,
    }

    return {
      success: false,
      item: updatedItem,
      error: result.error,
    }
  } catch (error) {
    // Исключение при выполнении
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const updatedItem: SyncQueueItem = {
      ...item,
      attempts: item.attempts + 1,
      status: item.attempts + 1 >= item.maxAttempts ? 'FAILED' : 'PENDING',
      error: errorMessage,
    }

    return {
      success: false,
      item: updatedItem,
      error: errorMessage,
    }
  }
}

/**
 * Очистить очередь
 */
export async function clearQueue(): Promise<void> {
  try {
    await del(SYNC_QUEUE_STORAGE_KEY)
  } catch (error) {
    console.error('Ошибка очистки очереди из IndexedDB:', error)
  }
}

/**
 * Создать store для очереди синхронизации
 */
export function createSyncQueueStore(): SyncQueueStore {
  let queue: SyncQueueItem[] = []
  const listeners = new Set<() => void>()

  const notifyListeners = () => {
    listeners.forEach((listener) => listener())
  }

  return {
    getQueue: () => queue,

    getQueueLength: () => queue.length,

    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    initialize: async () => {
      queue = await getQueueFromStorage()
      notifyListeners()
    },

    add: async (action: SyncAction) => {
      // FIFO очистка в памяти при превышении лимита
      if (queue.length >= MAX_QUEUE_SIZE) {
        const removeCount = queue.length - MAX_QUEUE_SIZE + 1
        queue = queue.slice(removeCount)
      }

      const item = await addToQueue(action)
      queue.push(item)
      notifyListeners()
      return item
    },

    remove: async (id: string) => {
      const result = await removeFromQueue(id)
      if (result) {
        queue = queue.filter((item) => item.id !== id)
        notifyListeners()
      }
      return result
    },

    processAll: async (handler: SyncActionHandler) => {
      const results: ProcessQueueResult[] = []

      for (const item of queue) {
        if (item.status === 'PENDING') {
          const result = await processQueueItem(item, handler)
          results.push(result)

          // Обновляем очередь после обработки
          if (result.success && result.item) {
            await removeFromQueue(item.id)
            queue = queue.filter((q) => q.id !== item.id)
          } else if (result.item) {
            // Обновляем элемент в очереди
            const index = queue.findIndex((q) => q.id === item.id)
            if (index !== -1) {
              queue[index] = result.item
            }
            await saveQueueToStorage(queue)
          }
        }
      }

      notifyListeners()
      return results
    },
  }
}
