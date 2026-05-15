import { MOCK_USER, mockDb, mockGetSession } from '@test-utils/action-test-helpers'
import { createDecimal, createMockCartItem } from '@test-utils/factories'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок Prisma с callback-$transaction (inline) ===

const mockPrisma = vi.hoisted(() => {
  const prisma: Record<string, unknown> = {
    cart: { findUnique: vi.fn() },
    order: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    orderItem: { createMany: vi.fn() },
    subOrder: { create: vi.fn() },
    subOrderItem: { createMany: vi.fn() },
    productItem: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    promo: { findUnique: vi.fn(), update: vi.fn() },
    payment: { create: vi.fn() },
    address: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
    userProfile: { findUnique: vi.fn(), upsert: vi.fn() },
    // callback-транзакция: передаём сам mockPrisma как tx
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  }
  return prisma
})

vi.mock('@/lib/auth', () => mockGetSession())
vi.mock('@/lib/db', () => mockDb(mockPrisma))

vi.mock('@/lib/yookassa', () => ({
  createPayment: vi.fn(),
}))

vi.mock('@/app/_actions/loyalty', () => ({
  spendLoyaltyPoints: vi.fn(() => Promise.resolve(0)),
}))

vi.mock('@/lib/order-emails', () => ({
  sendOrderAdminNotification: vi.fn(() => Promise.resolve()),
  sendOrderConfirmationToCustomer: vi.fn(() => Promise.resolve()),
  sendLowStockAdminNotification: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/telegram-notify', () => ({
  sendOrderTelegramNotification: vi.fn(() => Promise.resolve()),
  sendLowStockTelegramNotification: vi.fn(() => Promise.resolve()),
}))

// === Импорты (после моков) ===

import type { CheckoutFormData } from '../_schemas/checkout-form.schema'

import { createOrder, type CreateOrderResult } from './create-order'

// === Хелперы ===

function validFormData(overrides: Partial<CheckoutFormData> = {}): CheckoutFormData {
  return {
    customerName: 'Иван Иванов',
    customerPhone: '+79991234567',
    customerEmail: 'ivan@test.ru',
    deliveryAddress: 'Москва, ул. Тестовая, д. 1, кв. 1',
    deliveryCity: 'Москва',
    deliveryRegion: 'Московская область',
    deliveryPostalCode: '101000',
    saveToProfile: false,
    promoCode: '',
    notes: '',
    loyaltyPoints: 0,
    ...overrides,
  }
}

function createMockCart(items?: unknown[]) {
  return {
    id: 'cart-1',
    userId: MOCK_USER.id,
    items: items ?? [createMockCartItem()],
  }
}

function setupDefaultMocks() {
  const cart = createMockCart()
  mockPrisma.cart.findUnique.mockResolvedValue(cart)
  mockPrisma.order.findUnique.mockResolvedValue(null) // номер уникален
  mockPrisma.order.count.mockResolvedValue(0) // perCustomer
  mockPrisma.productItem.findUnique.mockResolvedValue({ availableCount: 10, isPreOrder: false })
  mockPrisma.order.create.mockResolvedValue({
    id: 'order-1',
    orderNumber: 'ORD-20260303-00001',
    createdAt: new Date('2026-03-03'),
  })
  mockPrisma.orderItem.createMany.mockResolvedValue({ count: 1 })
  mockPrisma.subOrder.create.mockResolvedValue({ id: 'sub-1' })
  mockPrisma.subOrderItem.createMany.mockResolvedValue({ count: 1 })
  mockPrisma.productItem.update.mockResolvedValue({})
  mockPrisma.cartItem.deleteMany.mockResolvedValue({})
  mockPrisma.productItem.findMany.mockResolvedValue([])
  mockPrisma.address.findFirst.mockResolvedValue(null)
  mockPrisma.address.count.mockResolvedValue(0)
  mockPrisma.address.create.mockResolvedValue({})
  mockPrisma.userProfile.findUnique.mockResolvedValue(null)
  mockPrisma.userProfile.upsert.mockResolvedValue({})
}

