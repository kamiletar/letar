import { beforeEach, describe, expect, it } from 'vitest'
import { readPendingQuiz, savePendingQuiz } from './quiz-pending'
import { PENDING_QUIZ_KEY } from './storage-keys'

const pending = {
  completed: true as const,
  mode: 'full' as const,
  userId: null,
  seed: 42,
  answers: [{ questionId: 'q1', selectedOption: 1 }],
  skipped: [],
  mood: null,
  previewScores: { PAR: 50 },
}

beforeEach(() => sessionStorage.clear())

describe('Завершённый результат перед входом', () => {
  it('гостевые ответы доступны для привязки, личные — только своему аккаунту', () => {
    savePendingQuiz(pending)
    expect(readPendingQuiz(null)).toEqual(pending)
    expect(readPendingQuiz('user-1')).toEqual(pending)
    savePendingQuiz({ ...pending, userId: 'user-1' })
    expect(readPendingQuiz('user-1')?.seed).toBe(42)
    expect(readPendingQuiz(null)).toBeNull()
    expect(readPendingQuiz('user-2')).toBeNull()
  })

  it.each([
    '{',
    JSON.stringify({ ...pending, completed: undefined }),
    JSON.stringify({ ...pending, answers: [{ questionId: 'q1', selectedOption: 9 }] }),
    JSON.stringify({ ...pending, previewScores: { PAR: '50' } }),
  ])('не показывает повреждённый или незавершённый результат: %s', (raw) => {
    sessionStorage.setItem(PENDING_QUIZ_KEY, raw)
    expect(readPendingQuiz('user-1')).toBeNull()
  })

  it('сохраняет совместимость с завершённой очередью экспресса без настроения и предпросмотра', () => {
    sessionStorage.setItem(
      PENDING_QUIZ_KEY,
      JSON.stringify({
        completed: true,
        mode: 'express',
        seed: 42,
        answers: pending.answers,
      }),
    )
    expect(readPendingQuiz('user-1')).toMatchObject({ mode: 'express', mood: null, skipped: [] })
  })
})
