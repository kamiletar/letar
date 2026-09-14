import { describe, expect, it, vi } from 'vitest'
import { applyServerErrors, mapServerErrors } from './map-server-errors'

describe('mapServerErrors', () => {
  // --- Prisma P2002 (unique constraint) ---

  describe('Prisma P2002 (unique constraint)', () => {
    it('маппит одиночное поле из meta.target', () => {
      const error = { code: 'P2002', message: 'Unique constraint failed', meta: { target: ['email'] } }
      const result = mapServerErrors(error)

      expect(result.fieldErrors).toEqual([{ field: 'email', message: 'email уже существует' }])
      expect(result.formErrors).toEqual([])
    })

    it('маппит составной constraint (organizationId + name)', () => {
      const error = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['organizationId', 'name'] },
      }
      const result = mapServerErrors(error)

      expect(result.fieldErrors).toEqual([
        { field: 'organizationId', message: 'Комбинация organizationId + name уже существует' },
      ])
    })

    it('использует кастомный fieldMap для constraint', () => {
      const error = { code: 'P2002', message: 'Unique', meta: { target: ['email'] } }
      const result = mapServerErrors(error, {
        fieldMap: {
          email: { field: 'email', message: 'Этот email уже зарегистрирован' },
        },
      })

      expect(result.fieldErrors).toEqual([{ field: 'email', message: 'Этот email уже зарегистрирован' }])
    })

    it('использует кастомный fieldMap для составного constraint', () => {
      const error = {
        code: 'P2002',
        message: 'Unique',
        meta: { target: ['organizationId', 'name'] },
      }
      const result = mapServerErrors(error, {
        fieldMap: {
          organizationId_name: { field: 'name', message: 'Такое название уже занято' },
        },
      })

      expect(result.fieldErrors).toEqual([{ field: 'name', message: 'Такое название уже занято' }])
    })

    it('P2002 без meta.target → глобальная ошибка', () => {
      const error = { code: 'P2002', message: 'Unique constraint failed' }
      const result = mapServerErrors(error)

      expect(result.fieldErrors).toEqual([])
      expect(result.formErrors.length).toBe(1)
    })

    it('locale: en', () => {
      const error = { code: 'P2002', message: '', meta: { target: ['email'] } }
      const result = mapServerErrors(error, { locale: 'en' })

      expect(result.fieldErrors).toEqual([{ field: 'email', message: 'email already exists' }])
    })
  })

  // --- Prisma P2003 (foreign key) ---

  describe('Prisma P2003 (foreign key)', () => {
    it('маппит field_name', () => {
      const error = { code: 'P2003', message: 'FK failed', meta: { field_name: 'categoryId' } }
      const result = mapServerErrors(error)

      expect(result.fieldErrors).toEqual([{ field: 'categoryId', message: 'Связанная запись "categoryId" не найдена' }])
    })
  })

  // --- Prisma P2025 (not found) ---

  describe('Prisma P2025 (not found)', () => {
    it('возвращает глобальную ошибку', () => {
      const error = { code: 'P2025', message: 'Record not found' }
      const result = mapServerErrors(error)

      expect(result.fieldErrors).toEqual([])
      expect(result.formErrors).toEqual(['Запись не найдена'])
    })
  })

  // --- ZenStack ---

  describe('ZenStack ошибки', () => {
    it('rejected-by-policy → глобальная "Нет доступа"', () => {
      const error = { reason: 'rejected-by-policy' }
      const result = mapServerErrors(error)

      expect(result.formErrors).toEqual(['Нет доступа для выполнения этой операции'])
    })

    it('cannot-read-back → специальное сообщение', () => {
      const error = { reason: 'rejected-by-policy', rejectedByPolicyReason: 'cannot-read-back' }
      const result = mapServerErrors(error)

      expect(result.formErrors[0]).toContain('результат недоступен')
    })

    it('db-query-error с Prisma кодом → маппит как Prisma', () => {
      const error = {
        reason: 'db-query-error',
        code: 'P2002',
        meta: { target: ['email'] },
      }
      const result = mapServerErrors(error)

      expect(result.fieldErrors).toEqual([{ field: 'email', message: 'email уже существует' }])
    })

    it('not-found → глобальная', () => {
      const error = { reason: 'not-found' }
      const result = mapServerErrors(error)

      expect(result.formErrors).toEqual(['Запись не найдена'])
    })
  })

  // --- Zod flatten ---

  describe('Zod flatten формат', () => {
    it('маппит fieldErrors на поля', () => {
      const error = {
        formErrors: [],
        fieldErrors: {
          email: ['Некорректный email'],
          password: ['Минимум 8 символов', 'Нужна заглавная буква'],
        },
      }
      const result = mapServerErrors(error)

      expect(result.fieldErrors).toEqual([
        { field: 'email', message: 'Некорректный email' },
        { field: 'password', message: 'Минимум 8 символов' },
        { field: 'password', message: 'Нужна заглавная буква' },
      ])
    })

    it('маппит formErrors как глобальные', () => {
      const error = {
        formErrors: ['Пароли не совпадают'],
        fieldErrors: {},
      }
      const result = mapServerErrors(error)

      expect(result.formErrors).toEqual(['Пароли не совпадают'])
    })
  })

  // --- ActionResult ---

  describe('ActionResult формат', () => {
    it('{ success: false, error: string } → глобальная', () => {
      const error = { success: false, error: 'Пользователь с таким email уже существует' }
      const result = mapServerErrors(error)

      expect(result.formErrors).toEqual(['Пользователь с таким email уже существует'])
    })

    it('{ success: false, error: { fieldErrors } } → по полям', () => {
      const error = {
        success: false,
        error: {
          formErrors: [],
          fieldErrors: { email: ['Email already taken'] },
        },
      }
      const result = mapServerErrors(error)

      expect(result.fieldErrors).toEqual([{ field: 'email', message: 'Email already taken' }])
    })
  })

  // --- Error объекты ---

  describe('Error объекты', () => {
    it('обычный Error → глобальная из message', () => {
      const error = new Error('Something went wrong')
      const result = mapServerErrors(error)

      expect(result.formErrors).toEqual(['Something went wrong'])
    })

    it('Error с .info (ZenStack стиль)', () => {
      const error = Object.assign(new Error('Policy'), {
        info: { reason: 'rejected-by-policy' },
      })
      const result = mapServerErrors(error)

      expect(result.formErrors[0]).toContain('Нет доступа')
    })
  })

  // --- Edge cases ---

  describe('Edge cases', () => {
    it('null → fallback', () => {
      const result = mapServerErrors(null)
      expect(result.formErrors).toEqual(['Произошла ошибка'])
    })

    it('undefined → fallback', () => {
      const result = mapServerErrors(undefined)
      expect(result.formErrors).toEqual(['Произошла ошибка'])
    })

    it('строка → глобальная', () => {
      const result = mapServerErrors('Network error')
      expect(result.formErrors).toEqual(['Network error'])
    })

    it('кастомный defaultMessage', () => {
      const result = mapServerErrors(null, { defaultMessage: 'Попробуйте позже' })
      expect(result.formErrors).toEqual(['Попробуйте позже'])
    })

    it('locale: en для fallback', () => {
      const result = mapServerErrors(null, { locale: 'en' })
      expect(result.formErrors).toEqual(['An error occurred'])
    })

    it('принудительный формат: prisma', () => {
      const error = { code: 'P2002', message: '', meta: { target: ['email'] } }
      const result = mapServerErrors(error, { format: 'prisma' })

      expect(result.fieldErrors).toEqual([{ field: 'email', message: 'email уже существует' }])
    })
  })
})

