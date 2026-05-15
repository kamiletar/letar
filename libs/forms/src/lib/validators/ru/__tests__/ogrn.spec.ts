import { describe, expect, it } from 'vitest'
import { zRu } from '../index'
import { validateOgrn, validateOgrnip } from '../ogrn'

describe('ОГРН (13 цифр)', () => {
  it('принимает валидный ОГРН Сбербанка', () => {
    expect(validateOgrn('1027700132195')).toBe(true)
  })

  it('отклоняет ОГРН с неверной контрольной суммой', () => {
    expect(validateOgrn('1027700132190')).toBe(false)
  })

  it('отклоняет ОГРН неправильной длины', () => {
    expect(validateOgrn('10277001321')).toBe(false)
  })
})

describe('ОГРНИП (15 цифр)', () => {
  it('принимает валидный ОГРНИП', () => {
    expect(validateOgrnip('304500116000157')).toBe(true)
  })

  it('отклоняет ОГРНИП с неверной контрольной суммой', () => {
    expect(validateOgrnip('304500116000150')).toBe(false)
  })
})

describe('zRu.ogrn() — Zod-схема', () => {
  it('принимает валидный ОГРН', () => {
    expect(zRu.ogrn().safeParse('1027700132195').success).toBe(true)
  })

  it('убирает пробелы', () => {
    const result = zRu.ogrn().safeParse('1 027 700 132 195')
    expect(result.success).toBe(true)
  })

  it('отклоняет невалидный ОГРН', () => {
    expect(zRu.ogrn().safeParse('1234567890123').success).toBe(false)
  })
})

describe('zRu.ogrnip() — Zod-схема', () => {
  it('принимает валидный ОГРНИП', () => {
    expect(zRu.ogrnip().safeParse('304500116000157').success).toBe(true)
  })

  it('отклоняет невалидный ОГРНИП', () => {
    expect(zRu.ogrnip().safeParse('123456789012345').success).toBe(false)
  })
})
