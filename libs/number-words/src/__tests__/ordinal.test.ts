import { describe, expect, it } from 'vitest'

import { numberToOrdinal } from '../index'

describe('numberToOrdinal — порядковые числительные', () => {
  describe('to-words локали', () => {
    const cases: Array<[string, number, RegExp]> = [
      ['ru', 493, /третий/],
      ['en', 493, /third/],
      ['de', 493, /dreiundneunzigste/],
      ['ko', 493, /번째/],
      ['ja', 493, /番目/],
      ['tr', 493, /üçüncü/i],
      ['uz', 493, /nchi/],
      ['az', 493, /üçüncü/],
      ['fa', 493, /سوم/],
      ['bn', 493, /তম/],
      ['ta', 493, /மூன்றாவது/],
      ['te', 493, /వ/],
      ['id', 493, /ke/],
    ]

    for (const [locale, n, expected] of cases) {
      it(`${locale}: ${n}`, () => {
        const result = numberToOrdinal(n, locale)
        expect(result).toMatch(expected)
      })
    }
  })

  describe('кастомные порядковые', () => {
    it('kk: порядковые с суффиксом', () => {
      const result = numberToOrdinal(3, 'kk')
      expect(result).toContain('үш')
    })

    it('ky: порядковые с суффиксом', () => {
      const result = numberToOrdinal(3, 'ky')
      expect(result).toContain('үч')
    })

    it('tg: порядковые с суффиксом -ум', () => {
      const result = numberToOrdinal(3, 'tg')
      expect(result).toBe('сеюм')
    })

    it('tk: порядковые с суффиксом', () => {
      const result = numberToOrdinal(3, 'tk')
      expect(result).toContain('üç')
    })
  })

  describe('edge cases', () => {
    it('1 (первый)', () => {
      expect(numberToOrdinal(1, 'ru')).toMatch(/первый/)
      expect(numberToOrdinal(1, 'en')).toMatch(/first/)
    })

    it('2 (второй)', () => {
      expect(numberToOrdinal(2, 'ru')).toMatch(/второй/)
    })

    it('большие числа', () => {
      const result = numberToOrdinal(493_217, 'en')
      expect(result).toContain('seventeenth')
    })
  })
})
