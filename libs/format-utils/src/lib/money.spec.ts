// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { formatKopecks, formatRubles } from './money'

// formatRubles/formatKopecks разделяют тысячи тонким неразрывным пробелом (U+202F)
const NBSP = ' '

describe('formatRubles', () => {
  it('форматирует целое число с разделителем тысяч и знаком ₽', () => {
    expect(formatRubles(150000)).toBe(`150${NBSP}000 ₽`)
  })

  it('форматирует ноль', () => {
    expect(formatRubles(0)).toBe('0 ₽')
  })

  it('форматирует дробную сумму', () => {
    expect(formatRubles(1500.5)).toBe(`1${NBSP}500,5 ₽`)
  })

  it('возвращает пустую строку для null без fallback', () => {
    expect(formatRubles(null)).toBe('')
  })

  it('возвращает пустую строку для undefined без fallback', () => {
    expect(formatRubles(undefined)).toBe('')
  })

  it('использует fallback для null', () => {
    expect(formatRubles(null, { fallback: 'по запросу' })).toBe('по запросу')
  })

  it('использует fallback для undefined', () => {
    expect(formatRubles(undefined, { fallback: 'Бесплатно' })).toBe('Бесплатно')
  })

  it('добавляет prefix и suffix', () => {
    expect(formatRubles(1500, { prefix: 'от ', suffix: ' / занятие' })).toBe(`от 1${NBSP}500 ₽ / занятие`)
  })

  it('не применяет prefix/suffix к fallback', () => {
    expect(formatRubles(null, { fallback: 'по запросу', prefix: 'от ', suffix: ' / занятие' })).toBe('по запросу')
  })
})

describe('formatKopecks', () => {
  it('делит копейки на 100 и форматирует как рубли', () => {
    expect(formatKopecks(15000000)).toBe(`150${NBSP}000 ₽`)
  })

  it('форматирует копейки с остатком как дробную часть рублей', () => {
    expect(formatKopecks(150050)).toBe(`1${NBSP}500,5 ₽`)
  })

  it('возвращает пустую строку для null без fallback', () => {
    expect(formatKopecks(null)).toBe('')
  })

  it('использует fallback для null', () => {
    expect(formatKopecks(null, { fallback: 'по запросу' })).toBe('по запросу')
  })

  it('использует fallback для undefined', () => {
    expect(formatKopecks(undefined, { fallback: 'по запросу' })).toBe('по запросу')
  })

  it('добавляет prefix и suffix', () => {
    expect(formatKopecks(100000, { prefix: 'от ' })).toBe(`от 1${NBSP}000 ₽`)
  })
})
