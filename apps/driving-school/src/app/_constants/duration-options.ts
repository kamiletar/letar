/**
 * Опции длительности для форм расписания и занятий
 */

// Тип опции для Select компонентов
interface SelectOption {
  label: string
  value: string
}

// Опции длительности занятия
export const LESSON_DURATION_OPTIONS: SelectOption[] = [
  { label: '30 минут', value: '30' },
  { label: '45 минут', value: '45' },
  { label: '1 час', value: '60' },
  { label: '1.5 часа', value: '90' },
  { label: '2 часа', value: '120' },
  { label: '3 часа', value: '180' },
  { label: '4 часа', value: '240' },
]

// Опции перерыва между занятиями
export const BREAK_DURATION_OPTIONS: SelectOption[] = [
  { label: 'Без перерыва', value: '0' },
  { label: '5 минут', value: '5' },
  { label: '10 минут', value: '10' },
  { label: '15 минут', value: '15' },
  { label: '20 минут', value: '20' },
  { label: '30 минут', value: '30' },
  { label: '45 минут', value: '45' },
  { label: '1 час', value: '60' },
]

// Опции горизонта планирования
export const PLANNING_HORIZON_OPTIONS: SelectOption[] = [
  { label: '1 день', value: '1' },
  { label: '3 дня', value: '3' },
  { label: '1 неделя', value: '7' },
  { label: '2 недели', value: '14' },
  { label: '3 недели', value: '21' },
  { label: '1 месяц', value: '30' },
  { label: '2 месяца', value: '60' },
]

// Типы значений для TypeScript
export type LessonDurationValue = '30' | '45' | '60' | '90' | '120' | '180' | '240'
export type BreakDurationValue = '0' | '5' | '10' | '15' | '20' | '30' | '45' | '60'
export type PlanningHorizonValue = '1' | '3' | '7' | '14' | '21' | '30' | '60'
