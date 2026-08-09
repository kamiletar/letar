'use client'

/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, Этап 3в, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы публичный путь не менялся для потребителей.
 */
export {
  buildTSV,
  coerceValue,
  computeAggregate,
  formatCellValue,
  getDefaultRow,
  parseTSV,
} from '@letar/forms-core/table'
