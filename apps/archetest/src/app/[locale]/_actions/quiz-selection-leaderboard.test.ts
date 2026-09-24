import { beforeEach, describe, expect, it, vi } from 'vitest'
import maxScoresData from '../_data/max-scores-per-question.json'
import { isValidityQuestion, VALIDITY_CHECKS, VALIDITY_PER_SESSION } from '../_data/validity-checks'

/*
 * Server actions с БД: prisma и сессия подменены, проверяется логика действия —
 * какие вопросы попадают в порцию и по каким сессиям считается XP.
 */

const auth = vi.hoisted(() => ({ userId: null as string | null }))
const db = vi.hoisted(() => ({
  answered: [] as string[],
  skipped: [] as string[],
  questionWhere: [] as unknown[],
  sessionsWhere: undefined as unknown,
  upserted: undefined as unknown,
}))

/** Банк: id = q<номер>, sortOrder = номер − 1 */
const BANK = vi.hoisted(() => [] as { id: string; sortOrder: number }[])

vi.mock('@/lib/auth', () => ({
  getSession: async () => (auth.userId ? { user: { id: auth.userId } } : null),
  getDbUser: async () => ({ id: auth.userId }),
}))

vi.mock('@/lib/db', () => {
  const toRow = (q: { id: string; sortOrder: number }) => ({
    ...q,
    scenario: 'сценарий',
    scenarioEn: 'scenario',
    options: '[]',
  })
  const fake = {
    quizAnswer: { findMany: async () => db.answered.map((questionId) => ({ questionId })) },
    quizSkippedQuestion: { findMany: async () => db.skipped.map((questionId) => ({ questionId })) },
    quizQuestion: {
      findMany: async ({ where }: { where: { id?: { notIn: string[] }; sortOrder?: { in: number[] } } }) => {
        db.questionWhere.push(where)
        const notIn = new Set(where.id?.notIn ?? [])
        const onlySort = where.sortOrder ? new Set(where.sortOrder.in) : null
        return BANK.filter((q) => !notIn.has(q.id) && (!onlySort || onlySort.has(q.sortOrder))).map(toRow)
      },
    },
  }
  const prisma = {
    quizSession: {
      findMany: async ({ where }: { where: unknown }) => {
        db.sessionsWhere = where
        return [
          { answeredCount: 50, createdAt: new Date('2026-09-01T10:00:00Z') },
          { answeredCount: 50, createdAt: new Date('2026-09-01T20:00:00Z') },
          { answeredCount: 50, createdAt: new Date('2026-09-03T10:00:00Z') },
        ]
      },
    },
    userQuizAchievement: { findMany: async () => [] },
    quizLeaderboardEntry: {
      upsert: async (args: unknown) => {
        db.upserted = args
      },
    },
  }
  return { getEnhancedPrisma: () => fake, prisma }
})

const { getRandomQuestionsAction, submitQuizAction } = await import('./quiz.action')
const { recalcLeaderboardEntry } = await import('./leaderboard.action')

beforeEach(() => {
  BANK.length = 0
  for (const n of Object.keys(maxScoresData.per_question_max)) {
    BANK.push({ id: `q${n}`, sortOrder: Number(n) - 1 })
  }
  auth.userId = null
  db.answered = []
  db.skipped = []
  db.questionWhere = []
})

describe('getRandomQuestionsAction', () => {
  it('порция из 50: 48 стратифицированных + 2 attention-check, без повторов', async () => {
    const got = await getRandomQuestionsAction(50)
    expect(got).toHaveLength(50)
    expect(new Set(got.map((q) => q.id)).size).toBe(50)
    const bySort = new Map(BANK.map((q) => [q.id, q.sortOrder]))
    expect(got.filter((q) => isValidityQuestion(bySort.get(q.id)!))).toHaveLength(VALIDITY_PER_SESSION)
  })

  it('вошедшему пользователю не показываются отвеченные и пропущенные раньше вопросы', async () => {
    auth.userId = 'u1'
    const regular = BANK.filter((q) => !isValidityQuestion(q.sortOrder))
    db.answered = regular.slice(0, 1000).map((q) => q.id)
    db.skipped = regular.slice(1000, 1500).map((q) => q.id)
    const seen = new Set([...db.answered, ...db.skipped])
    for (let run = 0; run < 5; run++) {
      const got = await getRandomQuestionsAction(50)
      expect(got.filter((q) => seen.has(q.id))).toEqual([])
    }
  })

  it('attention-check возвращаются и после того, как на них уже отвечали', async () => {
    auth.userId = 'u1'
    const checkIds = BANK.filter((q) => VALIDITY_CHECKS.some((c) => c.sortOrder === q.sortOrder)).map((q) => q.id)
    db.answered = checkIds
    const got = await getRandomQuestionsAction(50)
    expect(got.filter((q) => checkIds.includes(q.id))).toHaveLength(VALIDITY_PER_SESSION)
  })

  it('гость: исключений нет, запрос к банку без notIn', async () => {
    await getRandomQuestionsAction(50)
    expect(db.questionWhere[0]).toEqual({ active: true })
  })
})

describe('submitQuizAction — вход', () => {
  it('без сессии — unauthorized, к банку не обращается', async () => {
    expect(await submitQuizAction({ seed: 1, answers: [{ questionId: 'q1', selectedOption: 0 }] })).toEqual({
      error: 'unauthorized',
    })
    expect(db.questionWhere).toEqual([])
  })

  it.each([
    ['пустой список ответов', { seed: 1, answers: [] }],
    ['вариант вне 0..3', { seed: 1, answers: [{ questionId: 'q1', selectedOption: 4 }] }],
    ['больше 100 ответов', {
      seed: 1,
      answers: Array.from({ length: 101 }, (_, i) => ({ questionId: `q${i}`, selectedOption: 0 })),
    }],
    ['mood вне 1..3', { seed: 1, answers: [{ questionId: 'q1', selectedOption: 0 }], moodValence: 4 }],
    ['чужая локаль', { seed: 1, answers: [{ questionId: 'q1', selectedOption: 0 }], locale: 'de' }],
  ])('%s — validation_error без записи', async (_name, input) => {
    auth.userId = 'u1'
    expect(await submitQuizAction(input as never)).toEqual({ error: 'validation_error' })
    expect(db.questionWhere).toEqual([])
  })
})

describe('recalcLeaderboardEntry', () => {
  it('XP считается только по валидным завершённым сессиям, гранула — UTC-сутки', async () => {
    const res = await recalcLeaderboardEntry('u1')
    expect(db.sessionsWhere).toEqual({ userId: 'u1', completedAt: { not: null }, isValid: true })
    // 3 сессии в 2 разных UTC-днях → 200 XP, ачивок нет
    expect(res.xp).toBe(200)
    expect(db.upserted).toMatchObject({
      where: { userId: 'u1' },
      update: { sessionsCount: 3, totalAnswers: 150, xp: 200 },
    })
  })
})