describe('createOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
    // Без ЮKassa по умолчанию
    vi.stubEnv('YOOKASSA_SHOP_ID', '')
    vi.stubEnv('YOOKASSA_SECRET_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // === Auth и валидация ===

  describe('auth и валидация', () => {
    it('не аутентифицирован → ошибка', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      const result = await createOrder(validFormData())
      expect(result).toEqual({ success: false, error: 'Необходимо войти в систему' })
    })

    it('невалидные данные → ошибка', async () => {
      const result = await createOrder({ customerName: '' } as unknown as CheckoutFormData)
      expect(result).toEqual({ success: false, error: 'Некорректные данные' })
    })

    it('пустая корзина → ошибка', async () => {
      mockPrisma.cart.findUnique.mockResolvedValueOnce({ id: 'cart-1', items: [] })

      const result = await createOrder(validFormData())
      expect(result.success).toBe(false)
      expect((result as Extract<CreateOrderResult, { success: false }>).error).toContain('корзина пуста')
    })

    it('корзина не найдена → ошибка', async () => {
      mockPrisma.cart.findUnique.mockResolvedValueOnce(null)

      const result = await createOrder(validFormData())
      expect(result.success).toBe(false)
    })
  })

  // === Наличие товаров ===

  describe('наличие товаров', () => {
    it('недостаточно товара → ошибка', async () => {
      mockPrisma.productItem.findUnique.mockResolvedValueOnce({
        availableCount: 0,
        isPreOrder: false,
      })

      const result = await createOrder(validFormData())
      expect(result.success).toBe(false)
      expect((result as Extract<CreateOrderResult, { success: false }>).error).toContain('Недостаточно товара')
    })

    it('предзаказ пропускает проверку наличия', async () => {
      mockPrisma.productItem.findUnique
        .mockResolvedValueOnce({ availableCount: 0, isPreOrder: true }) // проверка наличия (пропуск)
        .mockResolvedValueOnce({ isPreOrder: true }) // уменьшение остатков (пропуск)

      const result = await createOrder(validFormData())
      expect(result.success).toBe(true)
    })

    it('достаточно товара → заказ создан', async () => {
      const result = await createOrder(validFormData())
      expect(result.success).toBe(true)
    })
  })

  // === Номер заказа ===

  describe('номер заказа', () => {
    it('формат ORD-YYYYMMDD-XXXXX', async () => {
      const result = await createOrder(validFormData())
      expect(result.success).toBe(true)

      const createCall = mockPrisma.order.create.mock.calls[0][0]
      expect(createCall.data.orderNumber).toMatch(/^ORD-\d{8}-\d{5}$/)
    })

    it('retry при дубликате номера', async () => {
      // Первый номер уже существует, второй — нет
      mockPrisma.order.findUnique.mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null)

      const result = await createOrder(validFormData())
      expect(result.success).toBe(true)
      expect(mockPrisma.order.findUnique).toHaveBeenCalledTimes(2)
    })
  })

  // === Промокод ===

  describe('промокод', () => {
    it('без промокода → discountAmount = 0', async () => {
      const result = await createOrder(validFormData({ promoCode: '' }))
      expect(result.success).toBe(true)

      const createData = mockPrisma.order.create.mock.calls[0][0].data
      expect(Number(createData.discountAmount)).toBe(0)
    })

    it('PERCENTAGE промокод уменьшает total', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce({
        id: 'promo-1',
        code: 'SALE10',
        type: 'PERCENTAGE',
        discount: 10,
        isActive: true,
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2030-12-31'),
        minAmount: null,
        maxUsages: null,
        usageCount: 0,
        perCustomer: null,
      })

      const result = await createOrder(validFormData({ promoCode: 'SALE10' }))
      expect(result.success).toBe(true)

      const createData = mockPrisma.order.create.mock.calls[0][0].data
      // 5000 - 10% = 4500
      expect(Number(createData.totalAmount)).toBe(4500)
      expect(Number(createData.discountAmount)).toBe(500)
    })

    it('FIXED_AMOUNT промокод уменьшает total', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce({
        id: 'promo-1',
        code: 'FIX1000',
        type: 'FIXED_AMOUNT',
        discount: 1000,
        isActive: true,
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2030-12-31'),
        minAmount: null,
        maxUsages: null,
        usageCount: 0,
        perCustomer: null,
      })

      const result = await createOrder(validFormData({ promoCode: 'FIX1000' }))
      expect(result.success).toBe(true)

      const createData = mockPrisma.order.create.mock.calls[0][0].data
      expect(Number(createData.totalAmount)).toBe(4000)
    })

    it('промокод с perCustomer лимитом исчерпан → ошибка', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce({
        id: 'promo-1',
        code: 'ONCE',
        type: 'PERCENTAGE',
        discount: 10,
        isActive: true,
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2030-12-31'),
        minAmount: null,
        maxUsages: null,
        usageCount: 0,
        perCustomer: 1,
      })
      mockPrisma.order.count.mockResolvedValueOnce(1)

      const result = await createOrder(validFormData({ promoCode: 'ONCE' }))
      expect(result.success).toBe(false)
      expect((result as Extract<CreateOrderResult, { success: false }>).error).toContain('уже использовали')
    })
  })

  // === Лояльность ===

  describe('лояльность', () => {
    it('loyaltyPoints > 0 → уменьшает total', async () => {
      const result = await createOrder(validFormData({ loyaltyPoints: 500 }))
      expect(result.success).toBe(true)

      const createData = mockPrisma.order.create.mock.calls[0][0].data
      // 5000 - 500 = 4500
      expect(Number(createData.totalAmount)).toBe(4500)
      expect(createData.loyaltyPointsUsed).toBe(500)
    })

    it('loyaltyPoints = 0 → не вызывает spendLoyaltyPoints', async () => {
      const { spendLoyaltyPoints } = await import('@/app/_actions/loyalty')

      const result = await createOrder(validFormData({ loyaltyPoints: 0 }))
      expect(result.success).toBe(true)
      expect(spendLoyaltyPoints).not.toHaveBeenCalled()
    })
  })

  // === Маркетплейс (SubOrders) ===

  describe('маркетплейс', () => {
    it('1 продавец → 1 SubOrder', async () => {
      const result = await createOrder(validFormData())
      expect(result.success).toBe(true)
      expect(mockPrisma.subOrder.create).toHaveBeenCalledTimes(1)
    })

    it('2 продавца → 2 SubOrders', async () => {
      const item1 = createMockCartItem({
        id: 'ci-1',
        productItemId: 'pi-1',
        productItem: {
          id: 'pi-1',
          price: createDecimal(3000),
          isPreOrder: false,
          availableCount: 10,
          size: { ru: 'S' },
          variant: {
            color: 'Белый',
            product: {
              name: 'Юбка',
              sellerId: 'seller-1',
              seller: { id: 'seller-1', commissionRate: createDecimal(0.1) },
            },
          },
        },
      })
      const item2 = createMockCartItem({
        id: 'ci-2',
        productItemId: 'pi-2',
        productItem: {
          id: 'pi-2',
          price: createDecimal(7000),
          isPreOrder: false,
          availableCount: 5,
          size: { ru: 'L' },
          variant: {
            color: 'Красный',
            product: {
              name: 'Блузка',
              sellerId: 'seller-2',
              seller: { id: 'seller-2', commissionRate: createDecimal(0.15) },
            },
          },
        },
      })

      mockPrisma.cart.findUnique.mockResolvedValueOnce(createMockCart([item1, item2]))

      const result = await createOrder(validFormData())
      expect(result.success).toBe(true)
      expect(mockPrisma.subOrder.create).toHaveBeenCalledTimes(2)
    })

    it('commission рассчитана корректно', async () => {
      const result = await createOrder(validFormData())
      expect(result.success).toBe(true)

      // commissionRate = 0.1, subtotal = 5000
      const subOrderCall = mockPrisma.subOrder.create.mock.calls[0][0]
      expect(Number(subOrderCall.data.commissionAmount)).toBe(500)
      expect(Number(subOrderCall.data.sellerAmount)).toBe(4500)
    })
  })

  // === Транзакция ===

  describe('транзакция', () => {
    it('Order создан с правильными данными', async () => {
      await createOrder(validFormData())

      const createData = mockPrisma.order.create.mock.calls[0][0].data
      expect(createData.userId).toBe(MOCK_USER.id)
      expect(createData.customerName).toBe('Иван Иванов')
      expect(createData.customerPhone).toBe('+79991234567')
      expect(createData.status).toBe('NEW')
    })

    it('OrderItems созданы', async () => {
      await createOrder(validFormData())
      expect(mockPrisma.orderItem.createMany).toHaveBeenCalledTimes(1)
    })

    it('availableCount уменьшен', async () => {
      await createOrder(validFormData())

      expect(mockPrisma.productItem.update).toHaveBeenCalledWith({
        where: { id: 'pi-1' },
        data: { availableCount: { decrement: 1 } },
      })
    })

    it('корзина очищена', async () => {
      await createOrder(validFormData())

      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      })
    })

    it('usageCount промокода увеличен при использовании промо', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce({
        id: 'promo-1',
        code: 'SALE10',
        type: 'PERCENTAGE',
        discount: 10,
        isActive: true,
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2030-12-31'),
        minAmount: null,
        maxUsages: null,
        usageCount: 0,
        perCustomer: null,
      })

      await createOrder(validFormData({ promoCode: 'SALE10' }))

      expect(mockPrisma.promo.update).toHaveBeenCalledWith({
        where: { id: 'promo-1' },
        data: { usageCount: { increment: 1 } },
      })
    })

    it('статус PREORDER если есть предзаказные товары', async () => {
      mockPrisma.productItem.findUnique
        .mockResolvedValueOnce({ availableCount: 0, isPreOrder: true })
        .mockResolvedValueOnce({ isPreOrder: true })

      await createOrder(validFormData())

      const createData = mockPrisma.order.create.mock.calls[0][0].data
      expect(createData.status).toBe('PREORDER')
    })
  })

  // === ЮKassa ===

  describe('ЮKassa', () => {
    it('нет env → fallback без оплаты (redirect на success)', async () => {
      const result = await createOrder(validFormData())
      expect(result.success).toBe(true)
      expect((result as Extract<CreateOrderResult, { success: true }>).redirect).toContain('/checkout/success')
    })

    it('успех → redirect на confirmation_url', async () => {
      vi.stubEnv('YOOKASSA_SHOP_ID', 'shop-1')
      vi.stubEnv('YOOKASSA_SECRET_KEY', 'secret')
      vi.stubEnv('BETTER_AUTH_URL', 'https://example.com')

      const { createPayment } = await import('@/lib/yookassa')
      vi.mocked(createPayment).mockResolvedValueOnce({
        id: 'pay-1',
        status: 'pending',
        amount: { value: '5000.00', currency: 'RUB' },
        paid: false,
        created_at: '2026-03-03',
        confirmation: {
          type: 'redirect',
          confirmation_url: 'https://yookassa.ru/pay/123',
        },
      })

      const result = await createOrder(validFormData())
      expect(result.success).toBe(true)
      expect((result as Extract<CreateOrderResult, { success: true }>).redirect).toBe('https://yookassa.ru/pay/123')

      // Payment сохранён в БД
      expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1)
    })

    it('ошибка API → graceful fallback на success page', async () => {
      vi.stubEnv('YOOKASSA_SHOP_ID', 'shop-1')
      vi.stubEnv('YOOKASSA_SECRET_KEY', 'secret')

      const { createPayment } = await import('@/lib/yookassa')
      vi.mocked(createPayment).mockRejectedValueOnce(new Error('API timeout'))

      const result = await createOrder(validFormData())
      expect(result.success).toBe(true)
      expect((result as Extract<CreateOrderResult, { success: true }>).redirect).toContain('/checkout/success')
    })
  })

  // === Уведомления ===

  describe('уведомления', () => {
    it('email и Telegram отправлены', async () => {
      const { sendOrderAdminNotification } = await import('@/lib/order-emails')
      const { sendOrderTelegramNotification } = await import('@/lib/telegram-notify')

      await createOrder(validFormData())

      expect(sendOrderAdminNotification).toHaveBeenCalledTimes(1)
      expect(sendOrderTelegramNotification).toHaveBeenCalledTimes(1)
    })

    it('email клиенту отправлен если указан email', async () => {
      const { sendOrderConfirmationToCustomer } = await import('@/lib/order-emails')

      await createOrder(validFormData({ customerEmail: 'client@test.ru' }))

      expect(sendOrderConfirmationToCustomer).toHaveBeenCalledTimes(1)
    })

    it('email клиенту НЕ отправлен если нет email', async () => {
      const { sendOrderConfirmationToCustomer } = await import('@/lib/order-emails')

      await createOrder(validFormData({ customerEmail: '' }))

      expect(sendOrderConfirmationToCustomer).not.toHaveBeenCalled()
    })

    it('spendLoyaltyPoints вызван при loyaltyPoints > 0', async () => {
      const { spendLoyaltyPoints } = await import('@/app/_actions/loyalty')

      await createOrder(validFormData({ loyaltyPoints: 500 }))

      expect(spendLoyaltyPoints).toHaveBeenCalledWith(
        'order-1', // orderId
        5000, // amountAfterPromo
        500, // loyaltyPointsRequested
        MOCK_USER.id
      )
    })
  })

  // === Ошибки ===

  describe('ошибки', () => {
    it('$transaction "Недостаточно товара" → пробрасывает клиенту', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(
        new Error('Недостаточно товара "Платье" (размер M). Доступно: 0, запрошено: 1')
      )

      const result = await createOrder(validFormData())
      expect(result.success).toBe(false)
      expect((result as Extract<CreateOrderResult, { success: false }>).error).toContain('Недостаточно товара')
    })

    it('иной Error → generic message', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB connection lost'))

      const result = await createOrder(validFormData())
      expect(result).toEqual({
        success: false,
        error: 'Не удалось создать заказ. Попробуйте еще раз.',
      })
    })

    it('non-Error exception → generic message', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce('something unexpected')

      const result = await createOrder(validFormData())
      expect(result).toEqual({
        success: false,
        error: 'Не удалось создать заказ. Попробуйте еще раз.',
      })
    })
  })
})
