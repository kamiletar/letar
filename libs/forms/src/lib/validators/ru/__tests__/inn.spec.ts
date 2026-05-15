import { describe, expect, it } from 'vitest'
import { zRu } from '../index'
import { validateInn10, validateInn12 } from '../inn'

describe('ИНН юрлица (10 цифр)', () => {
  it('принимает валидный ИНН Сбербанка', () => {
    expect(validateInn10('7707083893')).toBe(true)
  })

  it('принимает валидный ИНН Яндекса', () => {
    expect(validateInn10('1027700229193'.slice(0, 10))).toBe(false) // Это ОГРН
    expect(validateInn10('7736207543')).toBe(true)
  })

  it('отклоняет ИНН с неверной контрольной суммой', () => {
    expect(validateInn10('7707083890')).toBe(false)
  })

  it('отклоняет ИНН неправильной длины', () => {
    expect(validateInn10('770708389')).toBe(false) // 9 цифр
    expect(validateInn10('77070838930')).toBe(false) // 11 цифр
  })
})

describe('ИНН физлица (12 цифр)', () => {
  it('принимает валидный ИНН', () => {
    expect(validateInn12('500100732259')).toBe(true)
  })

  it('отклоняет ИНН с неверной контрольной суммой', () => {
    expect(validateInn12('500100732250')).toBe(false)
  })

  it('отклоняет ИНН неправильной длины', () => {
    expect(validateInn12('5001007322')).toBe(false)
  })
})

describe('zRu.inn() — Zod-схема', () => {
  it('принимает 10-значный ИНН', () => {
    const result = zRu.inn().safeParse('7707083893')
    expect(result.success).toBe(true)
  })

  it('принимает 12-значный ИНН', () => {
    const result = zRu.inn().safeParse('500100732259')
    expect(result.success).toBe(true)
  })

  it('убирает пробелы и дефисы (transform)', () => {
    const result = zRu.inn().safeParse('7707 083 893')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('7707083893')
  })

  it('отклоняет невалидный ИНН', () => {
    const result = zRu.inn().safeParse('1234567890')
    expect(result.success).toBe(false)
  })
})

describe('zRu.inn.legal()', () => {
  it('принимает только 10 цифр', () => {
    expect(zRu.inn.legal().safeParse('7707083893').success).toBe(true)
    expect(zRu.inn.legal().safeParse('500100732259').success).toBe(false)
  })
})

describe('zRu.inn.individual()', () => {
  it('принимает только 12 цифр', () => {
    expect(zRu.inn.individual().safeParse('500100732259').success).toBe(true)
    expect(zRu.inn.individual().safeParse('7707083893').success).toBe(false)
  })
})
