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
  answers: [] as { sessionId: string; questionId: string | null; selectedOption: number }[],
  writes: [] as string[],
  questionQueries: 0,
  rankQueryIds: undefined as unknown,
  newSessionsWhere: undefined as unknown,
  sessionsWhere: undefined as unknown,
}))

vi.mock('@/lib/auth', () => ({ getSession: async () => st.session }))
vi.mock('@/lib/db', () => {
  const enhanced = {
    clientPsychologistLink: {
      // Как под политикой: связи психолога есть, а сами клиенты через include недоступны
      findMany: async () => [
        {
          id: 'l1',
          clientId: 'c1',
          displayName: null,
          status: 'ACTIVE',
          createdAt: new Date(0),
          lastSeenAt: new Date(1000),
        },
        { id: 'l2', clientId: 'c2', displayName: 'Мария', status: 'REVOKED', createdAt: new Date(0), lastSeenAt: null },
      ],
      findFirst: async () => st.link,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        st.writes.push(`link.update:${Object.keys(data).join(',')}`)
      },
    },
    quizAnswer: { findMany: async () => st.answers },
    // Вопрос 1 (sortOrder 0) — настоящий из банка: вариант i даёт i баллов по PAR
    quizQuestion: {
      findMany: async () => {
        st.questionQueries++
        const options = [0, 1, 2, 3].map((i) => ({ text: '', textEn: '', scoring: i ? { PAR: i } : {} }))
        return ['q1', 'q2'].map((id, i) => ({ id, sortOrder: i, options: JSON.stringify(options) }))
      },
    },
    quizSession: {
      findMany: async ({ where, select }: { where: unknown; select: Record<string, boolean> }) => {
        // Два разных запроса: «новые сессии» для списка и история для карточки
        if (select.userId) {
          st.newSessionsWhere = where
          return [{ userId: 'c1', completedAt: new Date(500) }, { userId: 'c1', completedAt: new Date(2000) }]
        }
        st.sessionsWhere = where
        return [{
          id: 's1',
          answeredCount: 2,
          completedAt: new Date(0),
          createdAt: new Date(0),
          questionBankVersion: 1,
        }]
      },
    },
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
    prisma: {
      user: {
        findUnique: async () => (st.session ? { id: st.session.user.id, roles: st.roles } : null),
        findMany: async () => [
          { id: 'c1', name: null, email: 'c1@example.test', image: null },
          { id: 'c2', name: 'Maria', email: 'c2@example.test', image: null },
        ],
      },
      quizLeaderboardEntry: {
        findMany: async ({ where }: { where: { userId: { in: string[] } } }) => {
          st.rankQueryIds = where.userId.in
          return [{ userId: 'c1', rankCode: 'EXPLORER_II' }, { userId: 'c2', rankCode: 'MASTER_I' }]
        },
      },
    },
  }
})

const cabinet = await import('./cabinet.action')

beforeEach(() => {
  st.session = { user: { id: 'psy1' } }
  st.roles = ['PSYCHOLOGIST']
  st.link = null
  st.answers = []
  st.writes = []
  st.questionQueries = 0
  st.sessionsWhere = undefined
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

describe('getClientsListAction', () => {
  it('отозвавший доступ клиент в списке — со статусом, а не падением всего списка', async () => {
    const { data } = await cabinet.getClientsListAction()
    expect(data.map((c) => [c.clientName, c.clientEmail, c.status])).toEqual([
      ['c1@example.test', 'c1@example.test', 'ACTIVE'],
      ['Мария', 'c2@example.test', 'REVOKED'],
    ])
  })

  it('уровень ранга — только у активной связи; ранг отозвавшего клиента не запрашивается', async () => {
    const { data } = await cabinet.getClientsListAction()
    expect(data.map((c) => c.rankTier)).toEqual(['EXPLORER', null])
    expect(st.rankQueryIds).toEqual(['c1'])
  })

  it('«новые сессии» — после последнего просмотра, только валидные сессии активных клиентов', async () => {
    const { data } = await cabinet.getClientsListAction()
    expect(data.map((c) => c.newSessions)).toEqual([1, 0])
    expect(st.newSessionsWhere).toEqual({ userId: { in: ['c1'] }, completedAt: { not: null }, isValid: true })
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
    st.answers = [{ sessionId: 's1', questionId: 'q1', selectedOption: 0 }]
    expect(await cabinet.getClientDetailAction('c1')).toEqual({ error: 'Клиент не найден или доступ отозван' })
    expect(st.questionQueries).toBe(0)
  })

  it('кумулятивные баллы — по последнему ответу на каждый вопрос; вопросы грузятся один раз', async () => {
    st.link = { id: 'l1', displayName: null, createdAt: new Date(), client: { id: 'c1' }, notes: [] }
    st.answers = [
      { sessionId: 's1', questionId: 'q1', selectedOption: 0 },
      { sessionId: 's1', questionId: 'q2', selectedOption: 1 },
      { sessionId: 's1', questionId: 'q1', selectedOption: 3 },
      { sessionId: 's1', questionId: null, selectedOption: 2 },
    ]
    const res = await cabinet.getClientDetailAction('c1')
    expect(res).toMatchObject({ data: { totalAnswered: 2 } })
    // последний ответ на q1 — вариант 3, а не 0: иначе PAR был бы ниже
    const data = (res as { data: { cumulativeScores: Record<string, number> } }).data
    expect(data.cumulativeScores.PAR).toBeGreaterThan(0)
    expect(st.questionQueries).toBe(1)
  })

  it('открытие карточки отмечает просмотр (lastSeenAt) — и только его', async () => {
    st.link = { id: 'l1', displayName: null, createdAt: new Date(), client: { id: 'c1' }, notes: [] }
    await cabinet.getClientDetailAction('c1')
    expect(st.writes).toEqual(['link.update:lastSeenAt'])
  })

  it('динамика — только валидные завершённые сессии, по баллам самой сессии', async () => {
    st.link = { id: 'l1', displayName: null, createdAt: new Date(), client: { id: 'c1' }, notes: [] }
    st.answers = [{ sessionId: 's1', questionId: 'q1', selectedOption: 3 }]
    const res = await cabinet.getClientDetailAction('c1')
    expect(st.sessionsWhere).toEqual({ userId: 'c1', completedAt: { not: null }, isValid: true })
    const history =
      (res as { data: { sessionsHistory: { id: string; normalized: Record<string, number> | null }[] } }).data
        .sessionsHistory
    expect(history.map((h) => h.id)).toEqual(['s1'])
    expect(history[0].normalized?.PAR).toBeGreaterThan(0)
  })

  it('клиент без ответов — баллов нет, а не нули; банк не запрашивается', async () => {
    st.link = { id: 'l1', displayName: null, createdAt: new Date(), client: { id: 'c1' }, notes: [] }
    const res = await cabinet.getClientDetailAction('c1')
    expect(res).toMatchObject({ data: { totalAnswered: 0, cumulativeScores: null, scoreRelevantCounts: null } })
    expect(st.questionQueries).toBe(0)
  })
})
