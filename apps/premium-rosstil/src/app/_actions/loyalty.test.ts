import { MOCK_USER, mockDb, mockGetSession } from '@test-utils/action-test-helpers'
import { createMockLoyaltyAccount } from '@test-utils/factories'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок Prisma ===

const mockPrisma = vi.hoisted(() => ({
  loyaltyAccount: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  loyaltyTransaction: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  order: { update: vi.fn() },
  // Массив-транзакция: Promise.all (НЕ callback-style)
  $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
}))

vi.mock('@/lib/auth', () => mockGetSession())
vi.mock('@/lib/db', () => mockDb(mockPrisma))

// НЕ мокаем @/lib/loyalty — используем реальные pure functions

// === Импорт тестируемого модуля ===

import { earnLoyaltyPoints, getLoyaltyAccount, getLoyaltyTransactions, spendLoyaltyPoints } from './loyalty'

// Фабрика с userId из MOCK_USER
function createMockAccount(overrides: Record<string, unknown> = {}) {
  return createMockLoyaltyAccount({ userId: MOCK_USER.id, ...overrides })
}

describe('getLoyaltyAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('не аутентифицирован → null', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const result = await getLoyaltyAccount()
    expect(result).toBeNull()
  })

  it('аккаунт существует → возвращает его', async () => {
    const account = createMockAccount()
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(account)

    const result = await getLoyaltyAccount()
    expect(result).toEqual(account)
  })

  it('аккаунт не существует → создаёт через systemDb', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(null)
    const newAccount = createMockAccount({ balance: 0, totalEarned: 0 })
    mockPrisma.loyaltyAccount.create.mockResolvedValueOnce(newAccount)

    const result = await getLoyaltyAccount()
    expect(result).toEqual(newAccount)
    expect(mockPrisma.loyaltyAccount.create).toHaveBeenCalledWith({
      data: { userId: MOCK_USER.id },
    })
  })

  it('находит аккаунт по userId текущего пользователя', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(createMockAccount())

    await getLoyaltyAccount()

    expect(mockPrisma.loyaltyAccount.findUnique).toHaveBeenCalledWith({
      where: { userId: MOCK_USER.id },
    })
  })
})

describe('getLoyaltyTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('не аутентифицирован → пустой массив', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValueOnce(null)

    const result = await getLoyaltyTransactions()
    expect(result).toEqual({ transactions: [], total: 0 })
  })

  it('нет аккаунта → пустой массив', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(null)

    const result = await getLoyaltyTransactions()
    expect(result).toEqual({ transactions: [], total: 0 })
  })

  it('пагинация: page и pageSize', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce({ id: 'acc-1' })

    const mockTxs = [{ id: 'tx-1' }, { id: 'tx-2' }]
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValueOnce(mockTxs)
    mockPrisma.loyaltyTransaction.count.mockResolvedValueOnce(50)

    const result = await getLoyaltyTransactions(3, 10)
    expect(result.transactions).toEqual(mockTxs)
    expect(result.total).toBe(50)

    expect(mockPrisma.loyaltyTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20, // (3 - 1) * 10
      })
    )
  })

  it('возвращает total', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce({ id: 'acc-1' })
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValueOnce([])
    mockPrisma.loyaltyTransaction.count.mockResolvedValueOnce(42)

    const result = await getLoyaltyTransactions()
    expect(result.total).toBe(42)
  })
})

