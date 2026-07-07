import { describe, expect, it } from 'vitest'
import { calculateXp, countUniqueUtcDays, getRankByXp } from './ranks'

describe('countUniqueUtcDays (этап 5.9.3, гибрид)', () => {
  it('пустой список — 0 дней', () => {
    expect(countUniqueUtcDays([])).toBe(0)
  })

  it('несколько сессий в один UTC-день считаются одним днём', () => {
    const dates = [
      new Date('2026-07-07T08:00:00Z'),
      new Date('2026-07-07T12:30:00Z'),
      new Date('2026-07-07T21:45:00Z'),
      new Date('2026-07-07T21:46:00Z'),
      new Date('2026-07-07T23:59:59Z'),
    ]
    expect(countUniqueUtcDays(dates)).toBe(1)
  })

  it('сессии в разные дни считаются раздельно', () => {
    const dates = [new Date('2026-07-05T10:00:00Z'), new Date('2026-07-06T10:00:00Z'), new Date('2026-07-07T10:00:00Z')]
    expect(countUniqueUtcDays(dates)).toBe(3)
  })

  it('граница UTC-суток разделяет дни', () => {
    const dates = [new Date('2026-07-07T23:59:59Z'), new Date('2026-07-08T00:00:01Z')]
    expect(countUniqueUtcDays(dates)).toBe(2)
  })

  it('смесь: 2 дня по несколько сессий = 2', () => {
    const dates = [
      new Date('2026-07-07T08:00:00Z'),
      new Date('2026-07-07T20:00:00Z'),
      new Date('2026-07-09T08:00:00Z'),
      new Date('2026-07-09T09:00:00Z'),
    ]
    expect(countUniqueUtcDays(dates)).toBe(2)
  })
})

describe('calculateXp (этап 5.9.3: XP за уникальные дни, не за сессии)', () => {
  it('формула: дни × 100 + XP ачивок', () => {
    expect(calculateXp(3, 50)).toBe(350)
    expect(calculateXp(0, 0)).toBe(0)
    expect(calculateXp(1, 200)).toBe(300)
  })

  it('анти-ферма: 5 порций в один день дают 100 XP, а не 500', () => {
    const fiveSameDay = [
      new Date('2026-07-07T08:00:00Z'),
      new Date('2026-07-07T10:00:00Z'),
      new Date('2026-07-07T12:00:00Z'),
      new Date('2026-07-07T14:00:00Z'),
      new Date('2026-07-07T16:00:00Z'),
    ]
    expect(calculateXp(countUniqueUtcDays(fiveSameDay), 0)).toBe(100)
  })

  it('спейсинг: та же активность в 5 разных дней даёт 500 XP', () => {
    const fiveDays = [
      new Date('2026-07-01T08:00:00Z'),
      new Date('2026-07-03T10:00:00Z'),
      new Date('2026-07-05T12:00:00Z'),
      new Date('2026-07-07T14:00:00Z'),
      new Date('2026-07-09T16:00:00Z'),
    ]
    expect(calculateXp(countUniqueUtcDays(fiveDays), 0)).toBe(500)
  })
})

describe('getRankByXp — интеграция с дневной грануляцией', () => {
  it('первый день (100 XP) поднимает с Новичок I до Новичок II', () => {
    expect(getRankByXp(0).code).toBe('NOVICE_I')
    expect(getRankByXp(100).code).toBe('NOVICE_II')
  })
})
