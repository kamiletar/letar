import { MOCK_SELLER_USER, mockDb, mockGetSession } from '@test-utils/action-test-helpers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  seller: { findUnique: vi.fn() },
  product: { create: vi.fn() },
}))

vi.mock('@/lib/auth', () => mockGetSession(MOCK_SELLER_USER))
vi.mock('@/lib/db', () => mockDb(mockPrisma))

import type { ProductFormData } from '../../../admin/products/_schemas/product-form.schema'
import { createSellerProduct } from './create-seller-product'

function validData(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Футболка Premium',
    description: 'Описание товара',
    gender: 'MALE',
    categoryId: 'cat-1',
    ...overrides,
  } as unknown as ProductFormData
}

describe('createSellerProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('не авторизован → ошибка', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const result = await createSellerProduct(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('права продавца')
  })

  it('роль USER → ошибка', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce({
      session: { id: 'sess-1' } as unknown as Record<string, unknown>,
      user: { ...MOCK_SELLER_USER, role: 'USER' as const },
    })

    const result = await createSellerProduct(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('права продавца')
  })

  it('ADMIN может создавать товары', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce({
      session: { id: 'sess-1' } as unknown as Record<string, unknown>,
      user: { ...MOCK_SELLER_USER, id: 'admin-1', role: 'ADMIN' as const },
    })
    mockPrisma.seller.findUnique.mockResolvedValueOnce({ id: 'seller-1' })

    const result = await createSellerProduct(validData())
    expect(result.success).toBe(true)
  })

  it('профиль продавца не найден → ошибка', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce(null)

    const result = await createSellerProduct(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('не найден')
  })

  it('успех → создаёт товар с sellerId', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce({ id: 'seller-1' })

    const result = await createSellerProduct(validData())

    expect(result.success).toBe(true)
    expect('redirect' in result && result.redirect).toBe('/seller/products')
    expect(mockPrisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Футболка Premium',
        sellerId: 'seller-1',
      }),
    })
  })

  it('дубликат имени (P2002) → ошибка', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce({ id: 'seller-1' })
    mockPrisma.product.create.mockRejectedValueOnce({ code: 'P2002' })

    const result = await createSellerProduct(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('уже существует')
  })

  it('другая ошибка → generic', async () => {
    mockPrisma.seller.findUnique.mockResolvedValueOnce({ id: 'seller-1' })
    mockPrisma.product.create.mockRejectedValueOnce(new Error('DB error'))

    const result = await createSellerProduct(validData())
    expect(result.success).toBe(false)
    expect('error' in result && result.error).toContain('Не удалось создать')
  })
})
