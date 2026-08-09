'use client'

import { describe, expect, it, vi } from 'vitest'
import { formatFieldErrors, getFieldErrors, hasFieldErrors } from './field-utils'

describe('formatFieldErrors', () => {
  it('должен форматировать строковые ошибки', () => {
    const errors = ['Обязательное поле', 'Минимум 3 символа']
    expect(formatFieldErrors(errors)).toBe('Обязательное поле, Минимум 3 символа')
  })

  it('должен форматировать ошибки с message (StandardSchemaV1Issue)', () => {
    const errors = [{ message: 'Укажите название' }, { message: 'Укажите город' }]
    expect(formatFieldErrors(errors)).toBe('Укажите название, Укажите город')
  })

  it('должен форматировать ошибки с issues массивом (ZodError)', () => {
    const errors = [
      {
        issues: [
          { message: 'Поле обязательно', path: ['name'] },
          { message: 'Минимум 2 символа', path: ['name'] },
        ],
      },
    ]
    expect(formatFieldErrors(errors)).toBe('Поле обязательно, Минимум 2 символа')
  })

  it('должен форматировать массив ZodIssue напрямую (из superRefine)', () => {
    // Это формат ошибок, который может приходить из superRefine
    // Ошибка — это сам массив [{code, message, path}]
    const errors = [
      [
        { code: 'custom', message: 'Название должно содержать минимум 3 символа', path: ['schoolName'] },
        { code: 'custom', message: 'Укажите город', path: ['schoolCity'] },
      ],
    ]
    expect(formatFieldErrors(errors as unknown[])).toBe('Название должно содержать минимум 3 символа, Укажите город')
  })

  it('должен форматировать одиночный ZodIssue в массиве', () => {
    // Один элемент ошибки — массив с одним issue
    const errors = [[{ code: 'custom', message: 'Укажите город', path: ['city'] }]]
    expect(formatFieldErrors(errors as unknown[])).toBe('Укажите город')
  })

  it('должен форматировать ошибки с _errors массивом (Zod format)', () => {
    const errors = [{ _errors: ['Ошибка 1', 'Ошибка 2'] }]
    expect(formatFieldErrors(errors)).toBe('Ошибка 1, Ошибка 2')
  })

  it('должен форматировать ошибки с fieldErrors (Zod flat errors)', () => {
    const errors = [
      {
        fieldErrors: {
          name: ['Обязательное поле'],
          city: ['Укажите город'],
        },
      },
    ]
    expect(formatFieldErrors(errors)).toBe('Обязательное поле, Укажите город')
  })

  it('должен игнорировать null и undefined', () => {
    const errors = [null, undefined, 'Ошибка']
    expect(formatFieldErrors(errors as unknown[])).toBe('Ошибка')
  })

  it('должен игнорировать пустые объекты', () => {
    const errors = [{}, 'Ошибка']
    expect(formatFieldErrors(errors as unknown[])).toBe('Ошибка')
  })

  it('НЕ должен возвращать [object Object]', () => {
    // Это был баг: объект без message возвращался как [object Object]
    const errors = [{ someUnknownProperty: 'value' }, { message: 'Нормальная ошибка' }]
    const result = formatFieldErrors(errors as unknown[])

    // Результат не должен содержать [object Object]
    expect(result).not.toContain('[object Object]')
    // Должен содержать нормальную ошибку
    expect(result).toContain('Нормальная ошибка')
  })

  it('должен обрабатывать смешанные форматы ошибок', () => {
    const errors = [
      'Строковая ошибка',
      { message: 'Ошибка с message' },
      { issues: [{ message: 'Ошибка из issues' }] },
      null,
    ]
    expect(formatFieldErrors(errors as unknown[])).toBe('Строковая ошибка, Ошибка с message, Ошибка из issues')
  })

  it('должен логировать неизвестные форматы в dev режиме', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const originalEnv = process.env.NODE_ENV

    // Симулируем dev режим
    process.env.NODE_ENV = 'development'

    const errors = [{ unknownFormat: true }]
    formatFieldErrors(errors as unknown[])

    expect(consoleSpy).toHaveBeenCalledWith('[form-components] Unknown error format:', { unknownFormat: true })

    consoleSpy.mockRestore()
    process.env.NODE_ENV = originalEnv
  })

  it('должен возвращать пустую строку для пустого массива', () => {
    expect(formatFieldErrors([])).toBe('')
  })
})

describe('hasFieldErrors', () => {
  it('должен возвращать true при наличии ошибок', () => {
    expect(hasFieldErrors(['Ошибка'])).toBe(true)
  })

  it('должен возвращать false для пустого массива', () => {
    expect(hasFieldErrors([])).toBe(false)
  })

  it('должен возвращать false для undefined', () => {
    expect(hasFieldErrors(undefined)).toBe(false)
  })
})

describe('getFieldErrors', () => {
  it('должен извлекать ошибки из field API', () => {
    const field = {
      state: {
        meta: {
          errors: ['Ошибка валидации'],
        },
      },
    }

    const result = getFieldErrors(field)

    expect(result.hasError).toBe(true)
    expect(result.errorMessage).toBe('Ошибка валидации')
    expect(result.errors).toEqual(['Ошибка валидации'])
  })

  it('должен возвращать пустые значения если ошибок нет', () => {
    const field = {
      state: {
        meta: {
          errors: [],
        },
      },
    }

    const result = getFieldErrors(field)

    expect(result.hasError).toBe(false)
    expect(result.errorMessage).toBe('')
    expect(result.errors).toEqual([])
  })

  it('должен обрабатывать undefined errors', () => {
    const field = {
      state: {
        meta: {},
      },
    }

    const result = getFieldErrors(field)

    expect(result.hasError).toBe(false)
    expect(result.errorMessage).toBe('')
    expect(result.errors).toEqual([])
  })
})
