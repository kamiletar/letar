/**
 * Типы для маппинга серверных ошибок на поля формы.
 *
 * Поддерживаемые форматы:
 * - Zod v4 flatten: { formErrors: string[], fieldErrors: Record<string, string[]> }
 * - Prisma: PrismaClientKnownRequestError (P2002, P2003, P2025, P2014)
 * - ZenStack: { reason: 'rejected-by-policy' | 'db-query-error', ... }
 * - ActionResult: { success: false, error: string | object }
 */

/** Ошибка привязанная к полю формы */
export interface FieldError {
  /** Имя поля (dot-path: 'user.email') */
  field: string
  /** Сообщение для пользователя */
  message: string
}

/** Результат маппинга */
export interface MappedServerErrors {
  fieldErrors: FieldError[]
  formErrors: string[]
}

/** Кастомный маппинг constraint → поле */
export interface FieldErrorMap {
  [constraintKey: string]: { field: string; message: string }
}

/** Конфигурация mapServerErrors */
export interface MapServerErrorsConfig {
  fieldMap?: FieldErrorMap
  format?: 'auto' | 'zod' | 'prisma' | 'zenstack' | 'action-result'
  defaultMessage?: string
  locale?: 'ru' | 'en'
}

/** Prisma PrismaClientKnownRequestError (упрощённый) */
export interface PrismaError {
  code: string
  message: string
  clientVersion?: string
  meta?: { target?: string[]; field_name?: string; modelName?: string; cause?: string }
}

/** Zod v4 flatten() */
export interface ZodFlatError {
  formErrors: string[]
  fieldErrors: Record<string, string[]>
}

/** ZenStack policy rejection */
export interface ZenStackError {
  reason: 'rejected-by-policy' | 'db-query-error' | 'not-found'
  rejectedByPolicyReason?: 'no-access' | 'cannot-read-back' | 'other'
  message?: string
  code?: string
  meta?: PrismaError['meta']
  dbErrorMessage?: string
}

/** ActionResult (driving-school паттерн) */
export interface ActionResultError {
  success: false
  error: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> }
  message?: string
}
