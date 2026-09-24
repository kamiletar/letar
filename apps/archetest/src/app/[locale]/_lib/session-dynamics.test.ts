import { describe, expect, it } from 'vitest'
import maxScoresData from '../_data/max-scores-per-question.json'
import {
  buildSessionDynamics,
  type QuestionScoringRow,
  type SessionAnswerRow,
  toDarkCoreChartPoints,
} from './session-dynamics'

/** Банк для теста: вопросы с максимумом по шкалам тетрады, вариант 0 — максимум по MAC/NAR/ANT/SAD */
const perQuestionMax = maxScoresData.per_question_max as Record<string, Record<string, number>>
const DARK = ['MAC', 'NAR', 'ANT', 'SAD'] as const

function questionsFor(code: string, n: number): QuestionScoringRow[] {
  return Object.entries(perQuestionMax)
    .filter(([, m]) => (m[code] ?? 0) > 0)
    .slice(0, n)
    .map(([num, m]) => ({
      id: `q${num}`,
      sortOrder: Number(num) - 1,
      // вариант 0 — полный максимум вопроса по ВСЕМ его шкалам (вопросы кросс-скорят тетраду,
      // и actual_max считается по справочнику целиком), вариант 1 — ноль
      options: [
        { text: '', textEn: '', scoring: { ...m } },
        { text: '', textEn: '', scoring: {} },
      ],
    }))
}

const QUESTIONS = DARK.flatMap((c) => questionsFor(c, 12))
const session = (id: string, day: number) => ({
  id,
  completedAt: new Date(2026, 0, day),
  createdAt: new Date(2026, 0, day),
  answeredCount: 48,
  questionBankVersion: 1,
  moodValence: null,
})

/** Ответы сессии: один и тот же вариант на все вопросы (0 — максимум, 1 — ноль) */
function answers(sessionId: string, pick: 0 | 1): SessionAnswerRow[] {
  return QUESTIONS.map((q) => ({ sessionId, questionId: q.id, selectedOption: pick }))
}

describe('buildSessionDynamics', () => {
  it('нормализация по ответам самой сессии, а не сырые баллы', () => {
    const [point] = buildSessionDynamics([session('s1', 1)], answers('s1', 0), QUESTIONS)
    for (const code of DARK) {
      expect(point.normalized?.[code], code).toBe(100)
    }
  })

  it('индекс ядра по каждой сессии: уровень меняется вместе с ответами', () => {
    const points = buildSessionDynamics(
      [session('s1', 1), session('s2', 8)],
      [...answers('s1', 1), ...answers('s2', 0)],
      QUESTIONS,
    )
    expect(points.map((p) => p.darkCore?.core)).toEqual([0, 100])
    const second = points[1].darkCore!
    expect(second.coreCiLow).toBeLessThanOrEqual(100)
    expect(second.coreCiHigh).toBeGreaterThanOrEqual(second.coreCiLow!)
  })

  it('сессия без распознанных ответов — точки нет, а не нули', () => {
    const [point] = buildSessionDynamics([session('s1', 1)], [{
      sessionId: 's1',
      questionId: 'нет-такого',
      selectedOption: 0,
    }], QUESTIONS)
    expect(point.normalized).toBeNull()
    expect(point.darkCore).toBeNull()
  })

  it('мало ответов по тетраде — индекс ядра null (структура insufficient), баллы есть', () => {
    const few = QUESTIONS.filter((q) => 'MAC' in q.options[0].scoring).slice(0, 2)
    const [point] = buildSessionDynamics(
      [session('s1', 1)],
      few.map((q) => ({ sessionId: 's1', questionId: q.id, selectedOption: 0 })),
      QUESTIONS,
    )
    expect(point.normalized).not.toBeNull()
    expect(point.darkCore).toBeNull()
  })

  it('ответы чужих сессий не смешиваются, порядок сессий сохраняется', () => {
    const points = buildSessionDynamics(
      [session('b', 2), session('a', 1)],
      [...answers('a', 0), ...answers('b', 1)],
      QUESTIONS,
    )
    expect(points.map((p) => [p.id, p.normalized?.MAC])).toEqual([['b', 0], ['a', 100]])
  })
})

describe('toDarkCoreChartPoints', () => {
  const base = { completedAt: new Date('2026-03-05T12:00:00Z'), createdAt: new Date('2026-03-05T12:00:00Z') }
  it('сессии без индекса пропускаются, но номер сессии сохраняет её место', () => {
    const points = toDarkCoreChartPoints(
      [
        { id: 'a', ...base, darkCore: { core: 40, coreCiLow: 30, coreCiHigh: 50, structure: 'even' } },
        { id: 'b', ...base, darkCore: null },
        { id: 'c', ...base, darkCore: { core: 60, coreCiLow: null, coreCiHigh: null, structure: 'flavored' } },
      ],
      'ru',
    )
    expect(points.map((p) => p.name.split(' ')[0])).toEqual(['#1', '#3'])
    expect(points[0]).toMatchObject({ core: 40, ci: [30, 50] })
    // интервала нет — полоса схлопывается в точку, а не рисуется от нуля
    expect(points[1].ci).toEqual([60, 60])
  })
})
