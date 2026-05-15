import type { TranslateFunction, TranslateParams } from './form-i18n-provider'

/**
 * Zod v4 issue type (упрощённый тип для работы с error map)
 * Полный тип: z.core.$ZodIssue (discriminated union)
 */
interface ZodIssue {
  readonly code: string
  readonly path: PropertyKey[]
  readonly message: string
  readonly input?: unknown
  readonly expected?: string
  readonly minimum?: number
  readonly maximum?: number
  readonly inclusive?: boolean
  readonly origin?: string
  readonly format?: string
  readonly options?: unknown[]
  readonly keys?: string[]
  readonly multipleOf?: number
}

/**
 * Конфигурация для создания error map
 */
export interface FormErrorMapConfig {
  /** Функция перевода (совместима с next-intl) */
  t: TranslateFunction
  /** Префикс для ключей валидации (по умолчанию 'validation') */
  prefix?: string
}

/**
 * Извлекает параметры из Zod issue для интерполяции в сообщение
 */
function extractParams(issue: ZodIssue): TranslateParams {
  const params: TranslateParams = {}

  // Общие параметры
  if (issue.input !== undefined) {
    params.received = typeof issue.input === 'object' ? 'object' : String(issue.input)
  }

  // too_small / too_big
  if (issue.minimum !== undefined) {
    params.minimum = issue.minimum
  }
  if (issue.maximum !== undefined) {
    params.maximum = issue.maximum
  }
  if (issue.inclusive !== undefined) {
    params.inclusive = issue.inclusive
  }

  // invalid_type
  if (issue.expected !== undefined) {
    params.expected = issue.expected
  }

  // invalid_value (объединяет invalid_enum_value + invalid_literal в Zod v4)
  if (issue.options && Array.isArray(issue.options)) {
    params.options = issue.options.join(', ')
  }

  // unrecognized_keys
  if (issue.keys && Array.isArray(issue.keys)) {
    params.keys = issue.keys.join(', ')
  }

  // not_multiple_of
  if (issue.multipleOf !== undefined) {
    params.multipleOf = issue.multipleOf
  }

  // custom — сообщение из .refine()
  if (issue.message) {
    params.message = issue.message
  }

  return params
}

/**
 * Определяет origin (тип данных) для issue
 * Используется для построения ключа: validation.too_small.string
 */
function getIssueOrigin(issue: ZodIssue): string | undefined {
  // Для too_small / too_big определяем origin по типу input или expected
  if (issue.code === 'too_small' || issue.code === 'too_big') {
    if (issue.origin) {
      return issue.origin
    }
    // Fallback по типу input
    const input = issue.input
    if (typeof input === 'string') {
      return 'string'
    }
    if (typeof input === 'number') {
      return 'number'
    }
    if (Array.isArray(input)) {
      return 'array'
    }
    if (input instanceof Date) {
      return 'date'
    }
  }

  // Для invalid_format (Zod v4, ранее invalid_string) определяем format
  if (issue.code === 'invalid_format') {
    if (issue.format) {
      return issue.format
    }
  }

  return undefined
}

/**
 * Пытается получить перевод по ключу
 * @returns переведённая строка или undefined если перевод не найден
 */
function tryTranslate(t: TranslateFunction, key: string, params: TranslateParams): string | undefined {
  try {
    const result = t(key, params)
    // next-intl возвращает ключ при отсутствии перевода
    if (!result || result === key || result.startsWith(key)) {
      return undefined
    }
    return result
  } catch {
    return undefined
  }
}

/**
 * Создаёт Zod error map с поддержкой i18n
 *
 * Error map преобразует Zod ошибки в переведённые сообщения.
 * Ключи строятся по формату: `{prefix}.{code}.{origin?}`
 *
 * @example
 * ```tsx
 * import { createFormErrorMap } from '@letar/forms'
 * import { z } from 'zod/v4'
 * import { useTranslations } from 'next-intl'
 *
 * // В провайдере приложения
 * const t = useTranslations('formSchemas')
 * z.config({ customError: createFormErrorMap({ t }) })
 *
 * // Или через FormI18nProvider
 * <FormI18nProvider t={t} locale={locale} setupZodErrorMap>
 *   {children}
 * </FormI18nProvider>
 * ```
 *
 * @example Структура ключей в JSON
 * ```json
 * {
 *   "validation": {
 *     "required": "Обязательное поле",
 *     "too_small": {
 *       "string": "Минимум {minimum} символов",
 *       "number": "Минимум {minimum}"
 *     },
 *     "invalid_format": {
 *       "email": "Некорректный email"
 *     }
 *   }
 * }
 * ```
 */
export function createFormErrorMap(config: FormErrorMapConfig) {
  const { t, prefix = 'validation' } = config

  return (issue: ZodIssue): string | undefined => {
    const params = extractParams(issue)
    const origin = getIssueOrigin(issue)

    // Строим ключи для поиска перевода
    const baseKey = `${prefix}.${issue.code}`
    const originKey = origin ? `${baseKey}.${origin}` : null

    // Пробуем с origin, затем без
    let translated: string | undefined

    if (originKey) {
      translated = tryTranslate(t, originKey, params)
    }

    if (!translated) {
      translated = tryTranslate(t, baseKey, params)
    }

    // Возвращаем undefined чтобы Zod использовал дефолтное сообщение
    return translated
  }
}

/**
 * Список всех кодов ошибок Zod v4 для генерации ключей
 */
export const ZOD_ERROR_CODES = [
  'invalid_type',
  'too_small',
  'too_big',
  'invalid_format', // Zod v4: ранее invalid_string
  'not_multiple_of',
  'unrecognized_keys',
  'invalid_value', // Zod v4: объединяет invalid_enum_value + invalid_literal
  'invalid_union',
  'invalid_key',
  'invalid_element',
  'custom',
] as const

export type ZodErrorCode = (typeof ZOD_ERROR_CODES)[number]

/**
 * Origins для ошибок too_small / too_big
 */
export const SIZE_ORIGINS = ['string', 'number', 'array', 'date', 'set', 'file'] as const

/**
 * Formats для ошибок invalid_format (Zod v4, ранее invalid_string)
 */
export const STRING_FORMATS = [
  'email',
  'url',
  'uuid',
  'cuid',
  'cuid2',
  'ulid',
  'regex',
  'datetime',
  'date',
  'time',
  'duration',
  'ip',
  'cidr',
  'base64',
  'base64url',
  'json_string',
  'e164',
  'jwt',
  'emoji',
  'nanoid',
  'guid',
  'lowercase',
  'uppercase',
] as const
