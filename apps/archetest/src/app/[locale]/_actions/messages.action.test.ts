import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * Сообщения психолога клиентам поверх подменённых сессии и prisma: гейт роли, валидация,
 * отбор адресатов (только свои ACTIVE-связи), имя психолога без include, отметка прочтения
 * только полем readAt. Сами политики `PsychologistMessage` на моках не проверяются.
 */

const st = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  roles: [] as string[],
  activeLinks: [] as { id: string }[],
  linkWhere: undefined as unknown,
  created: [] as unknown[],
  messages: [] as unknown[],
  unread: [] as { id: string }[],
  updateManyArgs: undefined as unknown,
}))

vi.mock('@/lib/auth', () => ({
  getSession: async () => st.session,
  getDbUser: async (session: { user: { id: string } }) => ({ id: session.user.id, roles: st.roles }),
}))
vi.mock('@/lib/db', () => {
  const enhanced = {
    clientPsychologistLink: {
      findMany: async ({ where }: { where: unknown }) => {
        st.linkWhere = where
        return st.activeLinks
      },
    },
    psychologistMessage: {
      create: async ({ data }: { data: unknown }) => {
        st.created.push(data)
        return { id: 'm' }
      },
      findMany: async ({ where }: { where: { readAt?: null } }) => ('readAt' in where ? st.unread : st.messages),
    },
    $transaction: async (fn: (tx: unknown) => Promise<void>) => fn(enhanced),
  }
  return {
    getEnhancedPrisma: () => enhanced,
    prisma: {
      user: {
        findUnique: async () => (st.session ? { id: st.session.user.id, roles: st.roles } : null),
        findMany: async () => [{ id: 'psy1', name: null, email: 'psy@example.test' }],
      },
      psychologistMessage: {
        updateMany: async (args: { where: { id: { in: string[] } } }) => {
          st.updateManyArgs = args
          return { count: args.where.id.in.length }
        },
      },
    },
  }
})

const actions = await import('./messages.action')

beforeEach(() => {
  st.session = { user: { id: 'psy1' } }
  st.roles = ['PSYCHOLOGIST']
  st.activeLinks = [{ id: 'l1' }]
  st.linkWhere = undefined
  st.created = []
  st.messages = []
  st.unread = []
  st.updateManyArgs = undefined
})

describe('sendMessagesAction', () => {
  it('без сессии и не психологу — отказ без записи', async () => {
    st.session = null
    expect(await actions.sendMessagesAction({ allActive: true, body: 'x' })).toEqual({ error: 'Не авторизован' })
    st.session = { user: { id: 'u1' } }
    st.roles = ['USER']
    expect(await actions.sendMessagesAction({ allActive: true, body: 'x' })).toEqual({ error: 'Доступ запрещён' })
    expect(st.created).toEqual([])
  })

  it('пустое, из пробелов, длиннее 2000 или без адресатов — отказ', async () => {
    for (
      const input of [
        { allActive: true, body: '' },
        { allActive: true, body: '   ' },
        { allActive: true, body: 'x'.repeat(2001) },
        { body: 'привет' },
        { linkIds: [], body: 'привет' },
      ]
    ) {
      expect(await actions.sendMessagesAction(input)).toEqual({ error: 'Некорректные данные' })
    }
    expect(st.created).toEqual([])
  })

  it('адресаты — только свои активные связи из запроса; текст обрезан по краям, лишнее отрезано', async () => {
    st.activeLinks = [{ id: 'l1' }]
    const res = await actions.sendMessagesAction({ linkIds: ['l1', 'чужая'], body: '  привет  ', readAt: 'x' })
    expect(st.linkWhere).toEqual({ psychologistId: 'psy1', status: 'ACTIVE', id: { in: ['l1', 'чужая'] } })
    expect(st.created).toEqual([{ linkId: 'l1', body: 'привет' }])
    expect(res).toEqual({ data: { sent: 1 } })
  })

  it('«всем активным» — без фильтра по id, по сообщению на каждую связь', async () => {
    st.activeLinks = [{ id: 'l1' }, { id: 'l2' }]
    expect(await actions.sendMessagesAction({ allActive: true, body: 'Сессия переносится' })).toEqual({
      data: { sent: 2 },
    })
    expect(st.linkWhere).toEqual({ psychologistId: 'psy1', status: 'ACTIVE' })
    expect(st.created).toHaveLength(2)
  })

  it('ни одной активной связи — ошибка, а не «отправлено 0»', async () => {
    st.activeLinks = []
    expect(await actions.sendMessagesAction({ allActive: true, body: 'x' })).toEqual({
      error: 'Нет активных клиентов для сообщения',
    })
  })
})

describe('getMyMessagesAction', () => {
  it('без сессии — пусто', async () => {
    st.session = null
    expect(await actions.getMyMessagesAction()).toEqual({ data: [] })
  })

  it('имя психолога дочитывается отдельно; без имени — email', async () => {
    st.session = { user: { id: 'c1' } }
    const createdAt = new Date(0)
    st.messages = [{ id: 'm1', body: 'привет', createdAt, readAt: null, link: { psychologistId: 'psy1' } }]
    expect(await actions.getMyMessagesAction()).toEqual({
      data: [{ id: 'm1', body: 'привет', createdAt, readAt: null, psychologistName: 'psy@example.test' }],
    })
  })
})

describe('markMyMessagesReadAction', () => {
  it('пишет только readAt и только по своим непрочитанным id', async () => {
    st.session = { user: { id: 'c1' } }
    st.unread = [{ id: 'm1' }, { id: 'm2' }]
    expect(await actions.markMyMessagesReadAction()).toEqual({ data: { marked: 2 } })
    const args = st.updateManyArgs as { where: unknown; data: Record<string, unknown> }
    expect(args.where).toEqual({ id: { in: ['m1', 'm2'] }, readAt: null })
    expect(Object.keys(args.data)).toEqual(['readAt'])
  })

  it('нечего отмечать — до записи не доходит', async () => {
    st.session = { user: { id: 'c1' } }
    expect(await actions.markMyMessagesReadAction()).toEqual({ data: { marked: 0 } })
    expect(st.updateManyArgs).toBeUndefined()
  })
})
