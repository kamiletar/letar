/**
 * Парсеры серверных ошибок различных форматов.
 * Каждый парсер принимает unknown и возвращает MappedServerErrors | null.
 * null означает "не мой формат, передай следующему".
 */

import type {
  ActionResultError,
  FieldErrorMap,
  MappedServerErrors,
  PrismaError,
  ZenStackError,
  ZodFlatError,
} from './types'

// --- Детекторы формата ---

function isPrismaError(error: unknown): error is PrismaError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PrismaError).code === 'string' &&
    (error as PrismaError).code.startsWith('P')
  )
}

function isZodFlatError(error: unknown): error is ZodFlatError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'fieldErrors' in error &&
    typeof (error as ZodFlatError).fieldErrors === 'object'
  )
}

function isZenStackError(error: unknown): error is ZenStackError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'reason' in error &&
    typeof (error as ZenStackError).reason === 'string'
  )
}

function isActionResultError(error: unknown): error is ActionResultError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    (error as ActionResultError).success === false &&
    'error' in error
  )
}

// --- Встроенные сообщения по locale ---

const PRISMA_MESSAGES = {
  ru: {
    P2002: (fields: string[]) =>
      fields.length === 1 ? `${fields[0]} уже существует` : `Комбинация ${fields.join(' + ')} уже существует`,
    P2003: (field?: string) => (field ? `Связанная запись "${field}" не найдена` : 'Связанная запись не найдена'),
    P2025: () => 'Запись не найдена',
    P2014: () => 'Невозможно удалить — есть связанные записи',
    default: () => 'Ошибка базы данных',
  },
  en: {
    P2002: (fields: string[]) =>
      fields.length === 1 ? `${fields[0]} already exists` : `Combination of ${fields.join(' + ')} already exists`,
    P2003: (field?: string) => (field ? `Related record "${field}" not found` : 'Related record not found'),
    P2025: () => 'Record not found',
    P2014: () => 'Cannot delete — has related records',
    default: () => 'Database error',
  },
} as const

type Locale = keyof typeof PRISMA_MESSAGES

// --- Парсеры ---

/**
 * Парсер Prisma ошибок.
 * P2002 (unique constraint) → маппит meta.target на поле формы.
 * P2003 (foreign key) → маппит meta.field_name.
 * P2025 (not found) → глобальная ошибка.
 */
export function parsePrismaError(
  error: unknown,
  fieldMap?: FieldErrorMap,
  locale: Locale = 'ru'
): MappedServerErrors | null {
  if (!isPrismaError(error)) return null

  const msgs = PRISMA_MESSAGES[locale]
  const result: MappedServerErrors = { fieldErrors: [], formErrors: [] }

  switch (error.code) {
    case 'P2002': {
      const targets = error.meta?.target ?? []
      // Проверяем кастомный маппинг: по имени constraint или по первому полю
      const constraintKey = targets.join('_')
      const mapped = fieldMap?.[constraintKey] ?? (targets.length === 1 ? fieldMap?.[targets[0]] : undefined)

      if (mapped) {
        result.fieldErrors.push({ field: mapped.field, message: mapped.message })
      } else if (targets.length > 0) {
        // Автомаппинг: первое поле target → ошибка
        result.fieldErrors.push({
          field: targets[0],
          message: msgs.P2002(targets),
        })
      } else {
        result.formErrors.push(msgs.P2002([]))
      }
      break
    }

    case 'P2003': {
      const field = error.meta?.field_name
      const mapped = field ? fieldMap?.[field] : undefined

      if (mapped) {
        result.fieldErrors.push({ field: mapped.field, message: mapped.message })
      } else if (field) {
        result.fieldErrors.push({ field, message: msgs.P2003(field) })
      } else {
        result.formErrors.push(msgs.P2003())
      }
      break
    }

    case 'P2025':
      result.formErrors.push(msgs.P2025())
      break

    case 'P2014':
      result.formErrors.push(msgs.P2014())
      break

    default:
      result.formErrors.push(msgs.default())
  }

  return result
}

