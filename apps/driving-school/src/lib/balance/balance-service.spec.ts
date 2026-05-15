/**
 * Тесты для бизнес-логики предоплаченных занятий
 *
 * TDD: Сначала пишем тесты, потом реализацию
 */

import {
  addPrepaidLessons,
  type AddPrepaidResult,
  type BalanceRepository,
  deductPrepaidLesson,
  type DeductPrepaidResult,
  type GetBalanceResult,
  getPrepaidBalance,
} from './balance-service'

// === Мок репозитория ===

const createMockRepository = (overrides: Partial<BalanceRepository> = {}): BalanceRepository => ({
  getConnection: vi.fn().mockResolvedValue(null),
  updatePrepaidBalance: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

// === Тестовые данные ===

const mockConnection = {
  id: 'conn-1',
  studentId: 'student-profile-1',
  instructorId: 'instructor-profile-1',
  prepaidLessons: 5,
  status: 'ACTIVE' as const,
}

// === Тесты ===

describe('Balance Service', () => {
  describe('getPrepaidBalance', () => {
    it('должен возвращать текущий баланс предоплаченных занятий', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(mockConnection),
      })

      const result = await getPrepaidBalance('student-profile-1', 'instructor-profile-1', repo)

      expect(result.success).toBe(true)
      expect((result as GetBalanceResult & { success: true }).balance).toBe(5)
    })

    it('должен возвращать ошибку, если связь не найдена', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(null),
      })

      const result = await getPrepaidBalance('student-1', 'instructor-1', repo)

      expect(result.success).toBe(false)
      expect((result as GetBalanceResult & { success: false }).error).toBe('CONNECTION_NOT_FOUND')
    })
  })

  describe('addPrepaidLessons', () => {
    it('должен пополнять баланс на указанное количество занятий', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(mockConnection),
        updatePrepaidBalance: vi.fn().mockResolvedValue(undefined),
      })

      const result = await addPrepaidLessons('student-profile-1', 'instructor-profile-1', 10, repo)

      expect(result.success).toBe(true)
      expect((result as AddPrepaidResult & { success: true }).newBalance).toBe(15) // 5 + 10
      expect(repo.updatePrepaidBalance).toHaveBeenCalledWith('conn-1', 15)
    })

    it('должен возвращать ошибку при попытке добавить отрицательное количество', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(mockConnection),
      })

      const result = await addPrepaidLessons('student-profile-1', 'instructor-profile-1', -5, repo)

      expect(result.success).toBe(false)
      expect((result as AddPrepaidResult & { success: false }).error).toBe('INVALID_AMOUNT')
    })

    it('должен возвращать ошибку при попытке добавить ноль занятий', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(mockConnection),
      })

      const result = await addPrepaidLessons('student-profile-1', 'instructor-profile-1', 0, repo)

      expect(result.success).toBe(false)
      expect((result as AddPrepaidResult & { success: false }).error).toBe('INVALID_AMOUNT')
    })

    it('должен возвращать ошибку, если связь не найдена', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(null),
      })

      const result = await addPrepaidLessons('student-1', 'instructor-1', 10, repo)

      expect(result.success).toBe(false)
      expect((result as AddPrepaidResult & { success: false }).error).toBe('CONNECTION_NOT_FOUND')
    })

    it('должен возвращать ошибку, если связь неактивна', async () => {
      const inactiveConnection = { ...mockConnection, status: 'DISCONNECTED' as const }
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(inactiveConnection),
      })

      const result = await addPrepaidLessons('student-profile-1', 'instructor-profile-1', 10, repo)

      expect(result.success).toBe(false)
      expect((result as AddPrepaidResult & { success: false }).error).toBe('CONNECTION_NOT_ACTIVE')
    })

    it('должен возвращать ошибку при превышении максимального лимита (50)', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue({ ...mockConnection, prepaidLessons: 45 }),
      })

      const result = await addPrepaidLessons('student-profile-1', 'instructor-profile-1', 10, repo)

      expect(result.success).toBe(false)
      expect((result as AddPrepaidResult & { success: false }).error).toBe('EXCEEDS_LIMIT')
    })

    it('должен разрешать пополнение до максимального лимита (50)', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue({ ...mockConnection, prepaidLessons: 40 }),
        updatePrepaidBalance: vi.fn().mockResolvedValue(undefined),
      })

      const result = await addPrepaidLessons('student-profile-1', 'instructor-profile-1', 10, repo)

      expect(result.success).toBe(true)
      expect((result as AddPrepaidResult & { success: true }).newBalance).toBe(50)
    })

    it('должен работать при нулевом начальном балансе', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue({ ...mockConnection, prepaidLessons: 0 }),
        updatePrepaidBalance: vi.fn().mockResolvedValue(undefined),
      })

      const result = await addPrepaidLessons('student-profile-1', 'instructor-profile-1', 5, repo)

      expect(result.success).toBe(true)
      expect((result as AddPrepaidResult & { success: true }).newBalance).toBe(5)
    })
  })

  describe('deductPrepaidLesson', () => {
    it('должен списывать одно занятие при завершении', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(mockConnection),
        updatePrepaidBalance: vi.fn().mockResolvedValue(undefined),
      })

      const result = await deductPrepaidLesson('student-profile-1', 'instructor-profile-1', 'COMPLETED', repo)

      expect(result.success).toBe(true)
      expect((result as DeductPrepaidResult & { success: true }).newBalance).toBe(4) // 5 - 1
      expect((result as DeductPrepaidResult & { success: true }).deducted).toBe(1)
      expect(repo.updatePrepaidBalance).toHaveBeenCalledWith('conn-1', 4)
    })

    it('должен списывать одно занятие при неявке', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(mockConnection),
        updatePrepaidBalance: vi.fn().mockResolvedValue(undefined),
      })

      const result = await deductPrepaidLesson('student-profile-1', 'instructor-profile-1', 'NO_SHOW', repo)

      expect(result.success).toBe(true)
      expect((result as DeductPrepaidResult & { success: true }).newBalance).toBe(4)
      expect((result as DeductPrepaidResult & { success: true }).reason).toBe('NO_SHOW')
    })

    it('должен возвращать ошибку, если баланс равен нулю', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue({ ...mockConnection, prepaidLessons: 0 }),
      })

      const result = await deductPrepaidLesson('student-profile-1', 'instructor-profile-1', 'COMPLETED', repo)

      expect(result.success).toBe(false)
      expect((result as DeductPrepaidResult & { success: false }).error).toBe('INSUFFICIENT_BALANCE')
    })

    it('должен возвращать ошибку, если связь не найдена', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(null),
      })

      const result = await deductPrepaidLesson('student-1', 'instructor-1', 'COMPLETED', repo)

      expect(result.success).toBe(false)
      expect((result as DeductPrepaidResult & { success: false }).error).toBe('CONNECTION_NOT_FOUND')
    })

    it('должен работать при балансе в одно занятие', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue({ ...mockConnection, prepaidLessons: 1 }),
        updatePrepaidBalance: vi.fn().mockResolvedValue(undefined),
      })

      const result = await deductPrepaidLesson('student-profile-1', 'instructor-profile-1', 'COMPLETED', repo)

      expect(result.success).toBe(true)
      expect((result as DeductPrepaidResult & { success: true }).newBalance).toBe(0)
    })

    it('должен корректно возвращать причину списания COMPLETED', async () => {
      const repo = createMockRepository({
        getConnection: vi.fn().mockResolvedValue(mockConnection),
        updatePrepaidBalance: vi.fn().mockResolvedValue(undefined),
      })

      const result = await deductPrepaidLesson('student-profile-1', 'instructor-profile-1', 'COMPLETED', repo)

      expect(result.success).toBe(true)
      expect((result as DeductPrepaidResult & { success: true }).reason).toBe('COMPLETED')
    })
  })
})
