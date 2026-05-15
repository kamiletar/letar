import { describe, expect, it } from 'vitest'
import { zRu } from '../index'
import { validateKpp } from '../kpp'

describe('Паспорт', () => {
  it('принимает валидный паспорт', () => {
    expect(zRu.passport().safeParse('4506123456').success).toBe(true)
  })

  it('принимает паспорт с пробелами', () => {
    const result = zRu.passport().safeParse('45 06 123456')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('4506123456')
  })

  it('отклоняет паспорт неправильной длины', () => {
    expect(zRu.passport().safeParse('450612345').success).toBe(false) // 9 цифр
    expect(zRu.passport().safeParse('45061234567').success).toBe(false) // 11 цифр
  })
})

describe('КПП', () => {
  it('принимает валидный КПП', () => {
    expect(validateKpp('770701001')).toBe(true)
  })

  it('принимает КПП с буквами', () => {
    expect(validateKpp('7707AZ001')).toBe(true)
  })

  it('отклоняет КПП с маленькими буквами (после toUpperCase)', () => {
    const result = zRu.kpp().safeParse('7707az001')
    expect(result.success).toBe(true) // transform → toUpperCase
  })

  it('отклоняет КПП неправильной длины', () => {
    expect(zRu.kpp().safeParse('77070100').success).toBe(false)
  })

  it('отклоняет КПП с недопустимыми символами', () => {
    expect(validateKpp('7707!@001')).toBe(false)
  })
})
