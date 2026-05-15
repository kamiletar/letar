import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  sellerApplication: { findFirst: vi.fn(), create: vi.fn() },
  seller: { findUnique: vi.fn() },
}))

vi.mock('@/lib/auth', async () => {
  const { mockGetSession } = await import('@test-utils/action-test-helpers')
  return mockGetSession()
})
vi.mock('@/lib/db', async () => {
  const { mockDb } = await import('@test-utils/action-test-helpers')
  return mockDb(mockPrisma)
})

import type { SellerApplicationFormData } from '../_schemas/seller-application.schema'
import { submitSellerApplication } from './submit-application'

function validData(overrides: Record<string, unknown> = {}) {
  return {
    shopName: 'Мой Магазин',
    description: 'Описание',
    contactEmail: 'shop@test.ru',
    contactPhone: '+79001234567',
    agreementAccepted: true as const,
    ...overrides,
  } as unknown as SellerApplicationFormData
}

describe('submitSellerApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.sellerApplication.findFirst.mockResolvedValue(null)
    mockPrisma.seller.findUnique.mockResolvedValue(null)
  })

  it('не авторизован → ошибка', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const result = await submitSellerApplication(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('войти в систему')
  })

  it('невалидные данные → ошибка', async () => {
    const result = await submitSellerApplication({ shopName: '' } as unknown as SellerApplicationFormData)
    expect(result.success).toBe(false)
  })

  it('PENDING заявка уже есть → ошибка', async () => {
    mockPrisma.sellerApplication.findFirst.mockResolvedValueOnce({
      id: 'app-1',
      status: 'PENDING',
    })

    const result = await submitSellerApplication(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('уже есть заявка')
  })

  it('APPROVED заявка уже есть → ошибка', async () => {
    mockPrisma.sellerApplication.findFirst.mockResolvedValueOnce({
      id: 'app-1',
      status: 'APPROVED',
    })

    const result = await submitSellerApplication(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('уже одобрена')
  })

  it('уже продавец → ошибка', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce({ id: 'seller-1' })

    const result = await submitSellerApplication(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('уже являетесь продавцом')
  })

  it('успех → создаёт заявку', async () => {
    const result = await submitSellerApplication(validData())

    expect(result.success).toBe(true)
    expect(mockPrisma.sellerApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        shopName: 'Мой Магазин',
        contactEmail: 'shop@test.ru',
      }),
    })
  })

  it('опциональные поля → null', async () => {
    await submitSellerApplication(validData({ description: undefined, inn: undefined }))

    expect(mockPrisma.sellerApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: null,
        inn: null,
      }),
    })
  })

  it('успех → revalidatePath', async () => {
    const { revalidatePath } = await import('next/cache')
    await submitSellerApplication(validData())
    expect(revalidatePath).toHaveBeenCalledWith('/become-seller')
  })

  it('ошибка create → catch', async () => {
    mockPrisma.sellerApplication.create.mockRejectedValueOnce(new Error('DB error'))

    const result = await submitSellerApplication(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('Не удалось отправить')
  })
})
