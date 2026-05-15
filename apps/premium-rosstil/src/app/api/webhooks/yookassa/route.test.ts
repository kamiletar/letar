import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок next/server ===
// vitest.setup.tsx заменяет global.Response на MockResponse (без полного Fetch API),
// поэтому мокаем NextResponse.json напрямую: json() возвращает уже распарсенные данные.

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(data),
      headers: { get: () => 'application/json' },
    }),
  },
}))

// === Мок Prisma с callback-$transaction ===

const mockPrisma = vi.hoisted(() => {
  const prisma: Record<string, unknown> = {
    payment: { findUnique: vi.fn(), update: vi.fn() },
    order: { update: vi.fn() },
    subOrder: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    orderItem: { findMany: vi.fn() },
    productItem: { update: vi.fn() },
    sellerBalance: { upsert: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  }
  return prisma
})

vi.mock('@/lib/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}))

vi.mock('@/lib/yookassa', () => ({
  isYooKassaIp: vi.fn(() => true),
}))

vi.mock('@/lib/seller-notifications', () => ({
  sendSellerSubOrderEmail: vi.fn(() => Promise.resolve()),
  sendSellerSubOrderTelegram: vi.fn(() => Promise.resolve()),
}))

// === Импорт тестируемого модуля ===

import { POST } from './route'

// === Хелпер для создания Request ===
// global.Request = MockRequest из setup.tsx (нет json()/text() методов).
// Создаём объект вручную с нужными методами.

function createRequest(body: unknown, headers: Record<string, string> = {}) {
  const allHeaders: Record<string, string> = {
    'content-type': 'application/json',
    ...headers,
  }
  return {
    method: 'POST',
    url: 'http://localhost/api/webhooks/yookassa',
    headers: {
      get: (name: string) => allHeaders[name.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(body),
  } as unknown as Request
}

function createBadJsonRequest() {
  return {
    method: 'POST',
    url: 'http://localhost/api/webhooks/yookassa',
    headers: {
      get: (name: string) => (name === 'content-type' ? 'application/json' : null),
    },
    json: () => Promise.reject(new SyntaxError('Unexpected token')),
  } as unknown as Request
}

function paymentSucceededNotification(paymentId = 'yoo-pay-1') {
  return {
    type: 'notification',
    event: 'payment.succeeded',
    object: {
      id: paymentId,
      status: 'succeeded',
      amount: { value: '5000.00', currency: 'RUB' },
      paid: true,
      created_at: '2026-03-03',
    },
  }
}

function paymentCanceledNotification(paymentId = 'yoo-pay-1') {
  return {
    type: 'notification',
    event: 'payment.canceled',
    object: {
      id: paymentId,
      status: 'canceled',
      amount: { value: '5000.00', currency: 'RUB' },
      paid: false,
      created_at: '2026-03-03',
      cancellation_details: { party: 'yoo_money', reason: 'expired_on_confirmation' },
    },
  }
}

function refundSucceededNotification(paymentId = 'yoo-pay-1', amount = '5000.00') {
  return {
    type: 'notification',
    event: 'refund.succeeded',
    object: {
      id: 'yoo-ref-1',
      status: 'succeeded',
      payment_id: paymentId,
      amount: { value: amount, currency: 'RUB' },
      created_at: '2026-03-03',
    },
  }
}

describe('POST /api/webhooks/yookassa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === Безопасность ===

  describe('безопасность', () => {
    it('запрещённый IP → 403', async () => {
      const { isYooKassaIp } = await import('@/lib/yookassa')
      vi.mocked(isYooKassaIp).mockReturnValueOnce(false)

      const response = await POST(createRequest(paymentSucceededNotification()))
      expect(response.status).toBe(403)

      const body = await response.json()
      expect(body.error).toBe('Forbidden')
    })

    it('x-forwarded-for передаётся в isYooKassaIp', async () => {
      const { isYooKassaIp } = await import('@/lib/yookassa')

      await POST(
        createRequest(paymentSucceededNotification(), {
          'x-forwarded-for': '185.71.76.1, 10.0.0.1',
        })
      )

      expect(isYooKassaIp).toHaveBeenCalledWith('185.71.76.1')
    })

    it('x-real-ip как fallback', async () => {
      const { isYooKassaIp } = await import('@/lib/yookassa')

      await POST(
        createRequest(paymentSucceededNotification(), {
          'x-real-ip': '77.75.153.1',
        })
      )

      expect(isYooKassaIp).toHaveBeenCalledWith('77.75.153.1')
    })

    it('невалидный JSON → 400', async () => {
      const response = await POST(createBadJsonRequest())
      expect(response.status).toBe(400)
    })

    it('type !== notification → 400', async () => {
      const response = await POST(createRequest({ type: 'unknown', event: 'test' }))
      expect(response.status).toBe(400)
    })
  })

  // === payment.succeeded ===

  describe('payment.succeeded', () => {
    it('Payment не найден → 200 (не ошибка)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null)

      const response = await POST(createRequest(paymentSucceededNotification()))
      expect(response.status).toBe(200)
    })

    it('Payment обновлён → SUCCEEDED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        orderId: 'order-1',
      })
      mockPrisma.subOrder.findMany.mockResolvedValueOnce([])

      // Мокаем subOrder.findMany для уведомлений (fire-and-forget)
      mockPrisma.subOrder.findMany.mockResolvedValueOnce([])

      await POST(createRequest(paymentSucceededNotification()))

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SUCCEEDED' }),
        })
      )
    })

    it('Order обновлён → CONFIRMED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        orderId: 'order-1',
      })
      mockPrisma.subOrder.findMany.mockResolvedValueOnce([])
      mockPrisma.subOrder.findMany.mockResolvedValueOnce([])

      await POST(createRequest(paymentSucceededNotification()))

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'CONFIRMED' },
      })
    })

    it('SubOrders обновлены → PAID', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        orderId: 'order-1',
      })
      mockPrisma.subOrder.findMany.mockResolvedValueOnce([{ id: 'sub-1', sellerId: 'seller-1', sellerAmount: 4500 }])
      mockPrisma.subOrder.findMany.mockResolvedValueOnce([])

      await POST(createRequest(paymentSucceededNotification()))

      expect(mockPrisma.subOrder.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'PAID' },
      })
    })

    it('SellerBalance upsert для каждого SubOrder', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        orderId: 'order-1',
      })
      mockPrisma.subOrder.findMany.mockResolvedValueOnce([
        { id: 'sub-1', sellerId: 'seller-1', sellerAmount: 4500 },
        { id: 'sub-2', sellerId: 'seller-2', sellerAmount: 5000 },
      ])
      mockPrisma.subOrder.findMany.mockResolvedValueOnce([])

      await POST(createRequest(paymentSucceededNotification()))

      expect(mockPrisma.sellerBalance.upsert).toHaveBeenCalledTimes(2)
      expect(mockPrisma.sellerBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerId: 'seller-1' },
        })
      )
    })

    it('ответ всегда 200', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        orderId: 'order-1',
      })
      mockPrisma.subOrder.findMany.mockResolvedValueOnce([])
      mockPrisma.subOrder.findMany.mockResolvedValueOnce([])

      const response = await POST(createRequest(paymentSucceededNotification()))
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  // === payment.canceled ===

  describe('payment.canceled', () => {
    it('Payment не найден → 200', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null)

      const response = await POST(createRequest(paymentCanceledNotification()))
      expect(response.status).toBe(200)
    })

    it('Payment → CANCELLED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        orderId: 'order-1',
      })
      mockPrisma.orderItem.findMany.mockResolvedValueOnce([])

      await POST(createRequest(paymentCanceledNotification()))

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        })
      )
    })

    it('Order → CANCELLED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        orderId: 'order-1',
      })
      mockPrisma.orderItem.findMany.mockResolvedValueOnce([])

      await POST(createRequest(paymentCanceledNotification()))

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'CANCELLED' },
      })
    })

    it('SubOrders → CANCELLED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        orderId: 'order-1',
      })
      mockPrisma.orderItem.findMany.mockResolvedValueOnce([])

      await POST(createRequest(paymentCanceledNotification()))

      expect(mockPrisma.subOrder.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'CANCELLED' },
      })
    })

    it('восстановление остатков (availableCount)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        orderId: 'order-1',
      })
      mockPrisma.orderItem.findMany.mockResolvedValueOnce([
        { productItemId: 'pi-1', quantity: 2 },
        { productItemId: 'pi-2', quantity: 1 },
      ])

      await POST(createRequest(paymentCanceledNotification()))

      expect(mockPrisma.productItem.update).toHaveBeenCalledTimes(2)
      expect(mockPrisma.productItem.update).toHaveBeenCalledWith({
        where: { id: 'pi-1' },
        data: { availableCount: { increment: 2 } },
      })
      expect(mockPrisma.productItem.update).toHaveBeenCalledWith({
        where: { id: 'pi-2' },
        data: { availableCount: { increment: 1 } },
      })
    })

    it('ответ 200', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        orderId: 'order-1',
      })
      mockPrisma.orderItem.findMany.mockResolvedValueOnce([])

      const response = await POST(createRequest(paymentCanceledNotification()))
      expect(response.status).toBe(200)
    })
  })

  // === refund.succeeded ===

  describe('refund.succeeded', () => {
    it('нет payment_id → 200 (ранний возврат)', async () => {
      const response = await POST(
        createRequest({
          type: 'notification',
          event: 'refund.succeeded',
          object: { id: 'ref-1', status: 'succeeded', amount: { value: '1000.00' } },
        })
      )

      expect(response.status).toBe(200)
      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled()
    })

    it('Payment не найден → 200', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null)

      const response = await POST(createRequest(refundSucceededNotification()))
      expect(response.status).toBe(200)
    })

    it('полный возврат → REFUNDED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        amount: 5000,
      })

      await POST(createRequest(refundSucceededNotification('yoo-pay-1', '5000.00')))

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REFUNDED' }),
        })
      )
    })

    it('частичный возврат → PARTIALLY_REFUNDED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        amount: 5000,
      })

      await POST(createRequest(refundSucceededNotification('yoo-pay-1', '2000.00')))

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PARTIALLY_REFUNDED' }),
        })
      )
    })

    it('yookassaStatus = refunded', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-1',
        amount: 5000,
      })

      await POST(createRequest(refundSucceededNotification()))

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ yookassaStatus: 'refunded' }),
        })
      )
    })
  })

  // === Ошибки и edge cases ===

  describe('ошибки и edge cases', () => {
    it('ошибка в handler → всё равно 200', async () => {
      mockPrisma.payment.findUnique.mockRejectedValueOnce(new Error('DB error'))

      const response = await POST(createRequest(paymentSucceededNotification()))
      expect(response.status).toBe(200)
    })

    it('неизвестное событие → 200', async () => {
      const response = await POST(
        createRequest({
          type: 'notification',
          event: 'payment.waiting_for_capture',
          object: { id: 'pay-1' },
        })
      )

      expect(response.status).toBe(200)
    })

    it('всегда возвращает JSON', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null)

      const response = await POST(createRequest(paymentSucceededNotification()))
      const body = await response.json()

      expect(body).toBeDefined()
    })
  })
})
