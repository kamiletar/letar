import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QUESTION_BANK_VERSION } from '../_data/question-bank-version'
import {
  clearQuizDraft,
  type QuizDraft,
  quizDraftKey,
  readQuizDraft,
  restoreQuizDraft,
  saveQuizDraft,
} from './quiz-draft'

const draft: QuizDraft = {
  bankVersion: QUESTION_BANK_VERSION,
  seed: 42,
  phase: 'quiz',
  currentIndex: 0,
  questions: [{
    id: 'q1',
    scenario: 'Вопрос',
    scenarioEn: 'Question',
    options: [{ text: 'Да', textEn: 'Yes', scoring: {} }],
  }],
  answers: [['q1', 0]],
  skipped: [],
  mood: { valence: 2, energy: 3 },
}

beforeEach(() => localStorage.clear())

describe('Локальный черновик квиза', () => {
  it('полностью сохраняет снимок, режимы и аккаунты изолированы', () => {
    saveQuizDraft('full', 'first', draft)
    expect(readQuizDraft('full', 'first')).toEqual(draft)
    expect(readQuizDraft('express', 'first')).toBeNull()
    expect(readQuizDraft('full', 'second')).toBeNull()
    expect(readQuizDraft('full', null)).toBeNull()
    clearQuizDraft('full', 'first')
    expect(readQuizDraft('full', 'first')).toBeNull()
  })

  it('переносит гостевой черновик при входе, но собственный черновик имеет приоритет', () => {
    saveQuizDraft('full', null, draft)
    expect(restoreQuizDraft('full', 'first')).toEqual(draft)
    expect(readQuizDraft('full', null)).toBeNull()
    saveQuizDraft('full', null, { ...draft, seed: 123 })
    expect(restoreQuizDraft('full', 'first')?.seed).toBe(42)
    expect(readQuizDraft('full', null)?.seed).toBe(123)
  })

  it.each([
    '{',
    JSON.stringify({ ...draft, currentIndex: 1 }),
    JSON.stringify({ ...draft, answers: [['unknown', 0]] }),
    JSON.stringify({ ...draft, answers: [['q1', 1]] }),
    JSON.stringify({ ...draft, skipped: ['q1'] }),
    JSON.stringify({ ...draft, questions: [...draft.questions, ...draft.questions] }),
    JSON.stringify({ ...draft, bankVersion: -1 }),
  ])('повреждённые данные не восстанавливаются: %s', (raw) => {
    localStorage.setItem(quizDraftKey('full', null), raw)
    expect(readQuizDraft('full', null)).toBeNull()
  })

  it('недоступное хранилище не ломает текущую вкладку', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readQuizDraft('full', null)).toBeNull()
    expect(() => saveQuizDraft('full', null, draft)).not.toThrow()
    expect(() => clearQuizDraft('full', null)).not.toThrow()
  })
})
