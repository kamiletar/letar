import { describe, expect, it } from 'vitest'

import { formatDateTimeInZone, formatDateTimeMsk } from './date'

/** Выполняет `fn` при заданной зоне процесса и возвращает зону обратно */
function withProcessTz<T>(tz: string, fn: () => T): T {
  const before = process.env.TZ
  process.env.TZ = tz
  try {
    return fn()
  } finally {
    if (before === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = before
    }
  }
}

describe('formatDateTimeInZone', () => {
  const moscow = { timeZone: 'Europe/Moscow', suffix: 'МСК' }

  it('переводит UTC в заданную зону с суффиксом', () => {
    expect(formatDateTimeInZone(new Date('2026-09-21T19:00:00Z'), moscow)).toBe('21.09.2026, 22:00 МСК')
  })

  it('переход через полночь: дата берётся по заданной зоне, а не по UTC', () => {
    expect(formatDateTimeInZone(new Date('2026-09-21T21:30:00Z'), moscow)).toBe('22.09.2026, 00:30 МСК')
  })

  it('без суффикса не добавляет хвост', () => {
    expect(formatDateTimeInZone(new Date('2026-09-21T19:00:00Z'), { timeZone: 'Asia/Yekaterinburg' })).toBe(
      '22.09.2026, 00:00',
    )
  })

  it('принимает ISO-строку', () => {
    expect(formatDateTimeInZone('2026-09-21T19:00:00Z', moscow)).toBe('21.09.2026, 22:00 МСК')
  })

  it('null и undefined дают N/A, как остальные форматтеры дат', () => {
    expect(formatDateTimeInZone(null, moscow)).toBe('N/A')
    expect(formatDateTimeInZone(undefined, moscow)).toBe('N/A')
  })

  it('не зависит от зоны процесса', () => {
    const date = new Date('2026-09-21T19:00:00Z')
    for (const tz of ['America/Los_Angeles', 'UTC', 'Asia/Tokyo']) {
      expect(withProcessTz(tz, () => formatDateTimeInZone(date, moscow))).toBe('21.09.2026, 22:00 МСК')
    }
  })
})

describe('formatDateTimeMsk', () => {
  it('переводит UTC в московское время с суффиксом «МСК»', () => {
    expect(formatDateTimeMsk(new Date('2026-09-21T19:00:00Z'))).toBe('21.09.2026, 22:00 МСК')
  })

  it('переход через полночь: дата берётся по Москве, а не по UTC', () => {
    expect(formatDateTimeMsk(new Date('2026-09-21T21:30:00Z'))).toBe('22.09.2026, 00:30 МСК')
  })

  it('не зависит от зоны процесса', () => {
    expect(withProcessTz('America/Los_Angeles', () => formatDateTimeMsk(new Date('2026-09-21T19:00:00Z')))).toBe(
      '21.09.2026, 22:00 МСК',
    )
  })
})
