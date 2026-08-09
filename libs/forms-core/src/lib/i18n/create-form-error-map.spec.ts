import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { createFormErrorMap, SIZE_ORIGINS, STRING_FORMATS, ZOD_ERROR_CODES } from './create-form-error-map'
import type { TranslateFunction } from './types'

/**
 * Мок функция перевода для тестов
 */
function createMockTranslator(translations: Record<string, string>): TranslateFunction {
  return (key: string, params?: Record<string, string | number | boolean | undefined>) => {
    let result = translations[key]
    if (!result) {
      return key
    } // next-intl поведение — возвращает ключ

    // Интерполяция параметров {param}
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        if (paramValue !== undefined) {
          result = result.replace(`{${paramKey}}`, String(paramValue))
        }
      }
    }

    return result
  }
}

describe('createFormErrorMap', () => {
  describe('базовая функциональность', () => {
    it('возвращает переведённое сообщение для простой ошибки', () => {
      const t = createMockTranslator({
        'validation.invalid_type': 'Неверный тип данных',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'invalid_type',
        path: ['field'],
        message: 'Expected string',
        expected: 'string',
      })

      expect(result).toBe('Неверный тип данных')
    })

    it('возвращает undefined если перевод не найден', () => {
      const t = createMockTranslator({})
      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'some_unknown_code',
        path: [],
        message: 'Default message',
      })

      expect(result).toBeUndefined()
    })

    it('использует кастомный prefix', () => {
      const t = createMockTranslator({
        'errors.invalid_type': 'Ошибка типа',
      })

      const errorMap = createFormErrorMap({ t, prefix: 'errors' })

      const result = errorMap({
        code: 'invalid_type',
        path: [],
        message: 'Invalid type',
      })

      expect(result).toBe('Ошибка типа')
    })
  })

  describe('too_small / too_big с origin', () => {
    it('использует origin для строк: validation.too_small.string', () => {
      const t = createMockTranslator({
        'validation.too_small.string': 'Минимум {minimum} символов',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'too_small',
        path: ['name'],
        message: 'String must contain at least 3 character(s)',
        minimum: 3,
        input: 'ab',
        origin: 'string',
      })

      expect(result).toBe('Минимум 3 символов')
    })

    it('использует origin для чисел: validation.too_small.number', () => {
      const t = createMockTranslator({
        'validation.too_small.number': 'Минимум {minimum}',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'too_small',
        path: ['age'],
        message: 'Number must be greater than 0',
        minimum: 0,
        input: -5,
        origin: 'number',
      })

      expect(result).toBe('Минимум 0')
    })

    it('использует origin для массивов: validation.too_small.array', () => {
      const t = createMockTranslator({
        'validation.too_small.array': 'Минимум {minimum} элементов',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'too_small',
        path: ['items'],
        message: 'Array must contain at least 1 element(s)',
        minimum: 1,
        input: [],
        origin: 'array',
      })

      expect(result).toBe('Минимум 1 элементов')
    })

    it('fallback к baseKey если origin перевод не найден', () => {
      const t = createMockTranslator({
        'validation.too_small': 'Слишком маленькое значение',
        // validation.too_small.string НЕ определён
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'too_small',
        path: ['name'],
        message: 'String must contain at least 3 character(s)',
        minimum: 3,
        origin: 'string',
      })

      expect(result).toBe('Слишком маленькое значение')
    })

    it('too_big с maximum параметром', () => {
      const t = createMockTranslator({
        'validation.too_big.string': 'Максимум {maximum} символов',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'too_big',
        path: ['bio'],
        message: 'String must contain at most 500 character(s)',
        maximum: 500,
        origin: 'string',
      })

      expect(result).toBe('Максимум 500 символов')
    })
  })

  describe('invalid_format (Zod v4, ранее invalid_string)', () => {
    it('использует format для email: validation.invalid_format.email', () => {
      const t = createMockTranslator({
        'validation.invalid_format.email': 'Некорректный email',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'invalid_format',
        path: ['email'],
        message: 'Invalid email',
        format: 'email',
      })

      expect(result).toBe('Некорректный email')
    })

    it('использует format для url: validation.invalid_format.url', () => {
      const t = createMockTranslator({
        'validation.invalid_format.url': 'Некорректный URL',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'invalid_format',
        path: ['website'],
        message: 'Invalid url',
        format: 'url',
      })

      expect(result).toBe('Некорректный URL')
    })

    it('использует format для uuid: validation.invalid_format.uuid', () => {
      const t = createMockTranslator({
        'validation.invalid_format.uuid': 'Некорректный UUID',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'invalid_format',
        path: ['id'],
        message: 'Invalid uuid',
        format: 'uuid',
      })

      expect(result).toBe('Некорректный UUID')
    })
  })

  describe('invalid_value (Zod v4, объединяет enum + literal)', () => {
    it('передаёт options как строку', () => {
      const t = createMockTranslator({
        'validation.invalid_value': 'Недопустимое значение. Ожидается: {options}',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'invalid_value',
        path: ['role'],
        message: 'Invalid enum value',
        options: ['ADMIN', 'USER', 'GUEST'],
      })

      expect(result).toBe('Недопустимое значение. Ожидается: ADMIN, USER, GUEST')
    })
  })

  describe('unrecognized_keys', () => {
    it('передаёт keys как строку', () => {
      const t = createMockTranslator({
        'validation.unrecognized_keys': 'Неизвестные поля: {keys}',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'unrecognized_keys',
        path: [],
        message: 'Unrecognized key(s) in object',
        keys: ['foo', 'bar'],
      })

      expect(result).toBe('Неизвестные поля: foo, bar')
    })
  })

  describe('not_multiple_of', () => {
    it('передаёт multipleOf параметр', () => {
      const t = createMockTranslator({
        'validation.not_multiple_of': 'Должно быть кратно {multipleOf}',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'not_multiple_of',
        path: ['quantity'],
        message: 'Number must be a multiple of 5',
        multipleOf: 5,
      })

      expect(result).toBe('Должно быть кратно 5')
    })
  })

  describe('custom ошибки', () => {
    it('передаёт message из .refine()', () => {
      const t = createMockTranslator({
        'validation.custom': '{message}',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'custom',
        path: ['password'],
        message: 'Пароли не совпадают',
      })

      expect(result).toBe('Пароли не совпадают')
    })
  })

  describe('fallback по типу input (когда origin не указан)', () => {
    it('определяет string по typeof input', () => {
      const t = createMockTranslator({
        'validation.too_small.string': 'Минимум {minimum} символов',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'too_small',
        path: ['name'],
        message: 'Too small',
        minimum: 2,
        input: 'a', // строка
        // origin не указан
      })

      expect(result).toBe('Минимум 2 символов')
    })

    it('определяет number по typeof input', () => {
      const t = createMockTranslator({
        'validation.too_small.number': 'Минимум {minimum}',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'too_small',
        path: ['age'],
        message: 'Too small',
        minimum: 0,
        input: -1, // число
      })

      expect(result).toBe('Минимум 0')
    })

    it('определяет array по Array.isArray', () => {
      const t = createMockTranslator({
        'validation.too_small.array': 'Минимум {minimum} элементов',
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'too_small',
        path: ['items'],
        message: 'Too small',
        minimum: 1,
        input: [], // массив
      })

      expect(result).toBe('Минимум 1 элементов')
    })
  })

  describe('обработка ошибок перевода', () => {
    it('возвращает undefined при исключении в функции перевода', () => {
      const t = vi.fn().mockImplementation(() => {
        throw new Error('Translation error')
      })

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'invalid_type',
        path: [],
        message: 'Invalid',
      })

      expect(result).toBeUndefined()
    })

    it('возвращает undefined если перевод === ключу (поведение next-intl)', () => {
      const t = createMockTranslator({}) // пустые переводы

      const errorMap = createFormErrorMap({ t })

      const result = errorMap({
        code: 'invalid_type',
        path: [],
        message: 'Invalid',
      })

      expect(result).toBeUndefined()
    })
  })
})

