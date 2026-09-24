import { describe, expect, it } from 'vitest'
import { countNewSessions } from './new-sessions'

const d = (day: number) => new Date(Date.UTC(2026, 8, day, 12))

describe('countNewSessions', () => {
  const links = [
    { clientId: 'a', status: 'ACTIVE', createdAt: d(1), lastSeenAt: d(10) },
    { clientId: 'b', status: 'ACTIVE', createdAt: d(5), lastSeenAt: null },
    { clientId: 'c', status: 'REVOKED', createdAt: d(1), lastSeenAt: null },
  ]
  const sessions = [
    { userId: 'a', completedAt: d(9) }, // до просмотра
    { userId: 'a', completedAt: d(11) },
    { userId: 'a', completedAt: d(12) },
    { userId: 'b', completedAt: d(4) }, // до привязки — не новая для этого психолога
    { userId: 'b', completedAt: d(6) },
    { userId: 'c', completedAt: d(20) },
  ]

  it('после последнего просмотра, а без просмотра — после привязки', () => {
    const got = countNewSessions(links, sessions)
    expect(got.get('a')).toBe(2)
    expect(got.get('b')).toBe(1)
  })

  it('отозванная связь — ноль, даже если сессии есть', () => {
    expect(countNewSessions(links, sessions).get('c') ?? 0).toBe(0)
  })

  it('незавершённые сессии не считаются', () => {
    expect(countNewSessions(links, [{ userId: 'a', completedAt: null }]).get('a') ?? 0).toBe(0)
  })
})
