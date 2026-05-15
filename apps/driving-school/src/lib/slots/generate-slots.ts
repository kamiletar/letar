import type { DayOfWeek, SlotStatus } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface CustomBreakInput {
  isRecurring: boolean
  dayOfWeek?: DayOfWeek
  specificDate?: Date
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
}

export interface GenerateSlotsInput {
  instructorId: string
  workDays: DayOfWeek[]
  workStartTime: string // "HH:MM"
  workEndTime: string // "HH:MM"
  lessonDuration: number // минуты
  breakDuration: number // минуты
  customBreaks: CustomBreakInput[]
}

export interface GeneratedSlot {
  instructorId: string
  startTime: Date
  endTime: Date
  status: SlotStatus
}

// === Вспомогательные функции ===

/**
 * Преобразует JavaScript день недели (0-6, где 0 = воскресенье)
 * в DayOfWeek enum
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  const dayIndex = date.getDay()
  const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  return days[dayIndex]
}

/**
 * Преобразует время HH:MM в минуты от начала дня
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Проверяет, пересекаются ли два интервала времени
 * @param start1 начало первого интервала (минуты)
 * @param end1 конец первого интервала (минуты)
 * @param start2 начало второго интервала (минуты)
 * @param end2 конец второго интервала (минуты)
 */
export function intervalsOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Проверяет, применяется ли кастомный перерыв к указанной дате
 */
function isBreakApplicable(breakItem: CustomBreakInput, date: Date): boolean {
  if (breakItem.isRecurring) {
    // Регулярный перерыв - проверяем день недели
    return breakItem.dayOfWeek === getDayOfWeek(date)
  } else {
    // Разовый перерыв - проверяем конкретную дату
    if (!breakItem.specificDate) {
      return false
    }
    const breakDate = new Date(breakItem.specificDate)
    return (
      breakDate.getFullYear() === date.getFullYear() &&
      breakDate.getMonth() === date.getMonth() &&
      breakDate.getDate() === date.getDate()
    )
  }
}

/**
 * Проверяет, пересекается ли слот с каким-либо кастомным перерывом
 */
function slotOverlapsWithBreaks(
  slotStartMinutes: number,
  slotEndMinutes: number,
  breaks: CustomBreakInput[],
  date: Date
): boolean {
  for (const breakItem of breaks) {
    if (!isBreakApplicable(breakItem, date)) {
      continue
    }

    const breakStart = timeToMinutes(breakItem.startTime)
    const breakEnd = timeToMinutes(breakItem.endTime)

    if (intervalsOverlap(slotStartMinutes, slotEndMinutes, breakStart, breakEnd)) {
      return true
    }
  }
  return false
}

// === Основные функции ===

/**
 * Генерирует слоты для одного дня
 */
export function generateSlotsForDay(date: Date, settings: GenerateSlotsInput): GeneratedSlot[] {
  const dayOfWeek = getDayOfWeek(date)

  // Проверяем, является ли день рабочим
  if (!settings.workDays.includes(dayOfWeek)) {
    return []
  }

  const slots: GeneratedSlot[] = []
  const workStartMinutes = timeToMinutes(settings.workStartTime)
  const workEndMinutes = timeToMinutes(settings.workEndTime)
  const { lessonDuration, breakDuration, customBreaks, instructorId } = settings

  let currentMinutes = workStartMinutes

  while (currentMinutes + lessonDuration <= workEndMinutes) {
    const slotStartMinutes = currentMinutes
    const slotEndMinutes = currentMinutes + lessonDuration

    // Проверяем, не пересекается ли слот с кастомными перерывами
    if (!slotOverlapsWithBreaks(slotStartMinutes, slotEndMinutes, customBreaks, date)) {
      // Создаём даты для слота
      const startTime = new Date(date)
      startTime.setHours(Math.floor(slotStartMinutes / 60), slotStartMinutes % 60, 0, 0)

      const endTime = new Date(date)
      endTime.setHours(Math.floor(slotEndMinutes / 60), slotEndMinutes % 60, 0, 0)

      slots.push({
        instructorId,
        startTime,
        endTime,
        status: 'AVAILABLE',
      })
    }

    // Переходим к следующему потенциальному слоту
    currentMinutes += lessonDuration + breakDuration
  }

  return slots
}

/**
 * Генерирует слоты на заданный период (количество дней)
 */
export function generateSlotsForPeriod(
  startDate: Date,
  planningHorizon: number,
  settings: GenerateSlotsInput
): GeneratedSlot[] {
  const allSlots: GeneratedSlot[] = []

  for (let dayOffset = 0; dayOffset < planningHorizon; dayOffset++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + dayOffset)

    const daySlots = generateSlotsForDay(currentDate, settings)
    allSlots.push(...daySlots)
  }

  return allSlots
}
