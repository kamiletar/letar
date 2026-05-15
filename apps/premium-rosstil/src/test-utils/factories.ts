/**
 * Общие фабрики тестовых данных для Premium RossTil.
 *
 * Используй для создания mock-объектов в unit-тестах.
 * Каждая фабрика принимает overrides для кастомизации.
 */

/**
 * Мок Prisma Decimal (не настоящий Decimal.js, но достаточно для тестов).
 */
export function createDecimal(value: number) {
  return {
    toFixed: (n: number) => value.toFixed(n),
    toString: () => String(value),
    valueOf: () => value,
    [Symbol.toPrimitive]: () => value,
  }
}

/**
 * Мок промокода (Promo).
 */
export function createMockPromo(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  }
}

/**
 * Мок элемента корзины (CartItem с productItem).
 */
export function createMockCartItem(overrides: Record<string, any> = {}) {
  return {
    id: 'ci-1',
    cartId: 'cart-1',
    productItemId: 'pi-1',
    quantity: 1,
    productItem: {
      id: 'pi-1',
      price: createDecimal(5000),
      isPreOrder: false,
      availableCount: 10,
      size: { ru: 'M' },
      variant: {
        color: 'Чёрный',
        product: {
          name: 'Платье',
          sellerId: 'seller-1',
          seller: { id: 'seller-1', commissionRate: createDecimal(0.1) },
        },
      },
    },
    ...overrides,
  }
}

/**
 * Мок лояльности (LoyaltyAccount).
 */
export function createMockLoyaltyAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acc-1',
    userId: 'user-1',
    balance: 1000,
    totalEarned: 5000,
    level: 'BRONZE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