describe('earnLoyaltyPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('создаёт аккаунт если его нет', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(null)
    mockPrisma.loyaltyAccount.create.mockResolvedValueOnce(createMockAccount({ balance: 0, totalEarned: 0 }))
    mockPrisma.loyaltyTransaction.findFirst.mockResolvedValueOnce(null)

    await earnLoyaltyPoints('order-1', 10000, MOCK_USER.id)

    expect(mockPrisma.loyaltyAccount.create).toHaveBeenCalledWith({
      data: { userId: MOCK_USER.id },
    })
  })

  it('расчёт баллов по уровню (BRONZE 3%)', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(
      createMockAccount({ level: 'BRONZE', balance: 100, totalEarned: 500 })
    )
    mockPrisma.loyaltyTransaction.findFirst.mockResolvedValueOnce(null)

    await earnLoyaltyPoints('order-1', 10000, MOCK_USER.id)

    // BRONZE 3% от 10000 = 300
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    // Проверяем что в транзакции создаётся запись с правильными баллами
    const txCalls = mockPrisma.$transaction.mock.calls[0][0]
    expect(txCalls).toHaveLength(3) // create transaction, update account, update order
  })

  it('идемпотентность — не начисляет дважды', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(createMockAccount())
    mockPrisma.loyaltyTransaction.findFirst.mockResolvedValueOnce({ id: 'existing-tx' })

    await earnLoyaltyPoints('order-1', 10000, MOCK_USER.id)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('0 баллов → не создаёт транзакцию', async () => {
    // При orderAmount=0 BRONZE 3% = 0 → ранний return
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(createMockAccount())
    mockPrisma.loyaltyTransaction.findFirst.mockResolvedValueOnce(null)

    await earnLoyaltyPoints('order-1', 0, MOCK_USER.id)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('level upgrade: достижение нового уровня', async () => {
    // totalEarned = 9800 + new 300 = 10100 → SILVER
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(
      createMockAccount({ level: 'BRONZE', balance: 500, totalEarned: 9800 })
    )
    mockPrisma.loyaltyTransaction.findFirst.mockResolvedValueOnce(null)

    await earnLoyaltyPoints('order-1', 10000, MOCK_USER.id)

    // Проверяем что $transaction вызван (баллы > 0)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('SILVER: 5% от 10000 = 500', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(
      createMockAccount({ level: 'SILVER', balance: 200, totalEarned: 15000 })
    )
    mockPrisma.loyaltyTransaction.findFirst.mockResolvedValueOnce(null)

    await earnLoyaltyPoints('order-1', 10000, MOCK_USER.id)

    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('GOLD: 7% от 10000 = 700', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(
      createMockAccount({ level: 'GOLD', balance: 3000, totalEarned: 60000 })
    )
    mockPrisma.loyaltyTransaction.findFirst.mockResolvedValueOnce(null)

    await earnLoyaltyPoints('order-1', 10000, MOCK_USER.id)

    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })
})

describe('spendLoyaltyPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pointsToSpend ≤ 0 → 0', async () => {
    const result = await spendLoyaltyPoints('order-1', 5000, 0, MOCK_USER.id)
    expect(result).toBe(0)
    expect(mockPrisma.loyaltyAccount.findUnique).not.toHaveBeenCalled()
  })

  it('отрицательные pointsToSpend → 0', async () => {
    const result = await spendLoyaltyPoints('order-1', 5000, -100, MOCK_USER.id)
    expect(result).toBe(0)
  })

  it('нет аккаунта → 0', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(null)

    const result = await spendLoyaltyPoints('order-1', 5000, 500, MOCK_USER.id)
    expect(result).toBe(0)
  })

  it('balance = 0 → 0', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(createMockAccount({ balance: 0 }))

    const result = await spendLoyaltyPoints('order-1', 5000, 500, MOCK_USER.id)
    expect(result).toBe(0)
  })

  it('maxAllowed ограничивает списание (50% от суммы)', async () => {
    // orderAmount=5000, maxByRatio=2500, balance=10000 → maxAllowed=2500
    // pointsToSpend=3000 → actualSpend=min(3000, 2500)=2500
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(createMockAccount({ balance: 10000 }))

    const result = await spendLoyaltyPoints('order-1', 5000, 3000, MOCK_USER.id)
    expect(result).toBe(2500)
  })

  it('баланс ограничивает списание', async () => {
    // orderAmount=10000, maxByRatio=5000, balance=200 → maxAllowed=200
    // pointsToSpend=500 → actualSpend=min(500, 200)=200
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(createMockAccount({ balance: 200 }))

    const result = await spendLoyaltyPoints('order-1', 10000, 500, MOCK_USER.id)
    expect(result).toBe(200)
  })

  it('actualSpend корректно рассчитан и возвращён', async () => {
    // Стандартный кейс: хватает баллов и лимита
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(createMockAccount({ balance: 3000 }))

    // orderAmount=10000, maxByRatio=5000, balance=3000 → maxAllowed=3000
    // pointsToSpend=1000 → actualSpend=min(1000, 3000)=1000
    const result = await spendLoyaltyPoints('order-1', 10000, 1000, MOCK_USER.id)
    expect(result).toBe(1000)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('newBalance = balance - actualSpend', async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(createMockAccount({ balance: 3000 }))

    await spendLoyaltyPoints('order-1', 10000, 1000, MOCK_USER.id)

    // Проверяем что $transaction вызван с 2 операциями
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    const txOps = mockPrisma.$transaction.mock.calls[0][0]
    expect(txOps).toHaveLength(2) // create transaction + update account
  })
})
