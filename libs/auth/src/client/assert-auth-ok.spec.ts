import { describe, expect, it } from 'vitest'
import { assertAuthOk } from './assert-auth-ok'

describe('assertAuthOk', () => {
  it('не бросает, если error отсутствует', () => {
    expect(() => assertAuthOk({ error: null })).not.toThrow()
    expect(() => assertAuthOk({})).not.toThrow()
  })

  it('бросает Error с message из result.error.message', () => {
    expect(() => assertAuthOk({ error: { message: 'Такой email уже занят' } })).toThrow('Такой email уже занят')
  })

  it('бросает Error с defaultMessage, если result.error.message отсутствует', () => {
    expect(() => assertAuthOk({ error: { code: 'UNKNOWN' } }, 'Ошибка входа')).toThrow('Ошибка входа')
  })

  it('бросает Error с общим дефолтом, если ни message, ни defaultMessage не заданы', () => {
    expect(() => assertAuthOk({ error: {} })).toThrow('Произошла ошибка')
  })

  it('сужает тип result после успешного вызова (компиляционная проверка)', () => {
    const result: { error?: { message?: string | null } | null; data?: { id: string } } = {
      data: { id: '1' },
      error: null,
    }
    assertAuthOk(result)
    // После assertAuthOk TS считает result.error равным null — доступ к result.data безопасен
    expect(result.data.id).toBe('1')
  })
})
