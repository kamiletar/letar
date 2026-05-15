import { mockDb, mockGetSession } from '@test-utils/action-test-helpers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок данных ===

const mockPrisma = vi.hoisted(() => ({
  productItem: { findUnique: vi.fn() },
  cart: { findUnique: vi.fn(), create: vi.fn() },
  cartItem: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}))

// === Моки модулей ===

vi.mock('@/lib/auth', () => mockGetSession())
vi.mock('@/lib/db', () => mockDb(mockPrisma))

// === Импорт тестируемого модуля ===

import { addToCart } from './add-to-cart'

// === Хелперы ===

function mockProductItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pi-1',
    availableCount: 10,
    variant: { product: { name: 'Футболка' } },
    size: { name: 'M' },
    ...overrides,
  }
}

function mockCart(overrides: Record<string, unknown> = {}) {
  return { id: 'cart-1', userId: 'user-1', items: [], ...overrides }
}

describe('addToCart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === Авторизация ===

  it('не авторизован → ошибка', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const result = await addToCart('pi-1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('войти в систему')
  })

  // === Валидация ===

  it('quantity < 1 → ошибка', async () => {
    const result = await addToCart('pi-1', 0)
    expect(result.success).toBe(false)
    expect(result.error).toContain('больше 0')
  })

  it('товар не найден → ошибка', async () => {
    mockPrisma.productItem.findUnique.mockResolvedValueOnce(null)

    const result = await addToCart('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Товар не найден')
  })

  // === Проверка наличия ===

  it('недостаточно на складе → ошибка', async () => {
    mockPrisma.productItem.findUnique.mockResolvedValueOnce(mockProductItem({ availableCount: 0 }))

    const result = await addToCart('pi-1', 1)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Недостаточно товара')
  })

  it('запрошено больше, чем на складе → ошибка с доступным количеством', async () => {
    mockPrisma.productItem.findUnique.mockResolvedValueOnce(mockProductItem({ availableCount: 3 }))

    const result = await addToCart('pi-1', 5)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Доступно: 3')
  })

  // === Создание корзины ===

  it('нет корзины → создаёт новую и добавляет товар', async () => {
    mockPrisma.productItem.findUnique.mockResolvedValueOnce(mockProductItem())
    mockPrisma.cart.findUnique.mockResolvedValueOnce(null)
    mockPrisma.cart.create.mockResolvedValueOnce(mockCart())
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce(null)

    const result = await addToCart('pi-1', 2)

    expect(result.success).toBe(true)
    expect(mockPrisma.cart.create).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: 'user-1' } }))
    expect(mockPrisma.cartItem.create).toHaveBeenCalledWith({
      data: { cartId: 'cart-1', productItemId: 'pi-1', quantity: 2 },
    })
  })

  // === Новый товар в существующую корзину ===

  it('корзина существует, новый товар → создаёт CartItem', async () => {
    mockPrisma.productItem.findUnique.mockResolvedValueOnce(mockProductItem())
    mockPrisma.cart.findUnique.mockResolvedValueOnce(mockCart())
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce(null)

    const result = await addToCart('pi-1', 1)

    expect(result.success).toBe(true)
    expect(mockPrisma.cart.create).not.toHaveBeenCalled()
    expect(mockPrisma.cartItem.create).toHaveBeenCalledWith({
      data: { cartId: 'cart-1', productItemId: 'pi-1', quantity: 1 },
    })
  })

  // === Существующий товар ===

  it('товар уже в корзине → увеличивает количество', async () => {
    mockPrisma.productItem.findUnique.mockResolvedValueOnce(mockProductItem())
    mockPrisma.cart.findUnique.mockResolvedValueOnce(mockCart())
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce({
      id: 'ci-1',
      quantity: 2,
    })

    const result = await addToCart('pi-1', 3)

    expect(result.success).toBe(true)
    expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'ci-1' },
      data: { quantity: 5 },
    })
  })

  it('существующий товар + новое quantity > availableCount → ошибка', async () => {
    mockPrisma.productItem.findUnique.mockResolvedValueOnce(mockProductItem({ availableCount: 5 }))
    mockPrisma.cart.findUnique.mockResolvedValueOnce(mockCart())
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce({
      id: 'ci-1',
      quantity: 3,
    })

    const result = await addToCart('pi-1', 4)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Недостаточно товара')
    expect(result.error).toContain('в корзине уже: 3')
  })

  // === Ревалидация ===

  it('успех → revalidatePath вызван', async () => {
    const { revalidatePath } = await import('next/cache')

    mockPrisma.productItem.findUnique.mockResolvedValueOnce(mockProductItem())
    mockPrisma.cart.findUnique.mockResolvedValueOnce(mockCart())
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce(null)

    await addToCart('pi-1')

    expect(revalidatePath).toHaveBeenCalledWith('/cart')
    expect(revalidatePath).toHaveBeenCalledWith('/catalog')
  })

  // === Успех ===

  it('успех → сообщение "Товар добавлен"', async () => {
    mockPrisma.productItem.findUnique.mockResolvedValueOnce(mockProductItem())
    mockPrisma.cart.findUnique.mockResolvedValueOnce(mockCart())
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce(null)

    const result = await addToCart('pi-1')

    expect(result.success).toBe(true)
    expect(result.message).toContain('добавлен')
  })

  it('quantity по умолчанию = 1', async () => {
    mockPrisma.productItem.findUnique.mockResolvedValueOnce(mockProductItem())
    mockPrisma.cart.findUnique.mockResolvedValueOnce(mockCart())
    mockPrisma.cartItem.findUnique.mockResolvedValueOnce(null)

    await addToCart('pi-1')

    expect(mockPrisma.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 1 }) })
    )
  })

  // === Ошибки ===

  it('ошибка БД → catch', async () => {
    mockPrisma.productItem.findUnique.mockRejectedValueOnce(new Error('DB error'))

    const result = await addToCart('pi-1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Не удалось добавить')
  })
})
