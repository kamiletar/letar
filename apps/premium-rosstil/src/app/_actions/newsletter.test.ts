import { mockDb, mockGetSession } from '@test-utils/action-test-helpers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  newsletterSubscriber: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => mockGetSession())
vi.mock('@/lib/db', () => mockDb(mockPrisma))

import { subscribeToNewsletter, unsubscribeFromNewsletter } from './newsletter'

describe('newsletter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === subscribeToNewsletter ===

  describe('subscribeToNewsletter', () => {
    it('невалидный email → ошибка', async () => {
      const result = await subscribeToNewsletter({ email: 'not-email' })
      expect(result.success).toBe(false)
    })

    it('пустой email → ошибка', async () => {
      const result = await subscribeToNewsletter({ email: '' })
      expect(result.success).toBe(false)
    })

    it('уже подписан (active) → ошибка', async () => {
      mockPrisma.newsletterSubscriber.findUnique.mockResolvedValueOnce({
        id: 'sub-1',
        isActive: true,
      })

      const result = await subscribeToNewsletter({ email: 'test@test.ru' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('уже подписаны')
    })

    it('ранее отписан → реактивация', async () => {
      mockPrisma.newsletterSubscriber.findUnique.mockResolvedValueOnce({
        id: 'sub-1',
        isActive: false,
      })

      const result = await subscribeToNewsletter({ email: 'test@test.ru' })

      expect(result.success).toBe(true)
      expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { isActive: true, unsubscribedAt: null },
      })
    })

    it('новая подписка → создаёт с userId', async () => {
      mockPrisma.newsletterSubscriber.findUnique.mockResolvedValueOnce(null)

      const result = await subscribeToNewsletter({ email: 'test@test.ru' })

      expect(result.success).toBe(true)
      expect(mockPrisma.newsletterSubscriber.create).toHaveBeenCalledWith({
        data: {
          email: 'test@test.ru',
          userId: 'user-1',
        },
      })
    })

    it('не авторизован → создаёт без userId', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      mockPrisma.newsletterSubscriber.findUnique.mockResolvedValueOnce(null)

      const result = await subscribeToNewsletter({ email: 'guest@test.ru' })

      expect(result.success).toBe(true)
      expect(mockPrisma.newsletterSubscriber.create).toHaveBeenCalledWith({
        data: {
          email: 'guest@test.ru',
          userId: null,
        },
      })
    })
  })

  // === unsubscribeFromNewsletter ===

  describe('unsubscribeFromNewsletter', () => {
    it('токен не найден → ошибка', async () => {
      mockPrisma.newsletterSubscriber.findUnique.mockResolvedValueOnce(null)

      const result = await unsubscribeFromNewsletter('invalid-token')
      expect(result.success).toBe(false)
      expect(result.error).toContain('не найдена')
    })

    it('уже отписан → успех (идемпотентно)', async () => {
      mockPrisma.newsletterSubscriber.findUnique.mockResolvedValueOnce({
        id: 'sub-1',
        isActive: false,
      })

      const result = await unsubscribeFromNewsletter('valid-token')
      expect(result.success).toBe(true)
      expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled()
    })

    it('активная подписка → отписывает', async () => {
      mockPrisma.newsletterSubscriber.findUnique.mockResolvedValueOnce({
        id: 'sub-1',
        isActive: true,
      })

      const result = await unsubscribeFromNewsletter('valid-token')

      expect(result.success).toBe(true)
      expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: {
          isActive: false,
          unsubscribedAt: expect.any(Date),
        },
      })
    })

    it('ищет по unsubToken', async () => {
      mockPrisma.newsletterSubscriber.findUnique.mockResolvedValueOnce(null)

      await unsubscribeFromNewsletter('my-token')

      expect(mockPrisma.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
        where: { unsubToken: 'my-token' },
      })
    })
  })
})
