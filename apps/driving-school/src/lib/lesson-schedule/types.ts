import { z } from 'zod/v4'

import type { DayOfWeek } from '../working-hours'

// Реэкспорт общих констант из working-hours
export { DAY_NAMES, DAY_NAMES_SHORT, DAYS_OF_WEEK } from '../working-hours'
export type { DayOfWeek } from '../working-hours'

// Расписание занятия на один день
export interface LessonDaySchedule {
  startTime: string // "10:00"
  duration: number // в минутах
}

// Полное расписание занятий на неделю
export type LessonSchedule = {
  [key in DayOfWeek]?: LessonDaySchedule | null
}

// Zod схема для времени
export const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Неверный формат времени (ЧЧ:ММ)')

// Zod схема для длительности
export const DurationSchema = z.coerce
  .number()
  .int('Длительность должна быть целым числом')
  .min(30, 'Минимальная длительность — 30 минут')
  .max(480, 'Максимальная длительность — 8 часов')

// Zod схема для расписания одного дня
export const LessonDayScheduleSchema = z
  .object({
    startTime: TimeSchema,
    duration: DurationSchema,
  })
  .nullable()

// Zod схема для полного расписания
export const LessonScheduleSchema = z.object({
  monday: LessonDayScheduleSchema.optional(),
  tuesday: LessonDayScheduleSchema.optional(),
  wednesday: LessonDayScheduleSchema.optional(),
  thursday: LessonDayScheduleSchema.optional(),
  friday: LessonDayScheduleSchema.optional(),
  saturday: LessonDayScheduleSchema.optional(),
  sunday: LessonDayScheduleSchema.optional(),
})

// Дефолтное расписание (пустое)
export const DEFAULT_LESSON_SCHEDULE: LessonSchedule = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
}

// Дефолтное расписание для вечерней группы (Пн-Пт 18:00, 120 мин)
export const DEFAULT_EVENING_SCHEDULE: LessonSchedule = {
  monday: { startTime: '18:00', duration: 120 },
  tuesday: { startTime: '18:00', duration: 120 },
  wednesday: { startTime: '18:00', duration: 120 },
  thursday: { startTime: '18:00', duration: 120 },
  friday: { startTime: '18:00', duration: 120 },
  saturday: null,
  sunday: null,
}

// Дефолтное расписание для утренней группы (Пн-Пт 10:00, 120 мин)
export const DEFAULT_MORNING_SCHEDULE: LessonSchedule = {
  monday: { startTime: '10:00', duration: 120 },
  tuesday: { startTime: '10:00', duration: 120 },
  wednesday: { startTime: '10:00', duration: 120 },
  thursday: { startTime: '10:00', duration: 120 },
  friday: { startTime: '10:00', duration: 120 },
  saturday: null,
  sunday: null,
}

// Дефолтное расписание для группы выходного дня (Сб-Вс 10:00, 180 мин)
export const DEFAULT_WEEKEND_SCHEDULE: LessonSchedule = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: { startTime: '10:00', duration: 180 },
  sunday: { startTime: '10:00', duration: 180 },
}
