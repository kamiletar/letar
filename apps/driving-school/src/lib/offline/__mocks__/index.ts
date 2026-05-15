/**
 * @file Мок для offline модуля
 * @description Используется в тестах вместо реального IndexedDB store
 */

import { vi } from 'vitest'

// Типы (экспортируем оригинальные типы)
export interface TimeSlotData {
  id: string
  date: string
  startTime: string
  endTime: string
  instructorId: string
}

export interface LessonData {
  id: string
  slotId: string
  studentId: string
  status: string
}

export interface ScheduleState {
  slots: TimeSlotData[]
  lessons: LessonData[]
  lastSync: number
}

export interface SyncQueueItem {
  id: string
  action: string
  data: unknown
  status: string
  createdAt: number
}

export type SyncItemStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type SyncActionType = 'CREATE' | 'UPDATE' | 'DELETE'

export interface SyncAction {
  type: SyncActionType
  entity: string
  data: unknown
}

export type SyncActionHandler = (action: SyncAction) => Promise<unknown>

export interface ProcessQueueResult {
  success: boolean
  processed: number
  failed: number
}

export interface ScheduleStore {
  subscribe: (callback: () => void) => () => void
  getState: () => ScheduleState
  initialize: () => Promise<void>
  syncSchedule: (data: { slots: TimeSlotData[]; lessons: LessonData[] }) => Promise<void>
}

export interface SyncQueueStore {
  subscribe: (callback: () => void) => () => void
  getState: () => { items: SyncQueueItem[] }
  addItem: (item: Omit<SyncQueueItem, 'id' | 'createdAt'>) => Promise<void>
  processQueue: (handler: SyncActionHandler) => Promise<ProcessQueueResult>
}

// Моковое состояние
const mockState: ScheduleState = {
  slots: [],
  lessons: [],
  lastSync: Date.now(),
}

// Мок для createScheduleStore
export const createScheduleStore = vi.fn(() => ({
  subscribe: vi.fn((_callback: () => void) => vi.fn()),
  getState: vi.fn(() => mockState),
  initialize: vi.fn().mockResolvedValue(undefined),
  syncSchedule: vi.fn().mockResolvedValue(undefined),
}))

// Мок для createSyncQueueStore
export const createSyncQueueStore = vi.fn(() => ({
  subscribe: vi.fn((_callback: () => void) => vi.fn()),
  getState: vi.fn(() => ({ items: [] })),
  addItem: vi.fn().mockResolvedValue(undefined),
  processQueue: vi.fn().mockResolvedValue({ success: true, processed: 0, failed: 0 }),
}))

// Остальные моки
export const getScheduleFromStorage = vi.fn().mockResolvedValue(mockState)
export const saveScheduleToStorage = vi.fn().mockResolvedValue(undefined)
export const clearScheduleStorage = vi.fn().mockResolvedValue(undefined)
export const getQueueFromStorage = vi.fn().mockResolvedValue([])
export const addToQueue = vi.fn().mockResolvedValue('item-1')
export const removeFromQueue = vi.fn().mockResolvedValue(undefined)
export const clearQueue = vi.fn().mockResolvedValue(undefined)
export const processQueueItem = vi.fn().mockResolvedValue({ success: true })
export const getOfflineStatus = vi.fn().mockReturnValue({ isOnline: true, isOffline: false })
export const subscribeToStatusChanges = vi.fn((_callback: () => void) => vi.fn())
