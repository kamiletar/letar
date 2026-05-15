import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок данных ===

const mockPrisma = vi.hoisted(() => ({
  subOrder: { findUnique: vi.fn() },
  return: { findFirst: vi.fn(), create: vi.fn() },
}))

// === Моки модулей ===

vi.mock('@/lib/auth', async () => {
  const { mockRequireAuth } = await import('@test-utils/action-test-helpers')
  return mockRequireAuth()
})
vi.mock('@/lib/db', async () => {
  const { mockDb } = await import('@test-utils/action-test-helpers')
  return mockDb(mockPrisma)
})

// === Импорт тестируемого модуля ===

import { createReturn } from './create-return'

// === Хелперы ===

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    subOrderId: 'sub-1',
    reason: 'Товар не подошёл по размеру',
    description: 'Подробное описание',
    images: [],
    ...overrides,
  }
}

function mockSubOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    status: 'DELIVERED',
    order: { userId: 'user-1', orderNumber: 'ORD-20260303-00001' },
    ...overrides,
  }
}

describe('createReturn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === Авторизация ===

  it('не авторизован → throws', async () => {
    const { requireAuth } = await import('@/lib/auth')
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authenticated'))

    await expect(createReturn(validInput())).rejects.toThrow()
  })

  // === Валидация ===

  it('невалидные данные → ошибка', async () => {
    const result = await createReturn({ subOrderId: '' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Некорректные данные')
  })

  it('причина < 5 символов → ошибка', async () => {
    const result = await createReturn(validInput({ reason: 'abc' }))
    expect(result.success).toBe(false)
  })

  // === Проверки ===

  it('подзаказ не найден → ошибка', async () => {
    mockPrisma.subOrder.findUnique.mockResolvedValueOnce(null)

    const result = await createReturn(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('не найден')
  })

  it('чужой подзаказ → ошибка', async () => {
    mockPrisma.subOrder.findUnique.mockResolvedValueOnce(
      mockSubOrder({ order: { userId: 'other-user', orderNumber: 'ORD-1' } })
    )

    const result = await createReturn(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('не принадлежит вам')
  })

  it('не DELIVERED → ошибка', async () => {
    mockPrisma.subOrder.findUnique.mockResolvedValueOnce(mockSubOrder({ status: 'PAID' }))

    const result = await createReturn(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('только для доставленных')
  })

  it('активный возврат уже есть → ошибка', async () => {
    mockPrisma.subOrder.findUnique.mockResolvedValueOnce(mockSubOrder())
    mockPrisma.return.findFirst.mockResolvedValueOnce({ id: 'ret-existing' })

    const result = await createReturn(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('уже есть активный')
  })

  // === Успех ===

  it('успех → создаёт возврат', async () => {
    mockPrisma.subOrder.findUnique.mockResolvedValueOnce(mockSubOrder())
    mockPrisma.return.findFirst.mockResolvedValueOnce(null)

    const result = await createReturn(validInput())

    expect(result.success).toBe(true)
    expect(mockPrisma.return.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subOrderId: 'sub-1',
        reason: 'Товар не подошёл по размеру',
        description: 'Подробное описание',
      }),
    })
  })

  it('без description → null', async () => {
    mockPrisma.subOrder.findUnique.mockResolvedValueOnce(mockSubOrder())
    mockPrisma.return.findFirst.mockResolvedValueOnce(null)

    await createReturn(validInput({ description: undefined }))

    expect(mockPrisma.return.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ description: null }),
    })
  })

  it('без images → пустой массив', async () => {
    mockPrisma.subOrder.findUnique.mockResolvedValueOnce(mockSubOrder())
    mockPrisma.return.findFirst.mockResolvedValueOnce(null)

    await createReturn(validInput({ images: undefined }))

    expect(mockPrisma.return.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ images: [] }),
    })
  })

  it('успех → revalidatePath', async () => {
    const { revalidatePath } = await import('next/cache')

    mockPrisma.subOrder.findUnique.mockResolvedValueOnce(mockSubOrder())
    mockPrisma.return.findFirst.mockResolvedValueOnce(null)

    await createReturn(validInput())

    expect(revalidatePath).toHaveBeenCalledWith('/profile/orders/ORD-20260303-00001')
  })

  // === Ошибки ===

  it('ошибка create → catch', async () => {
    mockPrisma.subOrder.findUnique.mockResolvedValueOnce(mockSubOrder())
    mockPrisma.return.findFirst.mockResolvedValueOnce(null)
    mockPrisma.return.create.mockRejectedValueOnce(new Error('DB error'))

    const result = await createReturn(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('Не удалось создать')
  })
})
