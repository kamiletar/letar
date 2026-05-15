import { z } from 'zod/v4'

// Дни недели
export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

// Названия дней на русском
export const DAY_NAMES: Record<DayOfWeek, string> = {
  monday: 'Понедельник',
  tuesday: 'Вторник',
  wednesday: 'Среда',
  thursday: 'Четверг',
  friday: 'Пятница',
  saturday: 'Суббота',
  sunday: 'Воскресенье',
}

// Короткие названия
export const DAY_NAMES_SHORT: Record<DayOfWeek, string> = {
  monday: 'Пн',
  tuesday: 'Вт',
  wednesday: 'Ср',
  thursday: 'Чт',
  friday: 'Пт',
  saturday: 'Сб',
  sunday: 'Вс',
}

// Интервал времени для одного дня
export interface DaySchedule {
  open: string // "09:00"
  close: string // "18:00"
}

// Полное расписание на неделю
export type WorkingHoursSchedule = {
  [key in DayOfWeek]?: DaySchedule | null
}

// Zod схема для валидации времени
export const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Неверный формат времени (ЧЧ:ММ)')

// Zod схема для расписания дня
export const DayScheduleSchema = z
  .object({
    open: TimeSchema,
    close: TimeSchema,
  })
  .nullable()

// Zod схема для полного расписания
export const WorkingHoursSchema = z.object({
  monday: DayScheduleSchema.optional(),
  tuesday: DayScheduleSchema.optional(),
  wednesday: DayScheduleSchema.optional(),
  thursday: DayScheduleSchema.optional(),
  friday: DayScheduleSchema.optional(),
  saturday: DayScheduleSchema.optional(),
  sunday: DayScheduleSchema.optional(),
})

// Дефолтное расписание (Пн-Пт 9:00-18:00)
export const DEFAULT_WORKING_HOURS: WorkingHoursSchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
}
