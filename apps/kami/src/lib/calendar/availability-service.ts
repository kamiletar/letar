/**
 * Сервис для расчёта доступных слотов
 */

import { prisma } from '@/lib/prisma'

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}

interface AvailabilityRule {
  dayOfWeek: number | null
  startTime: number // Минуты от полуночи
  endTime: number
  slotDuration: number
  breakDuration: number
  timezone: string
  validFrom: Date | null
  validUntil: Date | null
  isActive: boolean
}

/**
 * Получить правила доступности
 */
export async function getAvailabilityRules(): Promise<AvailabilityRule[]> {
  const rules = await prisma.availabilityRule.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      dayOfWeek: 'asc',
    },
  })
  return rules
}

/**
 * Получить забронированные слоты для диапазона дат
 */
export async function getBookedSlots(startDate: Date, endDate: Date) {
  return prisma.bookedSlot.findMany({
    where: {
      startAt: {
        gte: startDate,
      },
      endAt: {
        lte: endDate,
      },
    },
  })
}

/**
 * Сгенерировать доступные слоты на указанный день
 */
export function generateSlotsForDay(
  date: Date,
  rule: AvailabilityRule,
  bookedSlots: Array<{ startAt: Date; endAt: Date }>
): TimeSlot[] {
  const slots: TimeSlot[] = []

  // Проверяем, что правило применимо к этому дню недели
  if (rule.dayOfWeek !== null && date.getDay() !== rule.dayOfWeek) {
    return slots
  }

  // Проверяем валидность по датам
  const now = new Date()
  if (rule.validFrom && date < rule.validFrom) {
    return slots
  }
  if (rule.validUntil && date > rule.validUntil) {
    return slots
  }

  // Генерируем слоты
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  let currentMinutes = rule.startTime
  while (currentMinutes + rule.slotDuration <= rule.endTime) {
    const slotStart = new Date(startOfDay)
    slotStart.setMinutes(currentMinutes)

    const slotEnd = new Date(slotStart)
    slotEnd.setMinutes(slotStart.getMinutes() + rule.slotDuration)

    // Проверяем, не прошло ли время слота
    if (slotStart <= now) {
      currentMinutes += rule.slotDuration + rule.breakDuration
      continue
    }

    // Проверяем пересечение с забронированными слотами
    const isBooked = bookedSlots.some((booked) => {
      return slotStart < booked.endAt && slotEnd > booked.startAt
    })

    slots.push({
      start: slotStart,
      end: slotEnd,
      available: !isBooked,
    })

    currentMinutes += rule.slotDuration + rule.breakDuration
  }

  return slots
}

/**
 * Получить все доступные слоты на указанный диапазон дат
 */
export async function getAvailableSlots(startDate: Date, endDate: Date): Promise<TimeSlot[]> {
  const [rules, bookedSlots] = await Promise.all([getAvailabilityRules(), getBookedSlots(startDate, endDate)])

  if (rules.length === 0) {
    return []
  }

  const allSlots: TimeSlot[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    for (const rule of rules) {
      const daySlots = generateSlotsForDay(currentDate, rule, bookedSlots)
      allSlots.push(...daySlots)
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Сортируем по времени начала
  allSlots.sort((a, b) => a.start.getTime() - b.start.getTime())

  return allSlots
}

/**
 * Забронировать слот
 */
export async function bookSlot(startAt: Date, endAt: Date, requestId?: string) {
  return prisma.bookedSlot.create({
    data: {
      startAt,
      endAt,
      type: requestId ? 'booked' : 'blocked',
      requestId,
    },
  })
}

/**
 * Форматирование времени для отображения
 */
export function formatTimeSlot(slot: TimeSlot, locale = 'ru'): string {
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  }
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }

  const dateStr = slot.start.toLocaleDateString(locale, dateOptions)
  const startStr = slot.start.toLocaleTimeString(locale, timeOptions)
  const endStr = slot.end.toLocaleTimeString(locale, timeOptions)

  return `${dateStr} ${startStr}–${endStr}`
}
