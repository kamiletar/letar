import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * getMyLinkedPsychologistsAction: политика User разрешает читать только себя, поэтому
 * психолог внутри include у клиента приходит null (ZenStack режет JOIN, не бросает) —
 * `.claude/docs/zenstack-required-relation-nested-select-null.md`. Найдено E2E кабинета:
 * страница настроек клиента падала сразу после привязки психолога.
 */

const st = vi.hoisted(() => ({
  session: { user: { id: 'client1' } } as null | { user: { id: string } },
  rawUserQuery: undefined as unknown,
}))

vi.mock('@/lib/auth', () => ({
  getSession: async () => st.session,
  getDbUser: async () => ({ id: 'client1' }),
}))
vi.mock('@/lib/db', () => ({
  // Enhanced-клиент ведёт себя как под политикой: связи свои, психолог в include — null
  getEnhancedPrisma: () => ({
    clientPsychologistLink: {
      findMany: async () => [
        { id: 'l1', clientId: 'client1', psychologistId: 'psy1', status: 'ACTIVE', psychologist: null },
        { id: 'l2', clientId: 'client1', psychologistId: 'psy2', status: 'REVOKED', psychologist: null },
      ],
    },
  }),
  prisma: {
    user: {
      findMany: async (args: unknown) => {
        st.rawUserQuery = args
        return [
          { id: 'psy1', name: 'Анна', email: 'anna@example.test', image: null },
          { id: 'psy2', name: null, email: 'boris@example.test', image: null },
        ]
      },
    },
  },
}))

const { getMyLinkedPsychologistsAction } = await import('./psychologist.action')

beforeEach(() => {
  st.session = { user: { id: 'client1' } }
  st.rawUserQuery = undefined
})

describe('getMyLinkedPsychologistsAction', () => {
  it('психолог в каждой связи заполнен, даже когда политика User скрывает его строку', async () => {
    const { data } = await getMyLinkedPsychologistsAction()
    expect(data.map((l) => l.psychologist)).toEqual([
      { id: 'psy1', name: 'Анна', email: 'anna@example.test', image: null },
      { id: 'psy2', name: null, email: 'boris@example.test', image: null },
    ])
  })

  it('дочитываются только психологи своих связей и только публичные поля', async () => {
    await getMyLinkedPsychologistsAction()
    expect(st.rawUserQuery).toEqual({
      where: { id: { in: ['psy1', 'psy2'] } },
      select: { id: true, name: true, email: true, image: true },
    })
  })

  it('гость — пустой список без обращения к БД', async () => {
    st.session = null
    expect(await getMyLinkedPsychologistsAction()).toEqual({ data: [] })
    expect(st.rawUserQuery).toBeUndefined()
  })
})
