import { describe, expect, it } from 'vitest'
import { CORE_SCALE_COUNT, EXPERIMENTAL_SCALE_COUNT, TOTAL_QUESTIONS } from './bank-stats'
import maxScoresData from './max-scores-per-question.json'
import { ALL_SCALE_CODES, EXPERIMENTAL_SCALES } from './personality-types'

/**
 * Страховка единственного источника истины (см. bank-stats.ts): числа в публичных
 * текстах берутся из констант, а константы сверяются здесь с реальными данными.
 * Импорт тяжёлого справочника допустим только в тесте — в рантайм он не попадает.
 */
describe('bank-stats', () => {
  it('TOTAL_QUESTIONS совпадает со справочником максимумов', () => {
    expect(TOTAL_QUESTIONS).toBe(maxScoresData.metadata.total_questions)
    expect(TOTAL_QUESTIONS).toBe(Object.keys(maxScoresData.per_question_max).length)
  })

  it('счётчики шкал выводятся из списков, а не дублируют их', () => {
    expect(CORE_SCALE_COUNT).toBe(ALL_SCALE_CODES.length)
    expect(EXPERIMENTAL_SCALE_COUNT).toBe(EXPERIMENTAL_SCALES.length)
  })

  it('русские формы слова «шкала» рассчитаны на 22–24 — за границами нужна ревизия текстов', () => {
    expect(CORE_SCALE_COUNT).toBeGreaterThanOrEqual(22)
    expect(CORE_SCALE_COUNT).toBeLessThanOrEqual(24)
  })
})
