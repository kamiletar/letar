/**
 * Тесты для бизнес-логики оффлайн-функциональности
 *
 * TDD: Сначала пишем тесты, потом реализацию
 *
 * Бизнес-логика:
 * - Определение статуса онлайн/оффлайн
 * - Кэширование расписания в IndexedDB
 * - Очередь синхронизации действий
 */

import type { LessonStatus, SlotStatus } from '@letar/driving-school-db/prisma'
import {
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
  type LessonData,
  processQueueItem,
  removeFromQueue,
  saveScheduleToStorage,
  type ScheduleState,
  subscribeToStatusChanges,
  type SyncAction,
  type SyncQueueItem,
  type TimeSlotData,
} from './offline-service'

// === Мок idb-keyval ===

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}))

import { del, get, set } from 'idb-keyval'

const mockGet = vi.mocked(get)
const mockSet = vi.mocked(set)
const mockDel = vi.mocked(del)

// === Тестовые данные ===

const mockTimeSlot: TimeSlotData = {
  id: 'slot-1',
  instructorId: 'instructor-1',
  startTime: new Date('2025-01-15T10:00:00Z'),
  endTime: new Date('2025-01-15T11:30:00Z'),
  status: 'AVAILABLE' as SlotStatus,
}

const mockLesson: LessonData = {
  id: 'lesson-1',
  slotId: 'slot-1',
  studentId: 'student-1',
  instructorId: 'instructor-1',
  status: 'CONFIRMED' as LessonStatus,
  createdBy: 'instructor-1',
  createdAt: new Date('2025-01-10T10:00:00Z'),
}

const mockScheduleState: ScheduleState = {
  slots: [mockTimeSlot],
  lessons: [mockLesson],
  lastSync: Date.now(),
}

const mockSyncAction: SyncAction = {
  type: 'BOOK_LESSON',
  payload: { slotId: 'slot-1', studentId: 'student-1' },
}

const mockSyncQueueItem: SyncQueueItem = {
  id: 'queue-item-1',
  action: mockSyncAction,
  createdAt: Date.now(),
  attempts: 0,
  maxAttempts: 3,
  status: 'PENDING',
}

// === Тесты ===

