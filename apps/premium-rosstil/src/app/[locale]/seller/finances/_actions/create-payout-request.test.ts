import { MOCK_SELLER_USER, mockDb, mockGetSession } from '@test-utils/action-test-helpers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  seller: { findUnique: vi.fn() },
  payoutRequest: { create: vi.fn() },
}))

vi.mock('@/lib/auth', () => mockGetSession(MOCK_SELLER_USER))
vi.mock('@/lib/db', () => mockDb(mockPrisma))

import type { PayoutRequestFormData } from '../_schemas/payout-request.schema'
import { createPayoutRequest } from './create-payout-request'

function validData(overrides: Record<string, unknown> = {}) {
  return {
    requestedAmount: 5000,
    ...overrides,
  } as unknown as PayoutRequestFormData
}

function mockSeller(overrides: Record<string, unknown> = {}) {
  return {
    id: 'seller-1',
    balance: { availableAmount: 10000 },
    ...overrides,
  }
}

describe('createPayoutRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('не авторизован → ошибка', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const result = await createPayoutRequest(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('права продавца')
  })

  it('роль USER → ошибка', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce({
      session: { id: 'sess-1' } as unknown as Record<string, unknown>,
      user: { ...MOCK_SELLER_USER, role: 'USER' as const },
    })

    const result = await createPayoutRequest(validData())
    expect(result.success).toBe(false)
  })

  it('профиль не найден → ошибка', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce(null)

    const result = await createPayoutRequest(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('не найден')
  })

  it('недостаточно средств → ошибка', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce(mockSeller({ balance: { availableAmount: 3000 } }))

    const result = await createPayoutRequest(validData({ requestedAmount: 5000 }))
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('Недостаточно средств')
    expect('error' in result && result.error).toContain('3000')
  })

  it('успех без чека → DRAFT', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce(mockSeller())

    const result = await createPayoutRequest(validData())

    expect(result.success).toBe(true)
    expect(mockPrisma.payoutRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sellerId: 'seller-1',
        status: 'DRAFT',
      }),
    })
  })

  it('с receiptNumber → PENDING_REVIEW', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce(mockSeller())

    const result = await createPayoutRequest(validData({ receiptNumber: 'RC-001' }))

    expect(result.success).toBe(true)
    expect(mockPrisma.payoutRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'PENDING_REVIEW',
        receiptNumber: 'RC-001',
      }),
    })
  })

  it('с receiptImageIds → PENDING_REVIEW', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce(mockSeller())

    const result = await createPayoutRequest(validData({ receiptImageIds: ['img-1'] }))

    expect(result.success).toBe(true)
    expect(mockPrisma.payoutRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'PENDING_REVIEW' }),
    })
  })

  it('баланс null → availableAmount = 0', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce(mockSeller({ balance: null }))

    const result = await createPayoutRequest(validData({ requestedAmount: 100 }))
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('Недостаточно средств')
  })

  it('ошибка create → catch', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce(mockSeller())
    mockPrisma.payoutRequest.create.mockRejectedValueOnce(new Error('DB error'))

    const result = await createPayoutRequest(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('Не удалось создать')
  })
})
