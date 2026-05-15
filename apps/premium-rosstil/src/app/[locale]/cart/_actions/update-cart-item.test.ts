import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок данных ===

const mockPrisma = vi.hoisted(() => ({
  cartItem: { findUnique: vi.fn(), update: vi.fn() },
}))

// === Моки модулей ===

vi.mock('@/lib/auth', async () => {
  const { mockGetSession } = await import('@test-utils/action-test-helpers')
  return mockGetSession()
})
vi.mock('@/lib/db', async () => {
  const { mockDb } = await import('@test-utils/action-test-helpers')
  return mockDb(mockPrisma)
})

// === Импорт тестируемого модуля ===

import { updateCartItem } from './update-cart-item'

describe('updateCartItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === Авторизация ===

  it('не авторизован → ошибка', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const result = await updateCartItem('ci-1', 2)
    expect(result.success).toBe(false)
    expect(result.error).toContain('войти в систему')
  })

  // === Валидация ===

  it('quantity < 1 → ошибка', async () => {
    const result = await updateCartItem('ci-1', 0)
    expect(result.success).toBe(false)
    expect(result.error).toContain('больше 0')
  })

  it('элемент не найден → ошибка', async () => {
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce(null)

    const result = await updateCartItem('nonexistent', 1)
    expect(result.success).toBe(false)
    expect(result.error).toContain('не найден')
  })

  // === Проверка наличия ===

  it('недостаточно на складе → ошибка', async () => {
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce({
      id: 'ci-1',
      productItem: { availableCount: 3 },
    })

    const result = await updateCartItem('ci-1', 5)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Недостаточно товара')
    expect(result.error).toContain('Доступно: 3')
  })

  // === Успех ===

  it('успех → обновляет quantity', async () => {
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce({
      id: 'ci-1',
      productItem: { availableCount: 10 },
    })

    const result = await updateCartItem('ci-1', 4)

    expect(result.success).toBe(true)
    expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'ci-1' },
      data: { quantity: 4 },
    })
  })

  it('успех → revalidatePath /cart', async () => {
    const { revalidatePath } = await import('next/cache')

    mockPrisma.cartItem.findUnique.mockResolvedValueOnce({
      id: 'ci-1',
      productItem: { availableCount: 10 },
    })

    await updateCartItem('ci-1', 2)
    expect(revalidatePath).toHaveBeenCalledWith('/cart')
  })

  it('успех → сообщение', async () => {
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce({
      id: 'ci-1',
      productItem: { availableCount: 10 },
    })

    const result = await updateCartItem('ci-1', 1)
    expect(result.success).toBe(true)
    expect(result.message).toContain('обновлено')
  })

  // === Ошибки ===

  it('ошибка БД → catch', async () => {
    mockPrisma.cartItem.findUnique.mockRejectedValueOnce(new Error('DB error'))

    const result = await updateCartItem('ci-1', 1)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Не удалось обновить')
  })
})
