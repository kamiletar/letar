import { describe, expect, it } from 'vitest'
import { parseMask } from './parse-mask'

describe('parseMask', () => {
  it('разбирает встроенные токены и литералы', () => {
    expect(parseMask('99-9')).toEqual([
      { kind: 'input', token: '9', optional: false },
      { kind: 'input', token: '9', optional: false },
      { kind: 'literal', char: '-' },
      { kind: 'input', token: '9', optional: false },
    ])
  })

  it('экранирует символ токена через \\', () => {
    expect(parseMask('\\9')).toEqual([{ kind: 'literal', char: '9' }])
  })

  it('помечает символы внутри [...] как необязательные', () => {
    expect(parseMask('99[9]')).toEqual([
      { kind: 'input', token: '9', optional: false },
      { kind: 'input', token: '9', optional: false },
      { kind: 'input', token: '9', optional: true },
    ])
  })

  it('литерал внутри [...] тоже помечается опциональной группой (не имеет собственного optional-поля, но не ломает разбор)', () => {
    expect(parseMask('9[-9]')).toEqual([
      { kind: 'input', token: '9', optional: false },
      { kind: 'literal', char: '-' },
      { kind: 'input', token: '9', optional: true },
    ])
  })

  it('свой токен из customTokens распознаётся как input, не как литерал', () => {
    const slots = parseMask('л9', { customTokens: { л: { pattern: () => true } } })
    expect(slots).toEqual([
      { kind: 'input', token: 'л', optional: false },
      { kind: 'input', token: '9', optional: false },
    ])
  })

  it('встроенный токен нельзя переопределить пользовательским', () => {
    // '9' остаётся цифрой, даже если customTokens пытается задать для него другой pattern
    const slots = parseMask('9', { customTokens: { '9': { pattern: () => false } } })
    expect(slots).toEqual([{ kind: 'input', token: '9', optional: false }])
  })
})
