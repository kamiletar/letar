/**
 * Тест целостности банка вопросов: prisma/questions-dump.json ↔ max-scores-per-question.json.
 * Ловит порчу дампа (прецедент: смешанное экранирование, fix 2026-07-04) и НОВЫЕ
 * расхождения со справочником max-баллов.
 */
import { describe, expect, it } from 'vitest'
import questionsRaw from '../../../../prisma/questions-dump.json'
import maxScoresData from './max-scores-per-question.json'
import { ALL_SCALE_CODES } from './personality-types'

interface QuestionDump {
  id: string
  scenario: string
  scenarioEn: string
  options: string
  active: boolean
  sortOrder: number
  createdAt: string
}

interface OptionData {
  text: string
  textEn: string
  scoring: Record<string, number>
}

const questions = questionsRaw as QuestionDump[]
const perQuestionMax = (maxScoresData as { per_question_max: Record<string, Record<string, number>> }).per_question_max

/**
 * Известные расхождения дамп ↔ справочник (docs/question-bank-discrepancies.md).
 * Ждут решения психолога — тест не падает на них, но упадёт на любых новых.
 */
const KNOWN_DISCREPANCIES = new Set([
  '691',
  '1946',
  '1947',
  '1948',
  '1949',
  '1950',
  '1951',
  '1952',
  '1953',
  '1954',
  '1955',
])

describe('банк вопросов', () => {
  it('содержит не меньше 1955 вопросов со сплошными sortOrder', () => {
    expect(questions.length).toBeGreaterThanOrEqual(1955)
    const sortOrders = new Set(questions.map((q) => q.sortOrder))
    expect(sortOrders.size).toBe(questions.length)
    for (let i = 0; i < questions.length; i++) {
      expect(sortOrders.has(i), `дыра в sortOrder: ${i}`).toBe(true)
    }
  })

  it('id уникальны, тексты сценариев непусты', () => {
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
    for (const q of questions) {
      expect(q.scenario, `пустой scenario у ${q.id}`).toBeTruthy()
      expect(q.scenarioEn, `пустой scenarioEn у ${q.id}`).toBeTruthy()
    }
  })

  it('options каждого вопроса — валидный JSON с 2-6 опциями и корректным scoring', () => {
    for (const q of questions) {
      const opts = JSON.parse(q.options) as OptionData[]
      expect(opts.length, `опций у ${q.id}`).toBeGreaterThanOrEqual(2)
      expect(opts.length, `опций у ${q.id}`).toBeLessThanOrEqual(6)
      for (const o of opts) {
        expect(o.text, `пустой text у ${q.id}`).toBeTruthy()
        expect(o.textEn, `пустой textEn у ${q.id}`).toBeTruthy()
        for (const [scale, score] of Object.entries(o.scoring)) {
          expect(ALL_SCALE_CODES, `неизвестная шкала ${scale} у ${q.id}`).toContain(scale)
          expect(Number.isInteger(score), `нецелый балл у ${q.id}`).toBe(true)
        }
      }
    }
  })

  it('вычисленные max-баллы совпадают со справочником (кроме известных расхождений)', () => {
    const newMismatches: string[] = []
    for (const q of questions) {
      const qnum = String(q.sortOrder + 1)
      const computed: Record<string, number> = {}
      for (const o of JSON.parse(q.options) as OptionData[]) {
        for (const [scale, score] of Object.entries(o.scoring)) {
          computed[scale] = Math.max(computed[scale] ?? 0, score)
        }
      }
      const ref: Record<string, number> = {}
      for (const [scale, score] of Object.entries(perQuestionMax[qnum] ?? {})) {
        if (score > 0) {
          ref[scale] = score
        }
      }
      const same = JSON.stringify(Object.entries(computed).sort()) === JSON.stringify(Object.entries(ref).sort())
      if (!same && !KNOWN_DISCREPANCIES.has(qnum)) {
        newMismatches.push(qnum)
      }
    }
    expect(newMismatches, `новые расхождения дамп↔справочник: ${newMismatches.join(', ')}`).toEqual([])
  })
})
