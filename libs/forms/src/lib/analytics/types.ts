/** Событие аналитики формы */
export type FormAnalyticsEvent =
  | { type: 'field_focus'; field: string; timestamp: number }
  | { type: 'field_blur'; field: string; timestamp: number; timeSpentMs: number }
  | { type: 'field_error'; field: string; error: string; timestamp: number }
  | { type: 'field_correction'; field: string; timestamp: number; correctionCount: number }
  | { type: 'step_change'; from: number; to: number; timestamp: number }
  | {
      type: 'form_abandon'
      lastField: string
      filledFields: number
      totalFields: number
      timestamp: number
      totalTimeMs: number
    }
  | { type: 'form_complete'; totalTimeMs: number; fieldTimes: Map<string, FieldAnalytics>; timestamp: number }

/** Аналитика по отдельному полю */
export interface FieldAnalytics {
  /** Количество фокусов на поле */
  focusCount: number
  /** Общее время на поле (мс) */
  totalTimeMs: number
  /** Количество ошибок валидации */
  errorCount: number
  /** Количество возвратов (повторный фокус после blur) */
  correctionCount: number
  /** Первый фокус */
  firstFocusAt: number | null
  /** Последний blur */
  lastBlurAt: number | null
}

/** Адаптер для отправки аналитики во внешнюю систему */
export interface AnalyticsAdapter {
  /** Уникальное имя адаптера */
  name: string
  /** Отправить событие */
  track: (event: FormAnalyticsEvent, formId?: string) => void
  /** Инициализация (если нужна) */
  init?: () => void
  /** Очистка */
  destroy?: () => void
}

/** Конфигурация аналитики */
export interface FormAnalyticsConfig {
  /** Включить аналитику */
  enabled?: boolean
  /** Идентификатор формы (для разделения в адаптерах) */
  formId?: string
  /** Адаптеры для отправки данных */
  adapters?: AnalyticsAdapter[]
  /** Callbacks для событий */
  onFieldFocus?: (field: string, timestamp: number) => void
  onFieldBlur?: (field: string, timestamp: number, timeSpentMs: number) => void
  onFieldError?: (field: string, error: string) => void
  onStepChange?: (from: number, to: number) => void
  onAbandon?: (lastField: string, filledFields: number, totalFields: number) => void
  onComplete?: (totalTimeMs: number, fieldTimes: Map<string, FieldAnalytics>) => void
  /** Трекать возвраты к полю как corrections (по умолчанию true) */
  trackCorrections?: boolean
}

/** Результат хука useFormAnalytics */
export interface UseFormAnalyticsResult {
  /** Аналитика по полям */
  fieldAnalytics: Map<string, FieldAnalytics>
  /** Процент заполнения (0-100) */
  completionRate: number
  /** Последнее поле с фокусом */
  lastFocusedField: string | null
  /** Общее время с начала заполнения */
  totalTimeMs: number
  /** Количество ошибок */
  totalErrors: number
  /** Ручной трекинг ошибки поля */
  trackError: (field: string, error: string) => void
  /** Принудительная отправка abandon-события */
  trackAbandon: () => void
  /** Принудительная отправка complete-события */
  trackComplete: () => void
  /** Сброс аналитики */
  reset: () => void
}
