/**
 * Тесты для хелперов обработки ошибок.
 */

import { handleUniqueConstraintError } from '../error-helpers'

describe('handleUniqueConstraintError', () => {
  it('должен вернуть ошибку для ZenStack v3 ORM кода unique_violation (dbErrorCode 23505)', () => {
    const ormError = { reason: 'db-query-error', dbErrorCode: '23505', dbErrorMessage: 'duplicate key value' }

    const result = handleUniqueConstraintError(ormError, 'slug', 'Slug уже существует')

    expect(result).toEqual({
      success: false,
      error: 'Slug уже существует',
      field: 'slug',
    })
  })

  it('должен вернуть null для других кодов ORM ошибок', () => {
    const otherError = { reason: 'not-found', dbErrorCode: undefined }

    const result = handleUniqueConstraintError(otherError, 'slug', 'Slug уже существует')

    expect(result).toBeNull()
  })

  it('должен вернуть null для старого Prisma-кода P2002 (не ZenStack v3 формат)', () => {
    const prismaError = { code: 'P2002', meta: { target: ['slug'] } }

    const result = handleUniqueConstraintError(prismaError, 'slug', 'Slug уже существует')

    expect(result).toBeNull()
  })

  it('должен вернуть null для обычных ошибок', () => {
    const genericError = new Error('Что-то пошло не так')

    const result = handleUniqueConstraintError(genericError, 'slug', 'Slug уже существует')

    expect(result).toBeNull()
  })

  it('должен вернуть null для null', () => {
    const result = handleUniqueConstraintError(null, 'slug', 'Slug уже существует')

    expect(result).toBeNull()
  })

  it('должен вернуть null для undefined', () => {
    const result = handleUniqueConstraintError(undefined, 'slug', 'Slug уже существует')

    expect(result).toBeNull()
  })

  it('должен вернуть null для строки', () => {
    const result = handleUniqueConstraintError('error string', 'slug', 'Slug уже существует')

    expect(result).toBeNull()
  })

  it('должен вернуть null для числа', () => {
    const result = handleUniqueConstraintError(123, 'slug', 'Slug уже существует')

    expect(result).toBeNull()
  })

  it('должен работать с разными полями', () => {
    const ormError = { reason: 'db-query-error', dbErrorCode: '23505' }

    const emailResult = handleUniqueConstraintError(ormError, 'email', 'Email уже занят')
    expect(emailResult).toEqual({
      success: false,
      error: 'Email уже занят',
      field: 'email',
    })

    const skuResult = handleUniqueConstraintError(ormError, 'sku', 'SKU уже существует')
    expect(skuResult).toEqual({
      success: false,
      error: 'SKU уже существует',
      field: 'sku',
    })
  })
})
