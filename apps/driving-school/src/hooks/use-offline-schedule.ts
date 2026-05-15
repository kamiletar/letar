'use client'

import { createScheduleStore, type LessonData, type ScheduleState, type TimeSlotData } from '@/lib/offline'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

// Глобальный store для расписания
const scheduleStore = createScheduleStore()

// Флаг инициализации
let initialized = false

const initialize = async () => {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    await scheduleStore.initialize()
  }
}

/**
 * Хук для работы с оффлайн расписанием
 *
 * Кэширует расписание в IndexedDB для доступа в оффлайн режиме.
 * Использует useSyncExternalStore для синхронизации между вкладками.
 *
 * @example
 * ```tsx
 * const { slots, lessons, isLoading, syncSchedule, lastSync } = useOfflineSchedule()
 *
 * // Синхронизация с сервером
 * useEffect(() => {
 *   const fetchSchedule = async () => {
 *     const data = await api.getSchedule()
 *     await syncSchedule({ slots: data.slots, lessons: data.lessons })
 *   }
 *   fetchSchedule()
 * }, [syncSchedule])
 *
 * // Отображение данных (работает и оффлайн)
 * return <ScheduleView slots={slots} lessons={lessons} />
 * ```
 */
export function useOfflineSchedule() {
  const [isLoading, setIsLoading] = useState(true)

  // Подписка на изменения состояния
  const state = useSyncExternalStore(
    (callback) => scheduleStore.subscribe(callback),
    () => scheduleStore.getState(),
    () => ({ slots: [], lessons: [], lastSync: 0 }) // SSR fallback
  )

  // Инициализация при монтировании
  useEffect(() => {
    initialize().then(() => {
      setIsLoading(false)
    })
  }, [])

  // Синхронизация расписания с сервером
  const syncSchedule = useCallback(async (data: { slots: TimeSlotData[]; lessons: LessonData[] }): Promise<void> => {
    await scheduleStore.syncSchedule(data)
  }, [])

  return {
    /** Таймслоты */
    slots: state.slots,
    /** Занятия */
    lessons: state.lessons,
    /** Время последней синхронизации (timestamp) */
    lastSync: state.lastSync,
    /** Загружается ли состояние из IndexedDB */
    isLoading,
    /** Синхронизировать расписание (сохранить в IndexedDB) */
    syncSchedule,
  }
}

export type { LessonData, ScheduleState, TimeSlotData }
