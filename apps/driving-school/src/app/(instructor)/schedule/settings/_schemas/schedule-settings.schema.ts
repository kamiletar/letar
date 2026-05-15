import { z } from 'zod/v4'

import {
  DAYS_OF_WEEK,
  DEFAULT_WORKING_HOURS,
  type WorkingHoursSchedule,
  WorkingHoursSchema,
} from '@/lib/working-hours/types'

// Схема для JSON из формы (строка -> объект)
const WorkingHoursJsonSchema = z
  .string()
  .transform((val) => {
    try {
      return JSON.parse(val) as WorkingHoursSchedule
    } catch {
      return null
    }
  })
  .pipe(WorkingHoursSchema)
  .refine(
    (schedule) => {
      // Проверяем, что хотя бы один день рабочий
      return DAYS_OF_WEEK.some((day) => schedule[day] !== null && schedule[day] !== undefined)
    },
    { message: 'Выберите хотя бы один рабочий день' }
  )

// Основная схема настроек расписания
export const ScheduleSettingsFormSchema = z
  .object({
    workingHours: WorkingHoursJsonSchema.meta({
      ui: {
        title: 'Рабочие часы',
        description: 'Настройка рабочего времени по дням недели',
      },
    }),
    lessonDuration: z.coerce
      .number()
      .int('Длительность должна быть целым числом')
      .min(30, 'Минимальная длительность занятия: 30 минут')
      .max(180, 'Максимальная длительность занятия: 180 минут')
      .meta({
        ui: {
          title: 'Длительность занятия',
          placeholder: '90',
          fieldType: 'number',
          description: 'Продолжительность одного занятия в минутах',
        },
      }),
    breakDuration: z.coerce
      .number()
      .int('Перерыв должен быть целым числом')
      .min(0, 'Перерыв не может быть отрицательным')
      .max(60, 'Максимальный перерыв: 60 минут')
      .meta({
        ui: {
          title: 'Перерыв между занятиями',
          placeholder: '15',
          fieldType: 'number',
          description: 'Время отдыха между занятиями в минутах',
        },
      }),
    planningHorizon: z.coerce
      .number()
      .int('Горизонт планирования должен быть целым числом')
      .min(1, 'Минимальный горизонт планирования: 1 день')
      .max(30, 'Максимальный горизонт планирования: 30 дней')
      .meta({
        ui: {
          title: 'Горизонт планирования',
          placeholder: '7',
          fieldType: 'number',
          description: 'На сколько дней вперёд открывать запись',
        },
      }),
  })
  .strip()

export type ScheduleSettingsFormData = z.infer<typeof ScheduleSettingsFormSchema>

// INPUT тип для форм (до трансформации)
export type ScheduleSettingsFormInput = z.input<typeof ScheduleSettingsFormSchema>

// Значения по умолчанию для новых инструкторов
export const DEFAULT_SCHEDULE_SETTINGS: ScheduleSettingsFormData = {
  workingHours: DEFAULT_WORKING_HOURS,
  lessonDuration: 90,
  breakDuration: 15,
  planningHorizon: 7,
}

/**
 * Преобразует время HH:MM в минуты от начала дня
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Преобразует минуты от начала дня в формат HH:MM
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Вычисляет количество слотов, которые поместятся в рабочий день
 */
export function calculateSlotsPerDay(
  workStartTime: string,
  workEndTime: string,
  lessonDuration: number,
  breakDuration: number
): number {
  const startMinutes = timeToMinutes(workStartTime)
  const endMinutes = timeToMinutes(workEndTime)
  const totalMinutes = endMinutes - startMinutes

  if (totalMinutes <= 0) {
    return 0
  }

  const slotWithBreak = lessonDuration + breakDuration

  // Последнее занятие не требует перерыва после себя
  // (totalMinutes + breakDuration) / slotWithBreak даст количество полных слотов
  return Math.floor((totalMinutes + breakDuration) / slotWithBreak)
}

/**
 * Получить количество рабочих дней из расписания
 */
export function getWorkDaysCount(workingHours: WorkingHoursSchedule): number {
  return DAYS_OF_WEEK.filter((day) => workingHours[day] !== null && workingHours[day] !== undefined).length
}
