import { describe, expect, it } from 'vitest'
import { validateForeignPassport } from '../foreign-passport'
import { zRu } from '../index'

describe('Загранпаспорт', () => {
  it('принимает валидный загранпаспорт', () => {
    expect(validateForeignPassport('750123456')).toBe(true)
  })

  it('принимает загранпаспорт с пробелом (серия + номер)', () => {
    const result = zRu.foreignPassport().safeParse('75 0123456')
    expect(result.success).toBe(true)
    if (result.success) { expect(result.data).toBe('750123456') }
  })

  it('отклоняет неправильную длину', () => {
    expect(validateForeignPassport('75012345')).toBe(false) // 8 цифр
    expect(validateForeignPassport('7501234567')).toBe(false) // 10 цифр
  })

  it('отклоняет пустую строку', () => {
    expect(zRu.foreignPassport().safeParse('').success).toBe(false)
  })
})
