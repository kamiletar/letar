import { describe, expect, it } from 'vitest'
import { zRu } from '../index'
import { validateSnils } from '../snils'

describe('СНИЛС', () => {
  it('принимает валидный СНИЛС', () => {
    // Контрольная сумма: 1×9 + 1×8 + 2×7 + 0×6 + 1×5 + 7×4 + 4×3 + 5×2 + 4×1
    // = 9 + 8 + 14 + 0 + 5 + 28 + 12 + 10 + 4 = 90 → 90 < 100 → check = 90
    expect(validateSnils('11201745490')).toBe(true)
  })

  it('принимает СНИЛС с маской', () => {
    const result = zRu.snils().safeParse('112-017-454 90')
    expect(result.success).toBe(true)
    if (result.success) { expect(result.data).toBe('11201745490') }
  })

  it('принимает специальный номер <= 001-001-998', () => {
    // Номера до 001001998 не проверяются по контрольной сумме
    expect(validateSnils('00100100000')).toBe(true)
  })

  it('отклоняет СНИЛС неправильной длины', () => {
    expect(zRu.snils().safeParse('1120174549').success).toBe(false) // 10 цифр
  })

  it('отклоняет СНИЛС с неверной контрольной суммой', () => {
    expect(validateSnils('11201745491')).toBe(false)
  })
})
