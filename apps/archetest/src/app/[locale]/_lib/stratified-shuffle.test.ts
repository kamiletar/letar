import { describe, expect, it } from 'vitest'
import maxScoresData from '../_data/max-scores-per-question.json'
import type { ScaleCode } from '../_data/personality-types'
import { SCORED_SCALE_CODES } from '../_data/personality-types'
import { getDominantScale, stratifiedSelect } from './stratified-shuffle'

/** Весь банк как пул: sortOrder = номер вопроса − 1 */
const BANK = Object.keys(maxScoresData.per_question_max).map((n) => ({ id: `q${n}`, sortOrder: Number(n) - 1 }))

function countByScale(list: { sortOrder: number }[]): Map<ScaleCode | null, number> {
  const m = new Map<ScaleCode | null, number>()
  for (const q of list) {
    const code = getDominantScale(q.sortOrder)
    m.set(code, (m.get(code) ?? 0) + 1)
  }
  return m
}

/** Пул: по `perScale[code]` вопросов с этой доминантной шкалой (первые по порядку банка) */
function poolOf(perScale: Partial<Record<ScaleCode, number>>) {
  const left = { ...perScale }
  return BANK.filter((q) => {
    const code = getDominantScale(q.sortOrder)
    if (!code || !left[code]) {
      return false
    }
    left[code]!--
    return true
  })
}

describe('stratifiedSelect — базовые инварианты', () => {
  it('пул не больше порции → все вопросы, только перемешанные', () => {
    const pool = BANK.slice(0, 30)
    const got = stratifiedSelect(pool, 50)
    expect(got).toHaveLength(30)
    expect(new Set(got.map((q) => q.id))).toEqual(new Set(pool.map((q) => q.id)))
  })

  it('ровно count уникальных вопросов из пула, исходный массив не мутируется', () => {
    const pool = BANK.slice()
    const before = pool.map((q) => q.id).join()
    const got = stratifiedSelect(pool, 50)
    expect(got).toHaveLength(50)
    expect(new Set(got.map((q) => q.id)).size).toBe(50)
    const ids = new Set(pool.map((q) => q.id))
    expect(got.every((q) => ids.has(q.id))).toBe(true)
    expect(pool.map((q) => q.id).join()).toBe(before)
  })
})

describe('stratifiedSelect — стратификация по доминантной шкале', () => {
  const inBank = countByScale(BANK)
  const scalesInBank = SCORED_SCALE_CODES.filter((c) => (inBank.get(c) ?? 0) > 0)

  it('каждая шкала с вопросами в пуле получает минимум один', () => {
    for (let run = 0; run < 20; run++) {
      const got = countByScale(stratifiedSelect(BANK, 50))
      for (const code of scalesInBank) {
        expect(got.get(code) ?? 0, code).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('доли пропорциональны размеру корзины (± 1 вопрос от 1 + доля × остаток)', () => {
    const categorized = scalesInBank.reduce((s, c) => s + inBank.get(c)!, 0)
    const remaining = 50 - scalesInBank.length
    const got = countByScale(stratifiedSelect(BANK, 50))
    for (const code of scalesInBank) {
      const expected = 1 + (inBank.get(code)! / categorized) * remaining
      expect(Math.abs((got.get(code) ?? 0) - expected), code).toBeLessThanOrEqual(1)
    }
  })

  it('маленькая корзина не даёт больше своего размера, а порция всё равно полная', () => {
    // Почти пустые шкалы (поздняя стадия прохождения) рядом с большими: слоты,
    // срезанные по размеру корзины, должны уйти другим шкалам, а не потеряться
    const big = SCORED_SCALE_CODES.slice(0, 3)
    const tiny = SCORED_SCALE_CODES.slice(3)
    const pool = poolOf({
      ...Object.fromEntries(big.map((c) => [c, 40])),
      ...Object.fromEntries(tiny.map((c) => [c, 1])),
    })
    expect(pool.length).toBeGreaterThan(50)
    for (let run = 0; run < 20; run++) {
      const got = stratifiedSelect(pool, 50)
      expect(got).toHaveLength(50)
      const byScale = countByScale(got)
      for (const code of tiny) {
        expect(byScale.get(code) ?? 0, code).toBeLessThanOrEqual(1)
      }
    }
  })
})
