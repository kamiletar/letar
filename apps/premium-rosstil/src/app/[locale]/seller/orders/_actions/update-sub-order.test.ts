import { MOCK_SELLER_USER, mockDb, mockGetSession } from '@test-utils/action-test-helpers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  subOrder: { update: vi.fn() },
}))

vi.mock('@/lib/auth', () => mockGetSession(MOCK_SELLER_USER))
vi.mock('@/lib/db', () => mockDb(mockPrisma))

import { markSubOrderShipped } from './update-sub-order'

describe('markSubOrderShipped', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('не авторизован → ошибка', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const result = await markSubOrderShipped('sub-1', { trackingNumber: 'TRK-123' })
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('права продавца')
  })

  it('роль USER → ошибка', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce({
      session: { id: 'sess-1' } as unknown as Record<string, unknown>,
      user: { ...MOCK_SELLER_USER, role: 'USER' as const },
    })

    const result = await markSubOrderShipped('sub-1', { trackingNumber: 'TRK-123' })
    expect(result.success).toBe(false)
  })

  it('пустой trackingNumber → ошибка', async () => {
    const result = await markSubOrderShipped('sub-1', { trackingNumber: '' })
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('трекинг')
  })

  it('успех → обновляет SubOrder', async () => {
    const result = await markSubOrderShipped('sub-1', { trackingNumber: 'TRK-123' })

    expect(result.success).toBe(true)
    expect(mockPrisma.subOrder.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: expect.objectContaining({
        trackingNumber: 'TRK-123',
        status: 'SHIPPED',
        shippedAt: expect.any(Date),
      }),
    })
  })

  it('ADMIN может обновлять', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce({
      session: { id: 'sess-1' } as unknown as Record<string, unknown>,
      user: { ...MOCK_SELLER_USER, id: 'admin-1', role: 'ADMIN' as const },
    })

    const result = await markSubOrderShipped('sub-1', { trackingNumber: 'TRK-456' })
    expect(result.success).toBe(true)
  })

  it('ошибка ZenStack (чужой подзаказ) → catch', async () => {
    mockPrisma.subOrder.update.mockRejectedValueOnce(new Error('Access denied'))

    const result = await markSubOrderShipped('sub-1', { trackingNumber: 'TRK-123' })
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('Не удалось обновить')
  })
})
