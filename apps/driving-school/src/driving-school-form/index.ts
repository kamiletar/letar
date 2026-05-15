// DrivingSchoolForm — расширенный Form компонент для driving-school
export { DrivingSchoolForm } from './driving-school-form'

// Input компоненты со специальной валидацией
export {
  DEFAULT_WORKING_DAYS,
  DEFAULT_WORKING_HOURS,
  InputPlateNumber,
  ScheduleInput,
  WorkingDaysInput,
  formatPlateNumberDisplay,
  stripPlateNumberSpaces,
  validatePlateNumber,
} from './inputs'
export type {
  DayOfWeek,
  DayOfWeekEnum,
  DaySchedule,
  InputPlateNumberProps,
  ScheduleInputProps,
  TimeSlot,
  WeeklySchedule,
  WorkingDaysInputProps,
  WorkingDaysValue,
} from './inputs'

// Listbox компоненты для множественного выбора
export { ListboxLicenseCategories } from './listboxes'

// Реэкспорт labels для использования в других компонентах
export * from './labels'