/**
 * Парсер ZenStack ошибок.
 * rejected-by-policy → глобальная ошибка "Нет доступа".
 * db-query-error → делегируем Prisma парсеру (оборачивает Prisma ошибки).
 */
export function parseZenStackError(
  error: unknown,
  fieldMap?: FieldErrorMap,
  locale: Locale = 'ru'
): MappedServerErrors | null {
  if (!isZenStackError(error)) return null

  const result: MappedServerErrors = { fieldErrors: [], formErrors: [] }

  switch (error.reason) {
    case 'rejected-by-policy': {
      const message =
        locale === 'ru'
          ? error.rejectedByPolicyReason === 'cannot-read-back'
            ? 'Операция выполнена, но результат недоступен из-за ограничений доступа'
            : 'Нет доступа для выполнения этой операции'
          : error.rejectedByPolicyReason === 'cannot-read-back'
            ? 'Operation succeeded but result is not accessible due to permissions'
            : 'Access denied for this operation'
      result.formErrors.push(message)
      break
    }

    case 'db-query-error': {
      // ZenStack оборачивает Prisma ошибки — извлекаем код и meta
      if (error.code) {
        const prismaLike: PrismaError = {
          code: error.code,
          message: error.dbErrorMessage ?? error.message ?? '',
          meta: error.meta,
        }
        const prismaResult = parsePrismaError(prismaLike, fieldMap, locale)
        if (prismaResult) return prismaResult
      }
      result.formErrors.push(error.message ?? (locale === 'ru' ? 'Ошибка базы данных' : 'Database error'))
      break
    }

    case 'not-found':
      result.formErrors.push(locale === 'ru' ? 'Запись не найдена' : 'Record not found')
      break

    default:
      result.formErrors.push(error.message ?? (locale === 'ru' ? 'Неизвестная ошибка' : 'Unknown error'))
  }

  return result
}

/**
 * Парсер Zod v4 flatten формата.
 * { formErrors: string[], fieldErrors: { email: ['msg1'], name: ['msg2'] } }
 */
export function parseZodFlatError(error: unknown): MappedServerErrors | null {
  if (!isZodFlatError(error)) return null

  const result: MappedServerErrors = { fieldErrors: [], formErrors: [] }

  // Глобальные ошибки формы
  if (Array.isArray(error.formErrors)) {
    result.formErrors.push(...error.formErrors)
  }

  // Ошибки по полям
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (Array.isArray(messages)) {
      for (const message of messages) {
        if (typeof message === 'string') {
          result.fieldErrors.push({ field, message })
        }
      }
    }
  }

  return result
}

/**
 * Парсер ActionResult формата (driving-school паттерн).
 * { success: false, error: string | { fieldErrors, formErrors } }
 */
export function parseActionResultError(error: unknown): MappedServerErrors | null {
  if (!isActionResultError(error)) return null

  const result: MappedServerErrors = { fieldErrors: [], formErrors: [] }

  if (typeof error.error === 'string') {
    // Простая строковая ошибка → глобальная
    result.formErrors.push(error.error)
  } else if (typeof error.error === 'object') {
    // Вложенный Zod flatten формат
    const zodResult = parseZodFlatError(error.error)
    if (zodResult) return zodResult
  }

  // Дополнительное message
  if (error.message && !result.formErrors.includes(error.message)) {
    result.formErrors.push(error.message)
  }

  return result
}

/**
 * Парсер для обычных Error объектов.
 * Проверяет .info (ZenStack стиль) и .cause.
 */
export function parseErrorObject(
  error: unknown,
  fieldMap?: FieldErrorMap,
  locale: Locale = 'ru'
): MappedServerErrors | null {
  if (!(error instanceof Error)) return null

  // ZenStack-стиль: Error с .info
  const info = (error as Error & { info?: unknown }).info
  if (info) {
    const zenResult = parseZenStackError(info, fieldMap, locale)
    if (zenResult) return zenResult
  }

  // Error с .cause (цепочка ошибок)
  const cause = (error as Error & { cause?: unknown }).cause
  if (cause) {
    const prismaResult = parsePrismaError(cause, fieldMap, locale)
    if (prismaResult) return prismaResult
  }

  return { fieldErrors: [], formErrors: [error.message] }
}
