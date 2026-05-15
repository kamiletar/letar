'use client'

/**
 * Утилиты для создания типобезопасных React Context.
 *
 * Используйте createSafeContext для создания новых контекстов
 * с автоматической генерацией хуков доступа.
 */
export {
  createNamedGroupContext,
  createSafeContext,
  type NamedGroupContextValue,
  type SafeContextResult,
} from './create-safe-context'
