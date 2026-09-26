// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { formatKopecks, formatRubles, toKopecks } from './money'

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

  it('показывает копейки двумя знаками, если они ненулевые', () => {
    expect(formatKopecks(150050)).toBe(`1${NBSP}500,50 ₽`)
    expect(formatKopecks(99950)).toBe(`999,50 ₽`)
    expect(formatKopecks(1)).toBe('0,01 ₽')
  })

  it('не показывает копейки, если их нет', () => {
    expect(formatKopecks(490000)).toBe(`4${NBSP}900 ₽`)
  })

  it('принимает bigint (деньги в ZenStack хранятся BigInt)', () => {
    expect(formatKopecks(1250000n)).toBe(`12${NBSP}500 ₽`)
    expect(formatKopecks(99950n)).toBe('999,50 ₽')
  })

  it('форматирует отрицательные суммы', () => {
    expect(formatKopecks(-150050n)).toBe(`-1${NBSP}500,50 ₽`)
  })

  it('locale en: код валюты перед суммой', () => {
    const plain = (s: string) => s.replaceAll(String.fromCharCode(0xa0), ' ')
    expect(plain(formatKopecks(390000, { locale: 'en' }))).toBe('RUB 3,900')
    expect(plain(formatKopecks(99950n, { locale: 'en', prefix: 'from ' }))).toBe('from RUB 999.50')
    expect(formatKopecks(null, { locale: 'en', fallback: 'on request' })).toBe('on request')
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

describe('toKopecks', () => {
  it('умножает рубли на 100', () => {
    expect(toKopecks(1500)).toBe(150000)
  })

  it('округляет дробную часть копейки', () => {
    expect(toKopecks(19.999)).toBe(2000)
  })

  it('конвертирует ноль', () => {
    expect(toKopecks(0)).toBe(0)
  })

  it('является обратной операцией к делению formatKopecks/100', () => {
    expect(toKopecks(1500.5)).toBe(150050)
  })
})
