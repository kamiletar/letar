/**
 * Тесты для хелперов авторизации админа.
 *
 * Тестируем requireAdminAuth и assertAdminAuth с моками getSession и getEnhancedPrisma.
 */

import { assertAdminAuth, requireAdminAuth } from '../with-admin-auth'

// Мок getSession
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

// Мок getEnhancedPrisma
vi.mock('@/lib/db', () => ({
  getEnhancedPrisma: vi.fn(() => ({ user: { findMany: vi.fn() } })),
}))

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

const mockGetSession = getSession as ReturnType<typeof vi.fn>
const mockGetEnhancedPrisma = getEnhancedPrisma as ReturnType<typeof vi.fn>

describe('requireAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('должен вернуть Unauthorized если нет сессии', async () => {
    mockGetSession.mockResolvedValue(null)

    const result = await requireAdminAuth()

    expect(result).toEqual({
      success: false,
      error: 'Unauthorized',
    })
    expect(mockGetEnhancedPrisma).not.toHaveBeenCalled()
  })

  it('должен вернуть Unauthorized если нет user в сессии', async () => {
    mockGetSession.mockResolvedValue({ user: null })

    const result = await requireAdminAuth()

    expect(result).toEqual({
      success: false,
      error: 'Unauthorized',
    })
  })

  it('должен вернуть Forbidden для не-ADMIN роли', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'user@test.com', role: 'USER' },
    })

    const result = await requireAdminAuth()

    expect(result).toEqual({
      success: false,
      error: 'Forbidden: Admin access required',
    })
    expect(mockGetEnhancedPrisma).not.toHaveBeenCalled()
  })

  it('должен вернуть успех и контекст для ADMIN', async () => {
    const mockDb = { mandala: { findMany: vi.fn() } }
    mockGetSession.mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@test.com', role: 'ADMIN' },
    })
    mockGetEnhancedPrisma.mockReturnValue(mockDb)

    const result = await requireAdminAuth()

    expect(result).toEqual({
      success: true,
      context: {
        userId: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN',
        db: mockDb,
      },
    })
    expect(mockGetEnhancedPrisma).toHaveBeenCalledWith({
      id: 'admin-123',
      email: 'admin@test.com',
      role: 'ADMIN',
    })
  })

  it('должен обрабатывать пустой email', async () => {
    const mockDb = { mandala: { findMany: vi.fn() } }
    mockGetSession.mockResolvedValue({
      user: { id: 'admin-123', email: null, role: 'ADMIN' },
    })
    mockGetEnhancedPrisma.mockReturnValue(mockDb)

    const result = await requireAdminAuth()

    expect(result).toMatchObject({
      success: true,
      context: {
        userId: 'admin-123',
        email: '', // Пустая строка вместо null
        role: 'ADMIN',
      },
    })
  })
})

describe('assertAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('должен выбросить исключение если нет сессии', async () => {
    mockGetSession.mockResolvedValue(null)

    await expect(assertAdminAuth()).rejects.toThrow('Unauthorized')
  })

  it('должен выбросить исключение для не-ADMIN', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'user@test.com', role: 'USER' },
    })

    await expect(assertAdminAuth()).rejects.toThrow('Forbidden: Admin access required')
  })

  it('должен вернуть контекст для ADMIN', async () => {
    const mockDb = { mandala: { findMany: vi.fn() } }
    mockGetSession.mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@test.com', role: 'ADMIN' },
    })
    mockGetEnhancedPrisma.mockReturnValue(mockDb)

    const context = await assertAdminAuth()

    expect(context).toEqual({
      userId: 'admin-123',
      email: 'admin@test.com',
      role: 'ADMIN',
      db: mockDb,
    })
  })
})
