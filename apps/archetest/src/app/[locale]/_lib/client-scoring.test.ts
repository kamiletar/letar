import { describe, expect, it } from 'vitest'
import type { QuizQuestionDTO } from '../_actions/quiz.action'
import { computeClientScores } from './client-scoring'

/** Мини-фабрика вопроса с заданным scoring вариантов */
function q(id: string, options: Record<string, number>[]): QuizQuestionDTO {
  return {
    id,
    scenario: `scenario-${id}`,
    scenarioEn: `scenario-en-${id}`,
    options: options.map((scoring, i) => ({ text: `opt-${i}`, textEn: `opt-en-${i}`, scoring })),
  }
}

describe('computeClientScores', () => {
  it('нет ответов → все шкалы 0', () => {
    const scores = computeClientScores(new Map(), [q('1', [{ MAC: 3 }, { MAC: 0 }])])
    expect(scores.MAC).toBe(0)
    expect(scores.HUM).toBe(0)
  })

  it('нормализация: выбран максимум шкалы → 100%', () => {
    // Вопрос: вариант 0 даёт MAC=3 (максимум среди вариантов). Выбор варианта 0 → raw=3, max=3
    const answers = new Map([['1', 0]])
    const scores = computeClientScores(answers, [q('1', [{ MAC: 3 }, { MAC: 1 }, { MAC: 0 }])])
    expect(scores.MAC).toBe(100)
  })

  it('нормализация: выбран не максимум → доля от actual_max', () => {
    // raw=1, actual_max=3 → 33.3%
    const answers = new Map([['1', 1]])
    const scores = computeClientScores(answers, [q('1', [{ MAC: 3 }, { MAC: 1 }, { MAC: 0 }])])
    expect(scores.MAC).toBe(33.3)
  })

  it('actual_max суммируется по нескольким вопросам одной шкалы', () => {
    // Q1: max HUM=2, выбран HUM=2. Q2: max HUM=4, выбран HUM=1. raw=3, max=6 → 50%
    const answers = new Map([
      ['1', 0],
      ['2', 1],
    ])
    const questions = [q('1', [{ HUM: 2 }, { HUM: 0 }]), q('2', [{ HUM: 4 }, { HUM: 1 }])]
    expect(computeClientScores(answers, questions).HUM).toBe(50)
  })

  it('несколько шкал в одном варианте считаются независимо', () => {
    const answers = new Map([['1', 0]])
    const scores = computeClientScores(answers, [
      q('1', [
        { MAC: 4, NAR: 2 },
        { MAC: 0, NAR: 4 },
      ]),
    ])
    expect(scores.MAC).toBe(100) // 4 из max 4
    expect(scores.NAR).toBe(50) // 2 из max 4
  })

  it('неизвестный questionId в ответах игнорируется без падения', () => {
    const answers = new Map([['missing', 2]])
    const scores = computeClientScores(answers, [q('1', [{ SAD: 3 }])])
    expect(scores.SAD).toBe(0)
  })

  it('индекс варианта вне диапазона не начисляет raw, но actual_max учитывается', () => {
    // Вопрос отвечен (id есть), но optIndex=5 не существует: raw не растёт, но max по вопросу считается
    const answers = new Map([['1', 5]])
    const scores = computeClientScores(answers, [q('1', [{ SAD: 3 }, { SAD: 1 }])])
    expect(scores.SAD).toBe(0) // raw=0, max=3 → 0%
  })

  it('только отвеченные вопросы влияют на actual_max (неотвеченные не тянут знаменатель)', () => {
    // Отвечен только Q1 (HUM=2 из 2 → 100%); Q2 не отвечен и в знаменатель не идёт
    const answers = new Map([['1', 0]])
    const questions = [q('1', [{ HUM: 2 }, { HUM: 0 }]), q('2', [{ HUM: 10 }, { HUM: 0 }])]
    expect(computeClientScores(answers, questions).HUM).toBe(100)
  })
})
