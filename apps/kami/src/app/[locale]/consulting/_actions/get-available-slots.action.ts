'use server'

import { formatTimeSlot, getAvailableSlots } from '@/lib/calendar/availability-service'

export interface SlotOption {
  value: string // ISO string
  label: string // Отформатированная строка
  start: string
  end: string
}

/**
 * Получить доступные слоты на ближайшие N дней
 */
export async function getAvailableSlotsAction(daysAhead = 14, locale = 'ru'): Promise<SlotOption[]> {
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + daysAhead)

  const slots = await getAvailableSlots(startDate, endDate)

  // Фильтруем только доступные
  const availableSlots = slots.filter((slot) => slot.available)

  // Преобразуем в опции для выбора
  return availableSlots.map((slot) => ({
    value: slot.start.toISOString(),
    label: formatTimeSlot(slot, locale),
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
  }))
}

/**
 * Сгруппировать слоты по дням
 */
export async function getGroupedSlotsAction(daysAhead = 14, locale = 'ru'): Promise<Record<string, SlotOption[]>> {
  const slots = await getAvailableSlotsAction(daysAhead, locale)

  const grouped: Record<string, SlotOption[]> = {}

  for (const slot of slots) {
    const date = new Date(slot.start)
    const dateKey = date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(slot)
  }

  return grouped
}
