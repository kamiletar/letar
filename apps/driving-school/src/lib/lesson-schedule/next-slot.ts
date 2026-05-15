import type { DayOfWeek, LessonSchedule } from './types'
import { DAYS_OF_WEEK } from './types'

/**
 * Маппинг JS Date.getDay() → DayOfWeek
 * 0=Sunday, 1=Monday, ... 6=Saturday
 */
const JS_DAY_TO_DAY_OF_WEEK: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

interface NextSlotResult {
  scheduledAt: Date
  duration: number
}

/**
 * Вычислить следующий свободный слот для занятия по расписанию группы.
 *
 * Перебирает дни начиная с fromDate, ищет первый день, который:
 * 1. Совпадает с активным днём в lessonSchedule
 * 2. Не занят существующим занятием (по дате, без учёта времени)
 *
 * @param lessonSchedule - расписание группы (JSON с днями недели)
 * @param existingDates - массив дат уже существующих занятий
 * @param fromDate - начальная дата поиска (по умолчанию — сегодня)
 * @param maxDaysAhead - максимум дней для поиска (по умолчанию 90)
 */
export function getNextLessonSlot(
  lessonSchedule: LessonSchedule,
  existingDates: Date[],
  fromDate: Date = new Date(),
  maxDaysAhead = 90
): NextSlotResult | null {
  // Собираем активные дни расписания
  const activeDays = DAYS_OF_WEEK.filter((day) => lessonSchedule[day] !== null && lessonSchedule[day] !== undefined)

  if (activeDays.length === 0) {
    return null
  }

  // Множество занятых дат (только дата без времени)
  const occupiedDates = new Set(
    existingDates.map((d) => {
      const date = new Date(d)
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    })
  )

  // Перебираем дни начиная с fromDate
  const current = new Date(fromDate)
  current.setHours(0, 0, 0, 0)

  for (let i = 0; i < maxDaysAhead; i++) {
    const dayOfWeek = JS_DAY_TO_DAY_OF_WEEK[current.getDay()]
    const daySchedule = lessonSchedule[dayOfWeek]

    if (daySchedule) {
      const dateKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`

      if (!occupiedDates.has(dateKey)) {
        // Формируем дату с учётом времени из расписания
        const [hours, minutes] = daySchedule.startTime.split(':').map(Number)
        const scheduledAt = new Date(current)
        scheduledAt.setHours(hours, minutes, 0, 0)

        return {
          scheduledAt,
          duration: daySchedule.duration,
        }
      }
    }

    // Следующий день
    current.setDate(current.getDate() + 1)
  }

  return null
}