describe('applyServerErrors', () => {
  /**
   * Мини-модель TanStack Form: `setFieldMeta` реально прогоняет `updater` через сохранённое
   * состояние поля (как это делает настоящий стор), а не просто фиксирует факт вызова — иначе
   * тест не отличил бы правильный `errorMap.onServer` от регресса обратно на плоский `errors`
   * (см. JSDoc `applyServerErrors` — именно это отличие однажды не работало в браузере, хотя
   * мок с `vi.fn()` был зелёным).
   */
  function createFakeForm() {
    const fieldMeta: Record<string, { errorMap?: Record<string, unknown> }> = {}
    const setFieldMeta = vi.fn(
      (
        field: string,
        updater: (prev: { errorMap?: Record<string, unknown> }) => { errorMap: Record<string, unknown> },
      ) => {
        fieldMeta[field] = updater(fieldMeta[field] ?? {})
      },
    )
    const setErrorMap = vi.fn()
    return { fieldMeta, setFieldMeta, setErrorMap }
  }

  it('кладёт field-level ошибку в errorMap.onServer, не в плоский errors', () => {
    const form = createFakeForm()

    applyServerErrors(form, { fieldErrors: [{ field: 'email', message: 'Занято' }], formErrors: [] })

    expect(form.fieldMeta.email?.errorMap).toEqual({ onServer: 'Занято' })
    expect(form.fieldMeta.email).not.toHaveProperty('errors')
  })

  it('сохраняет уже стоящие ключи errorMap соседних валидаторов при установке onServer', () => {
    const form = createFakeForm()
    form.fieldMeta.email = { errorMap: { onChange: 'Некорректный формат' } }

    applyServerErrors(form, { fieldErrors: [{ field: 'email', message: 'Занято' }], formErrors: [] })

    expect(form.fieldMeta.email?.errorMap).toEqual({ onChange: 'Некорректный формат', onServer: 'Занято' })
  })

  it('маппит несколько field-level ошибок на разные поля', () => {
    const form = createFakeForm()

    applyServerErrors(form, {
      fieldErrors: [
        { field: 'email', message: 'Занято' },
        { field: 'sku', message: 'Такой артикул уже используется' },
      ],
      formErrors: [],
    })

    expect(form.fieldMeta.email?.errorMap).toEqual({ onServer: 'Занято' })
    expect(form.fieldMeta.sku?.errorMap).toEqual({ onServer: 'Такой артикул уже используется' })
  })

  it('устанавливает form-level ошибки через setErrorMap, объединяя через ". "', () => {
    const form = createFakeForm()

    applyServerErrors(form, { fieldErrors: [], formErrors: ['Нет доступа', 'Попробуйте позже'] })

    expect(form.setErrorMap).toHaveBeenCalledWith({ onSubmit: 'Нет доступа. Попробуйте позже' })
  })

  it('не вызывает setErrorMap, если formErrors пуст', () => {
    const form = createFakeForm()

    applyServerErrors(form, { fieldErrors: [{ field: 'email', message: 'Занято' }], formErrors: [] })

    expect(form.setErrorMap).not.toHaveBeenCalled()
  })
})
