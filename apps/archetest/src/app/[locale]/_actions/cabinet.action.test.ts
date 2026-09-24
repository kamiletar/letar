import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * Логика действий кабинета поверх подменённых сессии и prisma: гейт роли, валидация
 * ввода, отказ без активной связи, кумулятивные баллы по последнему ответу.
 * Владение связью/заметкой обеспечивают политики ZenStack — их юнит-тест на моках
 * не проверяет (см. ревью политик в PLAN.md).
 */

const st = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  roles: [] as string[],
  link: null as null | Record<string, unknown>,
  answers: [] as { questionId: string | null; selectedOption: number }[],
  writes: [] as string[],
  scored: undefined as unknown,
}))

vi.mock('@/lib/auth', () => ({ getSession: async () => st.session }))
vi.mock('@/lib/db', () => {
  const enhanced = {
    clientPsychologistLink: {
      findFirst: async () => st.link,
      update: async () => {
        st.writes.push('link.update')
      },
    },
    quizAnswer: { findMany: async () => st.answers },
    quizSession: { findMany: async () => [] },
    psychologistNote: {
      create: async ({ data }: { data: unknown }) => {
        st.writes.push('note.create')
        return data
      },
      delete: async () => {
        st.writes.push('note.delete')
      },
    },
  }
  return {
    getEnhancedPrisma: () => enhanced,
    prisma: { user: { findUnique: async () => (st.session ? { id: st.session.user.id, roles: st.roles } : null) } },
  }
})
vi.mock('./quiz.action', () => ({
  calculateScores: async (answers: unknown) => {
    st.scored = answers
    return { normalized: { PAR: 10 }, relevantCounts: { PAR: 1 }, confidence: { PAR: 'low' } }
  },
}))

const cabinet = await import('./cabinet.action')

beforeEach(() => {
  st.session = { user: { id: 'psy1' } }
  st.roles = ['PSYCHOLOGIST']
  st.link = null
  st.answers = []
  st.writes = []
  st.scored = undefined
})

describe('гейт роли', () => {
  it('без сессии — отказ, до БД не доходит', async () => {
    st.session = null
    await expect(cabinet.getClientsListAction()).rejects.toThrow('Не авторизован')
  })

  it('не психолог — отказ на каждом действии, ни одной записи', async () => {
    st.roles = ['USER']
    await expect(cabinet.getClientDetailAction('c1')).rejects.toThrow('Доступ запрещён')
    await expect(cabinet.addNoteAction({ linkId: 'l1', content: 'x' })).rejects.toThrow('Доступ запрещён')
    await expect(cabinet.deleteNoteAction('n1')).rejects.toThrow('Доступ запрещён')
    await expect(cabinet.updateDisplayNameAction({ linkId: 'l1' })).rejects.toThrow('Доступ запрещён')
    expect(st.writes).toEqual([])
  })
})

describe('валидация ввода', () => {
  it('пустая или слишком длинная заметка не пишется', async () => {
    expect(await cabinet.addNoteAction({ linkId: 'l1', content: '' })).toEqual({ error: 'Некорректные данные' })
    expect(await cabinet.addNoteAction({ linkId: 'l1', content: 'x'.repeat(5001) })).toEqual({
      error: 'Некорректные данные',
    })
    expect(st.writes).toEqual([])
  })

  it('лишние поля отрезаются (.strip), в запись идут только linkId и content', async () => {
    const res = await cabinet.addNoteAction({ linkId: 'l1', content: 'заметка', psychologistId: 'чужой' })
    expect(res).toEqual({ data: { linkId: 'l1', content: 'заметка' } })
  })

  it('имя длиннее 100 символов — отказ без записи', async () => {
    expect(await cabinet.updateDisplayNameAction({ linkId: 'l1', displayName: 'x'.repeat(101) })).toEqual({
      error: 'Некорректные данные',
    })
    expect(st.writes).toEqual([])
  })
})

describe('getClientDetailAction', () => {
  it('без активной связи — ошибка, ответы клиента не читаются', async () => {
    st.answers = [{ questionId: 'q1', selectedOption: 0 }]
    expect(await cabinet.getClientDetailAction('c1')).toEqual({ error: 'Клиент не найден или доступ отозван' })
    expect(st.scored).toBeUndefined()
  })

  it('кумулятивные баллы — по последнему ответу на каждый вопрос', async () => {
    st.link = { id: 'l1', displayName: null, createdAt: new Date(), client: { id: 'c1' }, notes: [] }
    st.answers = [
      { questionId: 'q1', selectedOption: 0 },
      { questionId: 'q2', selectedOption: 1 },
      { questionId: 'q1', selectedOption: 3 },
      { questionId: null, selectedOption: 2 },
    ]
    const res = await cabinet.getClientDetailAction('c1')
    expect(st.scored).toEqual([
      { questionId: 'q1', selectedOption: 3 },
      { questionId: 'q2', selectedOption: 1 },
    ])
    expect(res).toMatchObject({
      data: { totalAnswered: 2, cumulativeScores: { PAR: 10 }, scoreConfidence: { PAR: 'low' } },
    })
  })

  it('клиент без ответов — баллов нет, а не нули', async () => {
    st.link = { id: 'l1', displayName: null, createdAt: new Date(), client: { id: 'c1' }, notes: [] }
    const res = await cabinet.getClientDetailAction('c1')
    expect(res).toMatchObject({ data: { totalAnswered: 0, cumulativeScores: null, scoreRelevantCounts: null } })
  })
})
