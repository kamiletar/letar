import { describe, expect, it } from 'vitest'
import bank from '../../../../prisma/questions-dump.json'
import maxData from '../_data/max-scores-per-question.json'
import { ALL_SCALE_CODES, EXPERIMENTAL_SCALE_CODES, getPersonalityType } from '../_data/personality-types'
import { QUESTION_BANK_VERSION } from '../_data/question-bank-version'
import { computeScoresCore, type QuizOptionData } from './scoring-core'
import { getDominantScale, stratifiedSelect } from './stratified-shuffle'

const additions = bank.slice(2126)
const expected = { INA: 9, HYI: 9, AAX: 10, AAV: 10, HON: 15, SAD: 9, ASD: 8, MAS: 7, ALX: 6 }

describe('подготовленные пакеты: подключение и расчёт', () => {
  it('83 новых вопроса добавлены с непрерывным порядком и известными ключами', () => {
    expect(additions).toHaveLength(83)
    expect(bank).toHaveLength(2209)
    expect(new Set(bank.map((q) => q.id)).size).toBe(bank.length)
    const counts: Record<string, number> = {}
    for (const [index, q] of additions.entries()) {
      expect(q.sortOrder).toBe(2126 + index)
      const options = JSON.parse(q.options) as QuizOptionData[]
      expect(options).toHaveLength(4)
      const codes = [...new Set(options.flatMap((o) => Object.keys(o.scoring)))]
      expect(codes).toHaveLength(1)
      const code = codes[0]
      counts[code] = (counts[code] ?? 0) + 1
      expect([...ALL_SCALE_CODES, ...EXPERIMENTAL_SCALE_CODES]).toContain(code)
      expect(q.scenario).toContain('шесть месяцев')
      expect(q.scenarioEn).toContain('six months')
      expect(options.map((o) => o.scoring[code] ?? 0)).toEqual(code === 'HON' ? [3, 2, 1, 0] : [0, 1, 2, 3])
      const key = String(q.sortOrder + 1) as keyof typeof maxData.per_question_max
      expect(maxData.per_question_max[key]).toEqual({ [code]: 3 })
    }
    expect(counts).toEqual(expected)
    expect(QUESTION_BANK_VERSION).toBe(3)
  })

  it('новые шкалы доступны в общем профиле без беты и не меняют баллы старых', () => {
    const experimental = additions.filter((q) =>
      ['INA', 'HYI', 'AAX', 'AAV', 'HON'].includes(getDominantScale(q.sortOrder)!)
    )
    expect(experimental).toHaveLength(53)
    const answered = experimental.map((q) => ({
      sortOrder: q.sortOrder,
      selectedOption: getDominantScale(q.sortOrder) === 'HON' ? 3 : 0,
      options: JSON.parse(q.options) as QuizOptionData[],
    }))
    const scores = computeScoresCore(answered)
    for (const code of ALL_SCALE_CODES.filter((code) => !['INA', 'HYI', 'AAX', 'AAV', 'HON'].includes(code))) {
      expect(scores.raw[code]).toBe(0)
      expect(scores.relevantCounts[code]).toBe(0)
    }
    for (const code of ['INA', 'HYI', 'AAX', 'AAV', 'HON'] as const) {
      expect(ALL_SCALE_CODES).toContain(code)
      expect(EXPERIMENTAL_SCALE_CODES as string[]).not.toContain(code)
      expect(getPersonalityType(code).beta).toBeUndefined()
      expect(scores.normalized[code as keyof typeof scores.normalized]).toBe(0)
      expect(scores.relevantCounts[code as keyof typeof scores.relevantCounts]).toBe(expected[code])
    }
  })

  it('40 порций: без повторов; СДВГ исчерпывается после девяти, ответы сохраняются', () => {
    let pool = bank.filter((q) => getDominantScale(q.sortOrder) !== null)
    const seen = new Set<string>()
    const domainCounts: Record<string, number> = { INA: 0, HYI: 0 }
    const answers: Parameters<typeof computeScoresCore>[0] = []
    for (let portion = 0; portion < 40; portion++) {
      // В обычной порции два места заняты контрольными вопросами.
      const selected = stratifiedSelect(pool, 48)
      expect(selected).toHaveLength(48)
      for (const code of ['INA', 'HYI']) {
        const n = selected.filter((q) => getDominantScale(q.sortOrder) === code).length
        expect(n).toBe(portion < 9 ? 1 : 0)
        domainCounts[code] += n
      }
      for (const q of selected) {
        expect(seen.has(q.id)).toBe(false)
        seen.add(q.id)
        answers.push({ sortOrder: q.sortOrder, selectedOption: 0, options: JSON.parse(q.options) })
      }
      pool = pool.filter((q) => !seen.has(q.id))
    }
    expect(domainCounts).toEqual({ INA: 9, HYI: 9 })
    expect(computeScoresCore(answers).relevantCounts).toMatchObject(domainCounts)
  })
})
