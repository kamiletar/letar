/**
 * Тесты чистых функций машинного аудита банка (этап 5.10, часть A).
 * Сам скрипт (scripts/audit-question-bank.ts) исполняется на верхнем уровне,
 * поэтому тестируется его библиотека scripts/audit-lib.ts.
 */
import { describe, expect, it } from 'vitest'
import { collapseRanges, contentStems, jaccard, normalizeText, trigrams } from '../../../../scripts/audit-lib'

describe('normalizeText', () => {
  it('приводит регистр, ё и пунктуацию к канону', () => {
    expect(normalizeText('Вы нашли КОШЕЛЁК — с деньгами!')).toBe('вы нашли кошелек с деньгами')
  })

  it('схлопывает повторные пробелы и обрезает края', () => {
    expect(normalizeText('  два   слова  ')).toBe('два слова')
  })

  it('различие только в пунктуации/регистре даёт одинаковый канон', () => {
    expect(normalizeText('Ваше любимое время суток:')).toBe(normalizeText('ваше любимое время суток?'))
  })
})

describe('trigrams', () => {
  it('строит символьные триграммы с перекрытием', () => {
    expect([...trigrams('абвгд')]).toEqual(['абв', 'бвг', 'вгд'])
  })

  it('строка короче трёх символов даёт пустое множество', () => {
    expect(trigrams('аб').size).toBe(0)
  })
})

describe('jaccard', () => {
  it('идентичные множества → 1, непересекающиеся → 0', () => {
    const a = new Set(['abc', 'bcd'])
    expect(jaccard(a, new Set(a))).toBe(1)
    expect(jaccard(a, new Set(['xyz']))).toBe(0)
  })

  it('частичное пересечение считается как |∩|/|∪|', () => {
    // ∩ = {b}, ∪ = {a, b, c} → 1/3
    expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3)
  })

  it('пустое множество не даёт деления на ноль', () => {
    expect(jaccard(new Set(), new Set(['abc']))).toBe(0)
  })
})

describe('collapseRanges', () => {
  it('сворачивает последовательные номера в диапазоны', () => {
    expect(collapseRanges([1, 2, 3, 7, 9, 10])).toBe('№1–3, №7, №9–10')
  })

  it('одиночный номер и пустой список', () => {
    expect(collapseRanges([42])).toBe('№42')
    expect(collapseRanges([])).toBe('')
  })

  it('сортирует вход перед свёрткой', () => {
    expect(collapseRanges([3, 1, 2])).toBe('№1–3')
  })
})

describe('contentStems', () => {
  it('усечение до 4 символов сглаживает морфологию', () => {
    expect(contentStems(normalizeText('кошелёк кошельке сдачи сдачу'))).toEqual(new Set(['коше', 'сдач']))
  })

  it('стоп-слова и короткие слова отбрасываются', () => {
    // «вы», «не» — стоп/короткие; «нашли», «кошелек» — содержательные
    expect(contentStems('вы не нашли кошелек')).toEqual(new Set(['нашл', 'коше']))
  })
})
