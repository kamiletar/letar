/**
 * Отказ Server Action значением: `ActionFailure`.
 *
 * В production Next.js стирает текст любой ошибки, брошенной из Server Action: клиент видит
 * «Minified React error» (код 441) вместо причины. Поэтому ожидаемый отказ (бизнес-правило,
 * дубль уникального значения) сервер возвращает ЗНАЧЕНИЕМ `{ success: false, error }`, а клиент
 * превращает его обратно в исключение через `unwrapActionResult` (или это делает
 * `useFormServerAction.run`) — клиентский `throw` не стирается и доезжает до
 * `middleware.onError` / `mapServerErrors`.
 *
 * Модуль без React и без Node-API: им пользуются и Server Action, и клиентская форма.
 */

/**
 * Результат Server Action, которым форма показывает причину отказа.
 *
 * Подтип `ActionResultError`: маркер `success: false` явный, поэтому успешный результат с
 * полем `error` (частичный успех — `{ items, error: 'часть строк пропущена' }`) отказом не
 * считается.
 */
export type ActionFailure = {
  success: false
  /** Текст причины для пользователя. */
  error: string
  /** Поле формы, к которому относится отказ (например `slug` при дубле). Нет — общая ошибка формы. */
  field?: string
}

/** Собирает отказ. Единственный поддерживаемый способ его создать — маркер не пишется руками. */
export function actionFailure(error: string, field?: string): ActionFailure {
  return { success: false, error, ...(field ? { field } : {}) }
}

export function isActionFailure(value: unknown): value is ActionFailure {
  return (
    typeof value === 'object'
    && value !== null
    && (value as { success?: unknown }).success === false
    && typeof (value as { error?: unknown }).error === 'string'
  )
}

/**
 * Ошибка с текстом, предназначенным пользователю. Бросается из серверного кода (`assert*`), а
 * `catchActionFailure` в action превращает её в `ActionFailure`. Обычный `Error` не подходит:
 * его сообщение может быть техническим и пользователю показываться не должно.
 */
export class UserFacingError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}

/** Клиентская сторона `ActionFailure`: то, что `unwrapActionResult` бросает внутри формы. */
export class ActionFailureError extends Error {
  readonly field?: string

  constructor(failure: ActionFailure) {
    super(failure.error)
    this.name = 'ActionFailureError'
    this.field = failure.field
  }
}

/**
 * Определяет `ActionFailureError` по имени, а не по `instanceof`: модуль может оказаться в
 * бандле дважды (`@letar/forms` и `@letar/forms-core` подтягивают его независимо), и тогда
 * `instanceof` молча даёт `false`.
 */
export function isActionFailureError(error: unknown): error is ActionFailureError {
  return error instanceof Error && error.name === 'ActionFailureError'
}

/**
 * Клиент: значение отказа → исключение; успех возвращается как есть (тип сужается до `T`).
 * Вызывать внутри `onSubmit` формы, где `middleware.onError` показывает сообщение.
 */
export function unwrapActionResult<T>(result: T | ActionFailure): T {
  if (isActionFailure(result)) {
    throw new ActionFailureError(result)
  }
  return result
}

// --- Ошибки БД ---

/**
 * SQLSTATE ошибки БД. ZenStack v3 ORM оборачивает ошибку драйвера в `ORMError` с `dbErrorCode`
 * = сырой Postgres SQLSTATE (`23505` unique_violation, `40001` serialization_failure), а не
 * Prisma-код `P2002`/`P2034`; исходная pg-ошибка лежит в `cause`. Проверяем оба места, чтобы не
 * зависеть от ORM.
 */
export function isDbErrorCode(error: unknown, sqlState: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  if ((error as { dbErrorCode?: unknown }).dbErrorCode === sqlState) {
    return true
  }
  const cause = (error as { cause?: unknown }).cause
  return typeof cause === 'object' && cause !== null && (cause as { code?: unknown }).code === sqlState
}

function constraintName(error: unknown): string | undefined {
  const cause = typeof error === 'object' && error !== null ? (error as { cause?: unknown }).cause : undefined
  const constraint = typeof cause === 'object' && cause !== null
    ? (cause as { constraint?: unknown }).constraint
    : undefined
  return typeof constraint === 'string' ? constraint : undefined
}

/**
 * Нарушение unique (`23505`). Prisma-код `P2002` сюда не входит — его разбирает
 * `parsePrismaError`. `constraintNameFragment` — часть имени нарушенного ограничения.
 */
export function isUniqueViolation(error: unknown, constraintNameFragment?: string): boolean {
  if (!isDbErrorCode(error, '23505')) {
    return false
  }
  if (!constraintNameFragment) {
    return true
  }
  return constraintName(error)?.includes(constraintNameFragment) ?? false
}

/**
 * Поле из имени unique-ограничения Postgres, только когда оно однозначно.
 *
 * Prisma называет ограничение `<Table>_<field>[_<field>…]_key`. Разделитель — тот же `_`, что
 * бывает в самих именах (`@@map("material_category")`, `@map("created_at")`), поэтому имя из
 * трёх частей `<Table>_<field>_key` читается однозначно, а из большего числа — нет: это может
 * быть и составной ключ, и таблица с подчёркиванием. В неоднозначном случае — пустой список, и
 * пользователь получает общий текст, а не ошибку под чужим полем.
 */
export function uniqueFieldsFromConstraint(constraint: string | undefined): string[] {
  if (!constraint) {
    return []
  }
  const parts = constraint.split('_')
  return parts.length === 3 && parts[2] === 'key' && parts[0] && parts[1] ? [parts[1]] : []
}

// --- catchActionFailure ---

const GENERIC_UNIQUE_MESSAGE = {
  ru: 'Такая запись уже существует',
  en: 'This record already exists',
} as const

export type CatchActionFailureOptions = {
  /**
   * Свои сообщения при дубле уникального значения: ключ — поле (`slug`) или поля через `_` для
   * составного ограничения (`workId_materialId`). Ключ сверяется с хвостом имени ограничения
   * (`…_<ключ>_key`), при нескольких подходящих берётся самый длинный. Приоритетнее общего.
   */
  uniqueMessages?: Record<string, string>
  /** Язык общего сообщения при дубле. По умолчанию `ru`. */
  locale?: keyof typeof GENERIC_UNIQUE_MESSAGE
}

function findUniqueMessage(constraint: string | undefined, messages: Record<string, string> | undefined) {
  if (!constraint || !messages) {
    return undefined
  }
  let best: string | undefined
  for (const key of Object.keys(messages)) {
    if (constraint.endsWith(`_${key}_key`) && (best === undefined || key.length > best.length)) {
      best = key
    }
  }
  return best === undefined ? undefined : messages[best]
}

/**
 * Серверная сторона: выполняет работу и превращает ожидаемые отказы в `ActionFailure`.
 * Ловит только `UserFacingError` и нарушение unique (`23505`); остальное — настоящая
 * неполадка, её пробрасываем как раньше (в логи и трекер ошибок).
 */
export async function catchActionFailure<T>(
  work: () => Promise<T>,
  options: CatchActionFailureOptions = {},
): Promise<T | ActionFailure> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof UserFacingError) {
      return actionFailure(error.message, error.field)
    }
    if (isUniqueViolation(error)) {
      const constraint = constraintName(error)
      const message = findUniqueMessage(constraint, options.uniqueMessages)
        ?? GENERIC_UNIQUE_MESSAGE[options.locale ?? 'ru']
      return actionFailure(message, uniqueFieldsFromConstraint(constraint)[0])
    }
    throw error
  }
}
