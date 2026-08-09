/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./types`) по всей `libs/forms` не пришлось переписывать.
 */
export type {
  AnalyticsAdapter,
  FieldAnalytics,
  FormAnalyticsConfig,
  FormAnalyticsEvent,
  UseFormAnalyticsResult,
} from '@letar/forms-core/analytics'
