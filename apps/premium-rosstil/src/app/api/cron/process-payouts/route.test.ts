import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок next/server (для NextResponse.json) ===

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(data),
    }),
  },
}))

// === Мок Prisma с callback-$transaction ===

const mockPrisma = vi.hoisted(() => {
  const prisma: Record<string, unknown> = {
    subOrder: { findMany: vi.fn(), update: vi.fn() },
    sellerBalance: { update: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  }
  return prisma
})

vi.mock('@/lib/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}))

// === Импорт тестируемого модуля ===

import { GET } from './route'

// === Хелперы ===

function createRequest(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret) {
    headers['authorization'] = `Bearer ${secret}`
  }
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as Request
}

describe('GET /api/cron/process-payouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-secret')
  })

  // === Аутентификация ===

  it('нет CRON_SECRET → 401', async () => {
    vi.stubEnv('CRON_SECRET', '')

    const response = await GET(createRequest('test-secret'))
    expect(response.status).toBe(401)
  })

  it('неверный токен → 401', async () => {
    const response = await GET(createRequest('wrong-secret'))
    expect(response.status).toBe(401)
  })

  it('нет заголовка → 401', async () => {
    const response = await GET(createRequest())
    expect(response.status).toBe(401)
  })

  // === Нет данных ===

  it('нет подзаказов для обработки → 200 + processedCount=0', async () => {
    mockPrisma.subOrder.findMany.mockResolvedValueOnce([])

    const response = await GET(createRequest('test-secret'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.processedCount).toBe(0)
  })

  // === Обработка подзаказов ===

  it('обрабатывает expired SubOrders → COMPLETED', async () => {
    mockPrisma.subOrder.findMany.mockResolvedValueOnce([{ id: 'sub-1', sellerId: 'seller-1', sellerAmount: 4500 }])

    const response = await GET(createRequest('test-secret'))
    const body = await response.json()

    expect(body.processedCount).toBe(1)
    expect(mockPrisma.subOrder.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'COMPLETED' },
    })
  })

  it('переносит pending → available в SellerBalance', async () => {
    mockPrisma.subOrder.findMany.mockResolvedValueOnce([{ id: 'sub-1', sellerId: 'seller-1', sellerAmount: 4500 }])

    await GET(createRequest('test-secret'))

    expect(mockPrisma.sellerBalance.update).toHaveBeenCalledWith({
      where: { sellerId: 'seller-1' },
      data: {
        pendingAmount: { decrement: 4500 },
        availableAmount: { increment: 4500 },
      },
    })
  })

  it('несколько SubOrders → $transaction для каждого', async () => {
    mockPrisma.subOrder.findMany.mockResolvedValueOnce([
      { id: 'sub-1', sellerId: 'seller-1', sellerAmount: 4500 },
      { id: 'sub-2', sellerId: 'seller-2', sellerAmount: 3000 },
    ])

    const response = await GET(createRequest('test-secret'))
    const body = await response.json()

    expect(body.processedCount).toBe(2)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2)
  })

  it('ошибка одного SubOrder → остальные продолжают', async () => {
    mockPrisma.subOrder.findMany.mockResolvedValueOnce([
      { id: 'sub-1', sellerId: 'seller-1', sellerAmount: 4500 },
      { id: 'sub-2', sellerId: 'seller-2', sellerAmount: 3000 },
    ])
    // Первый вызов $transaction падает, второй успешен
    mockPrisma.$transaction
      .mockRejectedValueOnce(new Error('DB error'))
      .mockImplementationOnce((fn: (tx: unknown) => unknown) => fn(mockPrisma))

    const response = await GET(createRequest('test-secret'))
    const body = await response.json()

    expect(body.processedCount).toBe(1)
    expect(body.totalFound).toBe(2)
  })

  // === Глобальная ошибка ===

  it('глобальная ошибка → 500', async () => {
    mockPrisma.subOrder.findMany.mockRejectedValueOnce(new Error('DB crash'))

    const response = await GET(createRequest('test-secret'))
    expect(response.status).toBe(500)
  })
})