describe('Offline Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue(undefined)
    mockSet.mockResolvedValue(undefined)
    mockDel.mockResolvedValue(undefined)
  })

  // ============================================
  // useOfflineStatus
  // ============================================

  describe('getOfflineStatus', () => {
    it('должен возвращать true когда navigator.onLine === false', () => {
      // Arrange
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true,
      })

      // Act
      const result = getOfflineStatus()

      // Assert
      expect(result).toBe(true)
    })

    it('должен возвращать false когда navigator.onLine === true', () => {
      // Arrange
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
      })

      // Act
      const result = getOfflineStatus()

      // Assert
      expect(result).toBe(false)
    })

    it('должен возвращать false когда navigator недоступен (SSR)', () => {
      // Arrange
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      })

      // Act
      const result = getOfflineStatus()

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('subscribeToStatusChanges', () => {
    let originalAddEventListener: typeof window.addEventListener
    let originalRemoveEventListener: typeof window.removeEventListener
    let mockAddEventListener: ReturnType<typeof vi.fn>
    let mockRemoveEventListener: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockAddEventListener = vi.fn()
      mockRemoveEventListener = vi.fn()
      originalAddEventListener = window.addEventListener
      originalRemoveEventListener = window.removeEventListener
      window.addEventListener = mockAddEventListener
      window.removeEventListener = mockRemoveEventListener
    })

    afterEach(() => {
      window.addEventListener = originalAddEventListener
      window.removeEventListener = originalRemoveEventListener
    })

    it('должен подписываться на события online и offline', () => {
      // Arrange
      const callback = vi.fn()

      // Act
      subscribeToStatusChanges(callback)

      // Assert
      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('должен возвращать функцию отписки', () => {
      // Arrange
      const callback = vi.fn()

      // Act
      const unsubscribe = subscribeToStatusChanges(callback)
      unsubscribe()

      // Assert
      expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('должен вызывать callback при событии offline', () => {
      // Arrange
      const callback = vi.fn()
      let offlineHandler: (() => void) | undefined

      mockAddEventListener.mockImplementation((event: string, handler: () => void) => {
        if (event === 'offline') {
          offlineHandler = handler
        }
      })

      // Act
      subscribeToStatusChanges(callback)
      offlineHandler?.()

      // Assert
      expect(callback).toHaveBeenCalledWith(true)
    })

    it('должен вызывать callback при событии online', () => {
      // Arrange
      const callback = vi.fn()
      let onlineHandler: (() => void) | undefined

      mockAddEventListener.mockImplementation((event: string, handler: () => void) => {
        if (event === 'online') {
          onlineHandler = handler
        }
      })

      // Act
      subscribeToStatusChanges(callback)
      onlineHandler?.()

      // Assert
      expect(callback).toHaveBeenCalledWith(false)
    })
  })

  // ============================================
  // useOfflineSchedule
  // ============================================

  describe('getScheduleFromStorage', () => {
    it('должен возвращать null если расписание не сохранено', async () => {
      // Arrange
      mockGet.mockResolvedValue(undefined)

      // Act
      const result = await getScheduleFromStorage()

      // Assert
      expect(result).toBeNull()
    })

    it('должен возвращать сохранённое расписание', async () => {
      // Arrange
      mockGet.mockResolvedValue(mockScheduleState)

      // Act
      const result = await getScheduleFromStorage()

      // Assert
      expect(result).toEqual(mockScheduleState)
    })

    it('должен использовать правильный ключ для IndexedDB', async () => {
      // Act
      await getScheduleFromStorage()

      // Assert
      expect(mockGet).toHaveBeenCalledWith('driving-school-schedule')
    })
  })

  describe('saveScheduleToStorage', () => {
    it('должен сохранять расписание в IndexedDB', async () => {
      // Act
      await saveScheduleToStorage(mockScheduleState)

      // Assert
      expect(mockSet).toHaveBeenCalledWith('driving-school-schedule', mockScheduleState)
    })

    it('должен не выбрасывать ошибку при сбое сохранения', async () => {
      // Arrange
      mockSet.mockRejectedValue(new Error('Storage error'))

      // Act & Assert
      await expect(saveScheduleToStorage(mockScheduleState)).resolves.not.toThrow()
    })
  })

  describe('clearScheduleStorage', () => {
    it('должен удалять расписание из IndexedDB', async () => {
      // Act
      await clearScheduleStorage()

      // Assert
      expect(mockDel).toHaveBeenCalledWith('driving-school-schedule')
    })
  })

  describe('createScheduleStore', () => {
    it('должен создавать store с начальным пустым состоянием', () => {
      // Act
      const store = createScheduleStore()

      // Assert
      expect(store.getState()).toEqual({
        slots: [],
        lessons: [],
        lastSync: 0,
      })
    })

    it('должен обновлять состояние при вызове setState', () => {
      // Arrange
      const store = createScheduleStore()

      // Act
      store.setState(mockScheduleState)

      // Assert
      expect(store.getState()).toEqual(mockScheduleState)
    })

    it('должен уведомлять слушателей при изменении состояния', () => {
      // Arrange
      const store = createScheduleStore()
      const listener = vi.fn()
      store.subscribe(listener)

      // Act
      store.setState(mockScheduleState)

      // Assert
      expect(listener).toHaveBeenCalled()
    })

    it('должен позволять отписываться от уведомлений', () => {
      // Arrange
      const store = createScheduleStore()
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)

      // Act
      unsubscribe()
      store.setState(mockScheduleState)

      // Assert
      expect(listener).not.toHaveBeenCalled()
    })

    it('должен загружать состояние из IndexedDB при initialize', async () => {
      // Arrange
      mockGet.mockResolvedValue(mockScheduleState)
      const store = createScheduleStore()

      // Act
      await store.initialize()

      // Assert
      expect(store.getState()).toEqual(mockScheduleState)
    })

    it('должен сохранять в IndexedDB при syncSchedule', async () => {
      // Arrange
      const store = createScheduleStore()

      // Act
      await store.syncSchedule(mockScheduleState)

      // Assert
      expect(mockSet).toHaveBeenCalled()
      expect(store.getState().slots).toEqual(mockScheduleState.slots)
      expect(store.getState().lessons).toEqual(mockScheduleState.lessons)
    })

    it('должен обновлять lastSync при syncSchedule', async () => {
      // Arrange
      const store = createScheduleStore()
      const beforeSync = Date.now()

      // Act
      await store.syncSchedule({ slots: [], lessons: [], lastSync: 0 })

      // Assert
      expect(store.getState().lastSync).toBeGreaterThanOrEqual(beforeSync)
    })
  })

  // ============================================
  // useSyncQueue
  // ============================================

  describe('getQueueFromStorage', () => {
    it('должен возвращать пустой массив если очередь не сохранена', async () => {
      // Arrange
      mockGet.mockResolvedValue(undefined)

      // Act
      const result = await getQueueFromStorage()

      // Assert
      expect(result).toEqual([])
    })

    it('должен возвращать сохранённую очередь', async () => {
      // Arrange
      mockGet.mockResolvedValue([mockSyncQueueItem])

      // Act
      const result = await getQueueFromStorage()

      // Assert
      expect(result).toEqual([mockSyncQueueItem])
    })

    it('должен использовать правильный ключ для IndexedDB', async () => {
      // Act
      await getQueueFromStorage()

      // Assert
      expect(mockGet).toHaveBeenCalledWith('driving-school-sync-queue')
    })
  })

  describe('addToQueue', () => {
    it('должен добавлять действие в очередь', async () => {
      // Arrange
      mockGet.mockResolvedValue([])

      // Act
      const item = await addToQueue(mockSyncAction)

      // Assert
      expect(item.action).toEqual(mockSyncAction)
      expect(item.status).toBe('PENDING')
      expect(item.attempts).toBe(0)
    })

    it('должен присваивать уникальный ID', async () => {
      // Arrange
      mockGet.mockResolvedValue([])

      // Act
      const item1 = await addToQueue(mockSyncAction)
      const item2 = await addToQueue(mockSyncAction)

      // Assert
      expect(item1.id).toBeDefined()
      expect(item2.id).toBeDefined()
      expect(item1.id).not.toBe(item2.id)
    })

    it('должен сохранять очередь в IndexedDB', async () => {
      // Arrange
      mockGet.mockResolvedValue([])

      // Act
      await addToQueue(mockSyncAction)

      // Assert
      expect(mockSet).toHaveBeenCalledWith('driving-school-sync-queue', expect.any(Array))
    })
  })

  describe('removeFromQueue', () => {
    it('должен удалять элемент из очереди по ID', async () => {
      // Arrange
      mockGet.mockResolvedValue([mockSyncQueueItem])

      // Act
      const result = await removeFromQueue(mockSyncQueueItem.id)

      // Assert
      expect(result).toBe(true)
      expect(mockSet).toHaveBeenCalledWith('driving-school-sync-queue', [])
    })

    it('должен возвращать false если элемент не найден', async () => {
      // Arrange
      mockGet.mockResolvedValue([mockSyncQueueItem])

      // Act
      const result = await removeFromQueue('non-existent-id')

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('processQueueItem', () => {
    it('должен выполнять действие через handler', async () => {
      // Arrange
      const handler = vi.fn().mockResolvedValue({ success: true })

      // Act
      const result = await processQueueItem(mockSyncQueueItem, handler)

      // Assert
      expect(handler).toHaveBeenCalledWith(mockSyncQueueItem.action)
      expect(result.success).toBe(true)
    })

    it('должен увеличивать attempts при ошибке', async () => {
      // Arrange
      const handler = vi.fn().mockRejectedValue(new Error('Network error'))

      // Act
      const result = await processQueueItem(mockSyncQueueItem, handler)

      // Assert
      expect(result.success).toBe(false)
      expect(result.item?.attempts).toBe(1)
    })

    it('должен помечать как FAILED при превышении maxAttempts', async () => {
      // Arrange
      const itemWithMaxAttempts: SyncQueueItem = {
        ...mockSyncQueueItem,
        attempts: 2, // maxAttempts = 3, это последняя попытка
      }
      const handler = vi.fn().mockRejectedValue(new Error('Network error'))

      // Act
      const result = await processQueueItem(itemWithMaxAttempts, handler)

      // Assert
      expect(result.item?.status).toBe('FAILED')
    })

    it('должен помечать как SYNCED при успехе', async () => {
      // Arrange
      const handler = vi.fn().mockResolvedValue({ success: true })

      // Act
      const result = await processQueueItem(mockSyncQueueItem, handler)

      // Assert
      expect(result.item?.status).toBe('SYNCED')
    })
  })

  describe('clearQueue', () => {
    it('должен очищать очередь', async () => {
      // Act
      await clearQueue()

      // Assert
      expect(mockDel).toHaveBeenCalledWith('driving-school-sync-queue')
    })
  })

  describe('createSyncQueueStore', () => {
    it('должен создавать store с пустой очередью', () => {
      // Act
      const store = createSyncQueueStore()

      // Assert
      expect(store.getQueue()).toEqual([])
    })

    it('должен возвращать количество элементов в очереди', async () => {
      // Arrange
      mockGet.mockResolvedValue([mockSyncQueueItem])
      const store = createSyncQueueStore()
      await store.initialize()

      // Act
      const length = store.getQueueLength()

      // Assert
      expect(length).toBe(1)
    })

    it('должен добавлять элемент через add', async () => {
      // Arrange
      mockGet.mockResolvedValue([])
      const store = createSyncQueueStore()

      // Act
      await store.add(mockSyncAction)

      // Assert
      expect(store.getQueueLength()).toBe(1)
    })

    it('должен удалять элемент через remove', async () => {
      // Arrange
      mockGet.mockResolvedValue([mockSyncQueueItem])
      const store = createSyncQueueStore()
      await store.initialize()

      // Act
      await store.remove(mockSyncQueueItem.id)

      // Assert
      expect(store.getQueueLength()).toBe(0)
    })

    it('должен обрабатывать очередь через processAll', async () => {
      // Arrange
      mockGet.mockResolvedValue([mockSyncQueueItem])
      const store = createSyncQueueStore()
      await store.initialize()
      const handler = vi.fn().mockResolvedValue({ success: true })

      // Act
      const results = await store.processAll(handler)

      // Assert
      expect(handler).toHaveBeenCalled()
      expect(results.length).toBe(1)
      expect(results[0].success).toBe(true)
    })

    it('должен уведомлять слушателей при изменении очереди', async () => {
      // Arrange
      mockGet.mockResolvedValue([])
      const store = createSyncQueueStore()
      const listener = vi.fn()
      store.subscribe(listener)

      // Act
      await store.add(mockSyncAction)

      // Assert
      expect(listener).toHaveBeenCalled()
    })

    it('должен загружать очередь из IndexedDB при initialize', async () => {
      // Arrange
      mockGet.mockResolvedValue([mockSyncQueueItem])
      const store = createSyncQueueStore()

      // Act
      await store.initialize()

      // Assert
      expect(store.getQueue()).toEqual([mockSyncQueueItem])
    })
  })
})
