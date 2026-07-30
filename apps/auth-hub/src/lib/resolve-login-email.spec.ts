import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    userEmail: { findUnique: vi.fn() },
  },
}))

import { prisma } from './prisma'
import { resolveLoginEmail } from './resolve-login-email'

const userFindUnique = vi.mocked(prisma.user.findUnique)
const userEmailFindUnique = vi.mocked(prisma.userEmail.findUnique)

describe('resolveLoginEmail', () => {
  beforeEach(() => {
    userFindUnique.mockReset()
    userEmailFindUnique.mockReset()
  })

  it('возвращает исходный email в нижнем регистре, если он ничей linked-адрес', async () => {
    userFindUnique.mockResolvedValue(null)
    userEmailFindUnique.mockResolvedValue(null)

    const result = await resolveLoginEmail('Unknown@Example.com')

    expect(result).toEqual({ email: 'unknown@example.com', resolved: false })
  })

  it('приоритизирует совпадение с основным email над linked-записью', async () => {
    userFindUnique.mockResolvedValue({ id: 'user-1' } as never)
    userEmailFindUnique.mockResolvedValue({
      verified: true,
      user: { email: 'owner@example.com' },
    } as never)

    const result = await resolveLoginEmail('primary@example.com')

    expect(result).toEqual({ email: 'primary@example.com', resolved: false })
  })

  it('резолвит подтверждённый linked-email в основной email владельца', async () => {
    userFindUnique.mockResolvedValue(null)
    userEmailFindUnique.mockResolvedValue({
      verified: true,
      user: { email: 'owner@example.com' },
    } as never)

    const result = await resolveLoginEmail('linked@example.com')

    expect(result).toEqual({ email: 'owner@example.com', resolved: true })
  })

  it('игнорирует НЕподтверждённый linked-email — не даёт перехватывать чужой вход', async () => {
    userFindUnique.mockResolvedValue(null)
    userEmailFindUnique.mockResolvedValue({
      verified: false,
      user: { email: 'owner@example.com' },
    } as never)

    const result = await resolveLoginEmail('unverified@example.com')

    expect(result).toEqual({ email: 'unverified@example.com', resolved: false })
  })
})
