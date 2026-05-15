/**
 * Тесты для схем приглашений учеников
 *
 * TDD: сначала тесты, потом реализация
 */
// globals: true — describe, expect, it доступны глобально

import {
  calculateExpirationDate,
  CreateInviteByEmailSchema,
  INVITATION_EXPIRY_DAYS,
  InvitationStatusSchema,
  InviteTokenSchema,
  isInvitationExpired,
} from '../invite.schema'

describe('CreateInviteByEmailSchema', () => {
  describe('валидация email', () => {
    it('должен принимать корректный email', () => {
      const result = CreateInviteByEmailSchema.safeParse({
        email: 'student@example.com',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('student@example.com')
      }
    })

    it('должен принимать email с поддоменом', () => {
      const result = CreateInviteByEmailSchema.safeParse({
        email: 'student@mail.example.com',
      })

      expect(result.success).toBe(true)
    })

    it('должен принимать пустой email (для ссылки-приглашения)', () => {
      // Пустой email разрешён — создаётся ссылка-приглашение без email
      const result = CreateInviteByEmailSchema.safeParse({
        email: '',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('')
      }
    })

    it('должен отклонять email без @', () => {
      const result = CreateInviteByEmailSchema.safeParse({
        email: 'studentexample.com',
      })

      expect(result.success).toBe(false)
    })

    it('должен отклонять email без домена', () => {
      const result = CreateInviteByEmailSchema.safeParse({
        email: 'student@',
      })

      expect(result.success).toBe(false)
    })

    it('должен отклонять email без имени пользователя', () => {
      const result = CreateInviteByEmailSchema.safeParse({
        email: '@example.com',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('strip лишних полей', () => {
    it('должен удалять лишние поля', () => {
      const result = CreateInviteByEmailSchema.safeParse({
        email: 'student@example.com',
        malicious: 'data',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('malicious')
      }
    })
  })
})

describe('InviteTokenSchema', () => {
  describe('валидация токена', () => {
    it('должен принимать корректный токен (cuid)', () => {
      const result = InviteTokenSchema.safeParse({
        token: 'clp1234567890abcdef',
      })

      expect(result.success).toBe(true)
    })

    it('должен принимать токен с дефисами и подчёркиваниями', () => {
      const result = InviteTokenSchema.safeParse({
        token: 'abc-123_DEF',
      })

      expect(result.success).toBe(true)
    })

    it('должен отклонять пустой токен', () => {
      const result = InviteTokenSchema.safeParse({
        token: '',
      })

      expect(result.success).toBe(false)
    })

    it('должен отклонять токен со спецсимволами', () => {
      const result = InviteTokenSchema.safeParse({
        token: 'abc!@#$%',
      })

      expect(result.success).toBe(false)
    })

    it('должен отклонять токен с пробелами', () => {
      const result = InviteTokenSchema.safeParse({
        token: 'abc 123',
      })

      expect(result.success).toBe(false)
    })
  })
})

describe('InvitationStatus validation', () => {
  it('должен принимать статус PENDING', () => {
    const result = InvitationStatusSchema.safeParse('PENDING')
    expect(result.success).toBe(true)
  })

  it('должен принимать статус ACCEPTED', () => {
    const result = InvitationStatusSchema.safeParse('ACCEPTED')
    expect(result.success).toBe(true)
  })

  it('должен принимать статус EXPIRED', () => {
    const result = InvitationStatusSchema.safeParse('EXPIRED')
    expect(result.success).toBe(true)
  })

  it('должен принимать статус DECLINED', () => {
    const result = InvitationStatusSchema.safeParse('DECLINED')
    expect(result.success).toBe(true)
  })

  it('должен отклонять невалидный статус', () => {
    const result = InvitationStatusSchema.safeParse('INVALID')
    expect(result.success).toBe(false)
  })
})

describe('Invitation expiration logic', () => {
  describe('INVITATION_EXPIRY_DAYS', () => {
    it('должен быть равен 7 дням', () => {
      expect(INVITATION_EXPIRY_DAYS).toBe(7)
    })
  })

  describe('calculateExpirationDate', () => {
    it('должен возвращать дату через 7 дней', () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z')
      const expiresAt = calculateExpirationDate(createdAt)

      expect(expiresAt.toISOString()).toBe('2024-01-08T00:00:00.000Z')
    })

    it('должен использовать текущую дату по умолчанию', () => {
      const before = new Date()
      const expiresAt = calculateExpirationDate()
      const after = new Date()

      // expiresAt должна быть между before+7 и after+7
      const expectedMin = new Date(before)
      expectedMin.setDate(expectedMin.getDate() + 7)

      const expectedMax = new Date(after)
      expectedMax.setDate(expectedMax.getDate() + 7)

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime())
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime())
    })
  })

  describe('isInvitationExpired', () => {
    it('должен возвращать false в пределах 7 дней', () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z')
      const expiresAt = calculateExpirationDate(createdAt)
      const now = new Date('2024-01-07T00:00:00.000Z') // 6 дней спустя

      expect(isInvitationExpired(expiresAt, now)).toBe(false)
    })

    it('должен возвращать true после 7 дней', () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z')
      const expiresAt = calculateExpirationDate(createdAt)
      const now = new Date('2024-01-09T00:00:00.000Z') // 8 дней спустя

      expect(isInvitationExpired(expiresAt, now)).toBe(true)
    })

    it('должен возвращать false в момент создания', () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z')
      const expiresAt = calculateExpirationDate(createdAt)
      const now = new Date('2024-01-01T00:00:00.000Z')

      expect(isInvitationExpired(expiresAt, now)).toBe(false)
    })

    it('должен возвращать true ровно на границе + 1 мс', () => {
      const expiresAt = new Date('2024-01-08T00:00:00.000Z')
      const now = new Date('2024-01-08T00:00:00.001Z')

      expect(isInvitationExpired(expiresAt, now)).toBe(true)
    })

    it('должен возвращать false ровно на границе', () => {
      const expiresAt = new Date('2024-01-08T00:00:00.000Z')
      const now = new Date('2024-01-08T00:00:00.000Z')

      expect(isInvitationExpired(expiresAt, now)).toBe(false)
    })
  })
})
