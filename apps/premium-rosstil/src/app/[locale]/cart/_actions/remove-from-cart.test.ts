import { mockDb, mockGetSession } from '@test-utils/action-test-helpers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок данных ===

const mockPrisma = vi.hoisted(() => ({
  cartItem: { delete: vi.fn() },
}))

// === Моки модулей ===

vi.mock('@/lib/auth', () => mockGetSession())
vi.mock('@/lib/db', () => mockDb(mockPrisma))

// === Импорт тестируемого модуля ===

import { removeFromCart } from './remove-from-cart'

describe('removeFromCart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === Авторизация ===

  it('не авторизован → ошибка', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const result = await removeFromCart('ci-1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('войти в систему')
  })

  // === Успех ===

  it('удаляет элемент корзины', async () => {
    mockPrisma.cartItem.delete.mockResolvedValueOnce({ id: 'ci-1' })

    const result = await removeFromCart('ci-1')

    expect(result.success).toBe(true)
    expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({
      where: { id: 'ci-1' },
    })
  })

  it('успех → revalidatePath /cart', async () => {
    const { revalidatePath } = await import('next/cache')
    mockPrisma.cartItem.delete.mockResolvedValueOnce({ id: 'ci-1' })

    await removeFromCart('ci-1')
    expect(revalidatePath).toHaveBeenCalledWith('/cart')
  })

  it('успех → сообщение', async () => {
    mockPrisma.cartItem.delete.mockResolvedValueOnce({ id: 'ci-1' })

    const result = await removeFromCart('ci-1')
    expect(result.success).toBe(true)
    expect(result.message).toContain('удален')
  })

  // === Ошибки ===

  it('ZenStack access denied → catch', async () => {
    mockPrisma.cartItem.delete.mockRejectedValueOnce(new Error('Access denied'))

    const result = await removeFromCart('ci-1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Не удалось удалить')
  })

  it('элемент не найден → catch', async () => {
    mockPrisma.cartItem.delete.mockRejectedValueOnce(new Error('Record to delete does not exist'))

    const result = await removeFromCart('ci-1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Не удалось удалить')
  })
})
