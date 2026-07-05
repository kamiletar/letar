import { describe, expect, it } from 'vitest'
import { HEXAGRAM_SCALE_CODES, type PersonalityTypeCode } from '../_data/personality-types'
import { EXPRESS_QUESTIONS_PER_SCALE, EXPRESS_TOTAL, selectExpressQuestions } from './express-select'

/** Тестовый вопрос с явной доминантной шкалой (обходим зависимость от JSON) */
interface TestQ {
  id: string
  sortOrder: number
  dom: PersonalityTypeCode | null
}

/** Сборка пула: `count` вопросов на каждую шкалу из `codes` */
function pool(codes: PersonalityTypeCode[], count: number): TestQ[] {
  const out: TestQ[] = []
  for (const code of codes) {
    for (let i = 0; i < count; i++) {
      out.push({ id: `${code}-${i}`, sortOrder: 0, dom: code })
    }
  }
  return out
}

/** Детерминированный отбор: инъекция dominantOf и identity-shuffle */
function select(questions: TestQ[], perScale?: number) {
  return selectExpressQuestions(questions, {
    perScale,
    dominantOf: (q) => q.dom,
    shuffle: (a) => a,
  })
}

/** Сколько вопросов каждой шкалы попало в выборку */
function countByScale(picked: TestQ[]): Map<PersonalityTypeCode, number> {
  const counts = new Map<PersonalityTypeCode, number>()
  for (const q of picked) {
    if (q.dom) {
      counts.set(q.dom, (counts.get(q.dom) ?? 0) + 1)
    }
  }
  return counts
}

describe('selectExpressQuestions', () => {
  it('константы: 8 шкал × 3 = 24 вопроса', () => {
    expect(HEXAGRAM_SCALE_CODES).toHaveLength(8)
    expect(EXPRESS_TOTAL).toBe(HEXAGRAM_SCALE_CODES.length * EXPRESS_QUESTIONS_PER_SCALE)
    expect(EXPRESS_TOTAL).toBe(24)
  })

  it('детерминированное покрытие: ровно 3 на каждую из 8 шкал гексаграммы', () => {
    const picked = select(pool(HEXAGRAM_SCALE_CODES, 5))
    expect(picked).toHaveLength(EXPRESS_TOTAL)

    const counts = countByScale(picked)
    for (const code of HEXAGRAM_SCALE_CODES) {
      expect(counts.get(code)).toBe(EXPRESS_QUESTIONS_PER_SCALE)
    }
  })

  it('игнорирует вопросы с недоминантной/нехексаграммной шкалой', () => {
    const questions = [
      ...pool(HEXAGRAM_SCALE_CODES, 3),
      { id: 'PAR-x', sortOrder: 0, dom: 'PAR' as const },
      {
        id: 'nil',
        sortOrder: 0,
        dom: null,
      },
    ]
    const picked = select(questions)

    expect(picked).toHaveLength(EXPRESS_TOTAL)
    expect(picked.some((q) => q.id === 'PAR-x' || q.id === 'nil')).toBe(false)
  })

  it('если у шкалы меньше квоты — берёт сколько есть, без падения', () => {
    // SAD — самая малая шкала; смоделируем 2 вопроса вместо 3
    const questions = [...pool(['HUM', 'KAN', 'FAI', 'MAC', 'NAR', 'ANT', 'MAS'], 3), ...pool(['SAD'], 2)]
    const picked = select(questions)

    const counts = countByScale(picked)
    expect(counts.get('SAD')).toBe(2)
    expect(picked).toHaveLength(EXPRESS_TOTAL - 1)
  })

  it('уважает кастомную квоту perScale', () => {
    const picked = select(pool(HEXAGRAM_SCALE_CODES, 5), 2)
    expect(picked).toHaveLength(HEXAGRAM_SCALE_CODES.length * 2)
    for (const code of HEXAGRAM_SCALE_CODES) {
      expect(countByScale(picked).get(code)).toBe(2)
    }
  })

  it('не мутирует исходный массив', () => {
    const questions = pool(HEXAGRAM_SCALE_CODES, 4)
    const snapshot = questions.map((q) => q.id)
    select(questions)
    expect(questions.map((q) => q.id)).toEqual(snapshot)
  })
})
