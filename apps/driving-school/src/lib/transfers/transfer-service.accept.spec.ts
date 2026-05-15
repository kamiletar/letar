/**
 * Тесты для принятия передачи ученика
 *
 * Покрывает:
 * - Принятие передачи (acceptTransfer)
 */

import type { TransferStatus, TransferType } from '@letar/driving-school-db/prisma'
import { acceptTransfer } from './transfer-service'
import { createMockRepository, mockConnection, mockTransfer } from './transfer-service.mocks'

describe('acceptTransfer', () => {
  it('должен создавать новую связь с получателем', async () => {
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(mockTransfer),
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      createConnection: vi.fn().mockResolvedValue({ id: 'connection-new' }),
      updateTransfer: vi.fn().mockResolvedValue(undefined),
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
      updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
    })

    const result = await acceptTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(result.success).toBe(true)
    expect(result.newConnectionId).toBe('connection-new')
    expect(repo.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'student-profile-1',
        instructorId: 'instructor-profile-b',
        transferredFrom: 'connection-1',
      })
    )
  })

  it('должен ставить исходную связь на паузу для временной передачи', async () => {
    const temporaryTransfer = { ...mockTransfer, type: 'TEMPORARY' as TransferType }
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(temporaryTransfer),
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      createConnection: vi.fn().mockResolvedValue({ id: 'connection-new' }),
      updateTransfer: vi.fn().mockResolvedValue(undefined),
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
      updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
    })

    await acceptTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(repo.updateConnectionStatus).toHaveBeenCalledWith('connection-1', 'PAUSED')
  })

  it('должен отключать исходную связь для постоянной передачи', async () => {
    const permanentTransfer = { ...mockTransfer, type: 'PERMANENT' as TransferType }
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(permanentTransfer),
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      createConnection: vi.fn().mockResolvedValue({ id: 'connection-new' }),
      updateTransfer: vi.fn().mockResolvedValue(undefined),
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
      updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
    })

    await acceptTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(repo.updateConnectionStatus).toHaveBeenCalledWith('connection-1', 'DISCONNECTED')
  })

  it('должен переносить баланс если настроено', async () => {
    const transferWithBalance = { ...mockTransfer, transferBalance: true }
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(transferWithBalance),
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      createConnection: vi.fn().mockResolvedValue({ id: 'connection-new' }),
      updateTransfer: vi.fn().mockResolvedValue(undefined),
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
      updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
    })

    await acceptTransfer({
      transferId: 'transfer-1',
      repo,
    })

    // Новая связь создаётся с балансом исходной
    expect(repo.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        prepaidLessons: 10, // из mockConnection
      })
    )
    // Исходный баланс обнуляется
    expect(repo.updateConnectionBalance).toHaveBeenCalledWith('connection-1', 0)
  })

  it('должен сохранять баланс если не настроено', async () => {
    const transferWithoutBalance = { ...mockTransfer, transferBalance: false }
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(transferWithoutBalance),
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      createConnection: vi.fn().mockResolvedValue({ id: 'connection-new' }),
      updateTransfer: vi.fn().mockResolvedValue(undefined),
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
    })

    await acceptTransfer({
      transferId: 'transfer-1',
      repo,
    })

    // Новая связь создаётся с нулевым балансом
    expect(repo.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        prepaidLessons: 0,
      })
    )
    // updateConnectionBalance не вызывается
    expect(repo.updateConnectionBalance).not.toHaveBeenCalled()
  })

  it('должен сохранять ссылку на исходную связь (transferredFrom)', async () => {
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(mockTransfer),
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      createConnection: vi.fn().mockResolvedValue({ id: 'connection-new' }),
      updateTransfer: vi.fn().mockResolvedValue(undefined),
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
      updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
    })

    await acceptTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(repo.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        transferredFrom: 'connection-1',
      })
    )
  })

  it('должен возвращать ошибку если запрос не найден', async () => {
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(null),
    })

    const result = await acceptTransfer({
      transferId: 'non-existent',
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('TRANSFER_NOT_FOUND')
  })

  it('должен возвращать ошибку если запрос истёк', async () => {
    const expiredTransfer = {
      ...mockTransfer,
      expiresAt: new Date(Date.now() - 1000), // в прошлом
    }
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(expiredTransfer),
    })

    const result = await acceptTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('TRANSFER_EXPIRED')
  })

  it('должен возвращать ошибку если запрос уже обработан', async () => {
    const acceptedTransfer = {
      ...mockTransfer,
      status: 'ACCEPTED' as TransferStatus,
    }
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(acceptedTransfer),
    })

    const result = await acceptTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('TRANSFER_ALREADY_PROCESSED')
  })

  it('должен обновлять статус запроса на ACCEPTED', async () => {
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(mockTransfer),
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      createConnection: vi.fn().mockResolvedValue({ id: 'connection-new' }),
      updateTransfer: vi.fn().mockResolvedValue(undefined),
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
      updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
    })

    await acceptTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(repo.updateTransfer).toHaveBeenCalledWith(
      'transfer-1',
      expect.objectContaining({
        status: 'ACCEPTED',
        respondedAt: expect.any(Date),
        newConnectionId: 'connection-new',
      })
    )
  })
})
