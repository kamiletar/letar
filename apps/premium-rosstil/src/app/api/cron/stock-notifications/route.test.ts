import { mockDb } from '@test-utils/action-test-helpers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок next/server ===

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(data),
    }),
  },
}))

// === Мок Prisma ===

const mockPrisma = vi.hoisted(() => ({
  stockNotification: { findMany: vi.fn(), update: vi.fn() },
}))

vi.mock('@/lib/db', () => mockDb(mockPrisma))

vi.mock('@/lib/stock-notifications', () => ({
  sendStockNotificationEmail: vi.fn(() => Promise.resolve()),
  buildProductUrl: vi.fn((id: string) => `https://example.com/catalog/${id}`),
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

function mockNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-1',
    email: 'user@test.ru',
    productItem: {
      variant: {
        color: 'Красный',
        product: { id: 'prod-1', name: 'Футболка' },
      },
      size: { international: 'M' },
    },
    ...overrides,
  }
}

describe('GET /api/cron/stock-notifications', () => {
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
    const response = await GET(createRequest('wrong'))
    expect(response.status).toBe(401)
  })

  // === Нет подписок ===

  it('нет подписок → 200 + sentCount=0', async () => {
    mockPrisma.stockNotification.findMany.mockResolvedValueOnce([])

    const response = await GET(createRequest('test-secret'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.sentCount).toBe(0)
  })

  // === Отправка уведомлений ===

  it('товар в наличии → отправляет email', async () => {
    const { sendStockNotificationEmail } = await import('@/lib/stock-notifications')

    mockPrisma.stockNotification.findMany.mockResolvedValueOnce([mockNotification()])

    await GET(createRequest('test-secret'))

    expect(sendStockNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@test.ru',
        productName: 'Футболка',
        variantColor: 'Красный',
        sizeName: 'M',
      })
    )
  })

  it('после отправки → notified=true', async () => {
    mockPrisma.stockNotification.findMany.mockResolvedValueOnce([mockNotification()])

    await GET(createRequest('test-secret'))

    expect(mockPrisma.stockNotification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: {
        notified: true,
        notifiedAt: expect.any(Date),
      },
    })
  })

  it('несколько уведомлений → sentCount корректен', async () => {
    mockPrisma.stockNotification.findMany.mockResolvedValueOnce([
      mockNotification({ id: 'notif-1' }),
      mockNotification({ id: 'notif-2', email: 'user2@test.ru' }),
    ])

    const response = await GET(createRequest('test-secret'))
    const body = await response.json()

    expect(body.sentCount).toBe(2)
    expect(body.totalFound).toBe(2)
  })

  it('ошибка одного → остальные продолжают', async () => {
    const { sendStockNotificationEmail } = await import('@/lib/stock-notifications')
    vi.mocked(sendStockNotificationEmail)
      .mockRejectedValueOnce(new Error('SMTP error'))
      .mockResolvedValueOnce(undefined)

    mockPrisma.stockNotification.findMany.mockResolvedValueOnce([
      mockNotification({ id: 'notif-1' }),
      mockNotification({ id: 'notif-2', email: 'user2@test.ru' }),
    ])

    const response = await GET(createRequest('test-secret'))
    const body = await response.json()

    expect(body.sentCount).toBe(1)
    expect(body.totalFound).toBe(2)
  })

  // === Глобальная ошибка ===

  it('глобальная ошибка → 500', async () => {
    mockPrisma.stockNotification.findMany.mockRejectedValueOnce(new Error('DB crash'))

    const response = await GET(createRequest('test-secret'))
    expect(response.status).toBe(500)
  })
})