describe('интеграция с Zod v4', () => {
  it('работает как глобальный error map', () => {
    const t = createMockTranslator({
      'validation.too_small.string': 'Минимум {minimum} символов',
      'validation.invalid_format.email': 'Некорректный email',
    })

    // Устанавливаем error map
    const errorMap = createFormErrorMap({ t })
    z.config({ customError: errorMap as z.core.$ZodErrorMap<z.core.$ZodIssue> })

    // Тестируем валидацию
    const schema = z.object({
      name: z.string().min(3),
      email: z.email(),
    })

    const result = schema.safeParse({ name: 'ab', email: 'invalid' })
    expect(result.success).toBe(false)

    if (!result.success) {
      const issues = result.error.issues
      expect(issues).toHaveLength(2)

      // Проверяем сообщения — они должны быть переведены
      const nameIssue = issues.find((i) => i.path[0] === 'name')
      const emailIssue = issues.find((i) => i.path[0] === 'email')

      // Zod v4 использует наш error map
      expect(nameIssue?.message).toBe('Минимум 3 символов')
      expect(emailIssue?.message).toBe('Некорректный email')
    }

    // Сбрасываем глобальный error map
    z.config({ customError: undefined })
  })

  it('fallback к дефолтному сообщению Zod если перевод не найден', () => {
    const t = createMockTranslator({}) // пустые переводы

    const errorMap = createFormErrorMap({ t })
    z.config({ customError: errorMap as z.core.$ZodErrorMap<z.core.$ZodIssue> })

    const schema = z.string().min(5)
    const result = schema.safeParse('abc')

    expect(result.success).toBe(false)
    if (!result.success) {
      // Должно быть дефолтное сообщение Zod (не наш перевод)
      expect(result.error.issues[0].message).toContain('5')
    }

    z.config({ customError: undefined })
  })
})

describe('константы экспортируются корректно', () => {
  it('ZOD_ERROR_CODES содержит основные коды', () => {
    expect(ZOD_ERROR_CODES).toContain('invalid_type')
    expect(ZOD_ERROR_CODES).toContain('too_small')
    expect(ZOD_ERROR_CODES).toContain('too_big')
    expect(ZOD_ERROR_CODES).toContain('invalid_format')
    expect(ZOD_ERROR_CODES).toContain('invalid_value')
    expect(ZOD_ERROR_CODES).toContain('custom')
  })

  it('SIZE_ORIGINS содержит типы размеров', () => {
    expect(SIZE_ORIGINS).toContain('string')
    expect(SIZE_ORIGINS).toContain('number')
    expect(SIZE_ORIGINS).toContain('array')
    expect(SIZE_ORIGINS).toContain('date')
  })

  it('STRING_FORMATS содержит форматы строк', () => {
    expect(STRING_FORMATS).toContain('email')
    expect(STRING_FORMATS).toContain('url')
    expect(STRING_FORMATS).toContain('uuid')
    expect(STRING_FORMATS).toContain('datetime')
  })
})
