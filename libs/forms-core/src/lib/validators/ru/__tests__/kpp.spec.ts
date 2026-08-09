import { describe, expect, it } from 'vitest'
import { kppSchema, validateKpp } from '../kpp'

describe('validateKpp', () => {
  it('должен принять стандартный КПП из цифр', () => {
    expect(validateKpp('770701001')).toBe(true)
  })

  it('должен принять КПП с буквами в позициях PP', () => {
    expect(validateKpp('7707AZ001')).toBe(true)
  })

  it('должен отклонить строку короче 9 символов', () => {
    expect(validateKpp('77070100')).toBe(false)
  })

  it('должен отклонить строку длиннее 9 символов', () => {
    expect(validateKpp('7707010011')).toBe(false)
  })

  it('должен отклонить пустую строку', () => {
    expect(validateKpp('')).toBe(false)
  })

  it('должен отклонить строчные буквы (только A-Z)', () => {
    expect(validateKpp('7707az001')).toBe(false)
  })

  it('должен отклонить спецсимволы', () => {
    expect(validateKpp('7707@#001')).toBe(false)
  })

  it('должен отклонить буквы в первых 4 позициях', () => {
    expect(validateKpp('ABCD01001')).toBe(false)
  })

  it('должен отклонить буквы в последних 3 позициях', () => {
    expect(validateKpp('770701ABC')).toBe(false)
  })
})

describe('kppSchema', () => {
  const schema = kppSchema()

  it('должен принять валидный КПП', () => {
    const result = schema.safeParse('770701001')
    expect(result.success).toBe(true)
    if (result.success) { expect(result.data).toBe('770701001') }
  })

  it('должен привести к верхнему регистру', () => {
    const result = schema.safeParse('7707az001')
    // После toUpperCase() → '7707AZ001' — валидный формат
    expect(result.success).toBe(true)
    if (result.success) { expect(result.data).toBe('7707AZ001') }
  })

  it('должен убрать пробелы и дефисы', () => {
    const result = schema.safeParse('770 701-001')
    expect(result.success).toBe(true)
    if (result.success) { expect(result.data).toBe('770701001') }
  })

  it('должен отклонить строку неверной длины', () => {
    const result = schema.safeParse('7707')
    expect(result.success).toBe(false)
  })

  it('должен отклонить неверный формат', () => {
    const result = schema.safeParse('ABCD01001')
    expect(result.success).toBe(false)
  })
})
