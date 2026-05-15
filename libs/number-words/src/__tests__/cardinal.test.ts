import { describe, expect, it } from 'vitest'

import { numberToWords } from '../index'

describe('numberToWords — кардинальные числительные', () => {
  describe('to-words локали (35 языков)', () => {
    const cases: Array<[string, number, RegExp]> = [
      // Европейские
      ['ru', 493, /четыреста девяносто три/],
      ['en', 493, /four hundred ninety three/],
      ['de', 493, /vier hundert dreiundneunzig/],
      ['fr', 493, /quatre cent quatre-vingt-treize/],
      ['es', 493, /cuatrocientos noventa y tres/],
      ['pt', 493, /quatrocentos/],
      ['it', 493, /quattro cento novantatré/],
      ['nl', 493, /vier honderd drieënnegentig/],
      ['sv', 493, /fyra hundra nittiotre/],
      ['pl', 493, /czterysta dziewięćdziesiąt trzy/],
      ['ro', 493, /patru sute/],
      ['el', 493, /τετρακόσια/],

      // Славянские / СНГ
      ['uk', 493, /чотириста/],
      ['be', 493, /чатырыста/],

      // Тюркские (из to-words)
      ['tr', 493, /dört yüz doksan üç/],
      ['az', 493, /dörd yüz doxsan üç/],
      ['uz', 493, /to'rt yuz/],

      // Азиатские
      ['ja', 493, /四百九十三/],
      ['zh', 493, /四百九十三/],
      ['ko', 493, /사백구십삼/],
      ['th', 493, /สี่ร้อยเก้าสิบสาม/],
      ['vi', 493, /bốn trăm chín mươi ba/],

      // Индийские
      ['hi', 493, /चार सौ/],
      ['bn', 493, /চার শত/],
      ['mr', 493, /चारशे/],
      ['ta', 493, /நான்கு நூறு/],
      ['te', 493, /నాలుగు వంద/],
      ['ur', 493, /چار سو/],

      // Семитские / RTL
      ['ar', 493, /أربعمائة/],
      ['he', 493, /ארבע מאה/],
      ['fa', 493, /چهارصد/],

      // Другие
      ['id', 493, /empat ratus sembilan puluh tiga/],
      ['ms', 493, /empat ratus sembilan puluh tiga/],
      ['sw', 493, /nne mia/],
    ]

    for (const [locale, n, expected] of cases) {
      it(`${locale}: ${n}`, () => {
        const result = numberToWords(n, locale)
        expect(result).toMatch(expected)
      })
    }
  })

  describe('кастомные локали', () => {
    it('kk: 493', () => {
      const result = numberToWords(493, 'kk')
      expect(result).toContain('төрт жүз')
    })

    it('ky: 493', () => {
      const result = numberToWords(493, 'ky')
      expect(result).toContain('төрт жүз')
    })

    it('tg: 493', () => {
      const result = numberToWords(493, 'tg')
      expect(result).toContain('чорсад')
    })

    it('tk: 493', () => {
      const result = numberToWords(493, 'tk')
      expect(result).toContain('dört ýüz')
    })

    it('hy: 493 (fallback)', () => {
      const result = numberToWords(493, 'hy')
      expect(result).toBe('493')
    })
  })

  describe('edge cases', () => {
    it('0', () => {
      expect(numberToWords(0, 'en')).toMatch(/zero/)
      expect(numberToWords(0, 'ru')).toMatch(/ноль/)
    })

    it('1', () => {
      expect(numberToWords(1, 'en')).toMatch(/one/)
      expect(numberToWords(1, 'ru')).toMatch(/один/)
    })

    it('большие числа: 493217', () => {
      const result = numberToWords(493_217, 'en')
      expect(result).toContain('thousand')
    })

    it('ошибка для неизвестной локали', () => {
      expect(() => numberToWords(1, 'xx')).toThrow(/неподдерживаемая/i)
    })
  })
})
