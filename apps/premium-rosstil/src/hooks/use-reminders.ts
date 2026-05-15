'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState } from 'react'

const IDB_KEY = 'PRODUCT_REMINDERS'

/**
 * Тип напоминания
 */
export type ReminderType = 'check_later' | 'sale_alert' | 'restock'

/**
 * Структура напоминания
 */
export interface Reminder {
  id: string
  productSlug: string
  productName: string
  productImage?: string
  type: ReminderType
  remindAt: string // ISO дата
  note?: string
  createdAt: string
  notified: boolean
}

// Конфигурация типов напоминаний
export const REMINDER_TYPES: Record<ReminderType, { label: string; description: string }> = {
  check_later: {
    label: 'Проверить позже',
    description: 'Напомнить о товаре через несколько дней',
  },
  sale_alert: {
    label: 'Уведомить о скидке',
    description: 'Сообщить когда будет акция',
  },
  restock: {
    label: 'Появление в наличии',
    description: 'Сообщить когда товар вернётся',
  },
}

// Предустановленные периоды
export const REMINDER_PERIODS = [
  { days: 1, label: 'Завтра' },
  { days: 3, label: 'Через 3 дня' },
  { days: 7, label: 'Через неделю' },
  { days: 14, label: 'Через 2 недели' },
  { days: 30, label: 'Через месяц' },
]

/**
 * Хук для управления напоминаниями о товарах.
 * Сохраняет напоминания в IndexedDB и проверяет срок.
 */
export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dueReminders, setDueReminders] = useState<Reminder[]>([])

  // Загрузка из IndexedDB
  useEffect(() => {
    const loadReminders = async () => {
      try {
        const stored = await get<Reminder[]>(IDB_KEY)
        if (stored) {
          setReminders(stored)
          // Проверяем просроченные напоминания
          const now = new Date()
          const due = stored.filter((r) => !r.notified && new Date(r.remindAt) <= now)
          setDueReminders(due)
        }
      } catch (error) {
        console.error('Ошибка загрузки напоминаний:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadReminders()
  }, [])

  // Добавление напоминания
  const addReminder = useCallback(
    async (
      productSlug: string,
      productName: string,
      type: ReminderType,
      daysFromNow: number,
      note?: string,
      productImage?: string
    ) => {
      const now = new Date()
      const remindAt = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000)

      const newReminder: Reminder = {
        id: crypto.randomUUID(),
        productSlug,
        productName,
        productImage,
        type,
        remindAt: remindAt.toISOString(),
        note,
        createdAt: now.toISOString(),
        notified: false,
      }

      const updated = [...reminders, newReminder]
      try {
        await set(IDB_KEY, updated)
        setReminders(updated)
        return { success: true, reminder: newReminder }
      } catch (error) {
        console.error('Ошибка сохранения напоминания:', error)
        return { success: false, error }
      }
    },
    [reminders]
  )

  // Удаление напоминания
  const removeReminder = useCallback(
    async (reminderId: string) => {
      const updated = reminders.filter((r) => r.id !== reminderId)
      try {
        await set(IDB_KEY, updated)
        setReminders(updated)
        setDueReminders((due) => due.filter((r) => r.id !== reminderId))
        return { success: true }
      } catch (error) {
        console.error('Ошибка удаления напоминания:', error)
        return { success: false, error }
      }
    },
    [reminders]
  )

  // Отметить напоминание как показанное
  const markAsNotified = useCallback(
    async (reminderId: string) => {
      const updated = reminders.map((r) => (r.id === reminderId ? { ...r, notified: true } : r))
      try {
        await set(IDB_KEY, updated)
        setReminders(updated)
        setDueReminders((due) => due.filter((r) => r.id !== reminderId))
        return { success: true }
      } catch (error) {
        console.error('Ошибка обновления напоминания:', error)
        return { success: false, error }
      }
    },
    [reminders]
  )

  // Проверить есть ли напоминание для товара
  const hasReminder = useCallback(
    (productSlug: string) => {
      return reminders.some((r) => r.productSlug === productSlug && !r.notified)
    },
    [reminders]
  )

  // Получить напоминания для товара
  const getProductReminders = useCallback(
    (productSlug: string) => {
      return reminders.filter((r) => r.productSlug === productSlug && !r.notified)
    },
    [reminders]
  )

  // Получить все активные напоминания
  const activeReminders = reminders.filter((r) => !r.notified)

  // Очистить все просроченные напоминания
  const clearDueReminders = useCallback(async () => {
    const updated = reminders.map((r) => (dueReminders.some((d) => d.id === r.id) ? { ...r, notified: true } : r))
    try {
      await set(IDB_KEY, updated)
      setReminders(updated)
      setDueReminders([])
      return { success: true }
    } catch (error) {
      console.error('Ошибка очистки напоминаний:', error)
      return { success: false, error }
    }
  }, [reminders, dueReminders])

  return {
    reminders: activeReminders,
    dueReminders,
    isLoading,
    addReminder,
    removeReminder,
    markAsNotified,
    hasReminder,
    getProductReminders,
    clearDueReminders,
    totalReminders: activeReminders.length,
    hasDueReminders: dueReminders.length > 0,
  }
}
