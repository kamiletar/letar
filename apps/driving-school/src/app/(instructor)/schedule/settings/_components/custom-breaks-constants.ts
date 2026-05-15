/**
 * Константы для редактора перерывов
 */

import { createListCollection } from '@chakra-ui/react'

import type { DayOfWeek } from '@letar/driving-school-db/prisma'

/**
 * Названия дней недели в именительном падеже
 */
export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Понедельник',
  TUESDAY: 'Вторник',
  WEDNESDAY: 'Среда',
  THURSDAY: 'Четверг',
  FRIDAY: 'Пятница',
  SATURDAY: 'Суббота',
  SUNDAY: 'Воскресенье',
}

/**
 * Винительный падеж с правильным родом для "Каждый/Каждую/Каждое"
 */
export const DAY_OF_WEEK_ACCUSATIVE: Record<DayOfWeek, string> = {
  MONDAY: 'Каждый понедельник',
  TUESDAY: 'Каждый вторник',
  WEDNESDAY: 'Каждую среду',
  THURSDAY: 'Каждый четверг',
  FRIDAY: 'Каждую пятницу',
  SATURDAY: 'Каждую субботу',
  SUNDAY: 'Каждое воскресенье',
}

/**
 * Коллекция для Select дня недели (с опцией "Все рабочие дни") - для создания
 */
export const dayOfWeekCollectionWithAll = createListCollection({
  items: [
    { value: 'ALL', label: 'Все рабочие дни' },
    ...Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => ({ value, label })),
  ],
})

/**
 * Коллекция для Select дня недели - для редактирования (без ALL)
 */
export const dayOfWeekCollection = createListCollection({
  items: Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => ({ value, label })),
})

/**
 * Тип формы перерыва
 */
export type BreakType = 'recurring' | 'oneTime'

/**
 * Данные формы перерыва
 */
export interface BreakFormData {
  breakType: BreakType
  dayOfWeek: DayOfWeek | 'ALL'
  specificDate: string
  startTime: string
  endTime: string
  reason: string
}

/**
 * Начальные значения формы
 */
export const INITIAL_FORM_DATA: BreakFormData = {
  breakType: 'recurring',
  dayOfWeek: 'ALL',
  specificDate: '',
  startTime: '12:00',
  endTime: '13:00',
  reason: 'Обед',
}
