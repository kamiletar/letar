/**
 * Тесты для возврата ученика после временной передачи
 *
 * Покрывает:
 * - Возврат ученика (reclaimStudent)
 */

import type { ConnectionStatus, TransferStatus, TransferType } from '@letar/driving-school-db/prisma'
import { reclaimStudent } from './transfer-service'
import { createMockRepository, mockConnection, mockTransfer } from './transfer-service.mocks'

describe('reclaimStudent', () => {
  const pausedConnection = { ...mockConnection, status: 'PAUSED' as ConnectionStatus }
  const newConnection = {
    ...mockConnection,
    id: 'connection-new',
    instructorId: 'instructor-profile-b',
    transferredFrom: 'connection-1',
  }
  const acceptedTransfer = {
    ...mockTransfer,
    status: 'ACCEPTED' as TransferStatus,
    type: 'TEMPORARY' as TransferType,
    newConnectionId: 'connection-new',
  }

  it('должен возвращать ученика после временной передачи', async () => {
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(acceptedTransfer),
      getConnectionById: vi
        .fn()
        .mockResolvedValueOnce(pausedConnection) // исходная связь
        .mockResolvedValueOnce(newConnection), // новая связь
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
      updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
    })

    const result = await reclaimStudent({
      transferId: 'transfer-1',
      repo,
    })

    expect(result.success).toBe(true)
  })

  it('должен активировать исходную связь', async () => {
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(acceptedTransfer),
      getConnectionById: vi.fn().mockResolvedValueOnce(pausedConnection).mockResolvedValueOnce(newConnection),
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
      updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
    })

    await reclaimStudent({
      transferId: 'transfer-1',
      repo,
    })

    expect(repo.updateConnectionStatus).toHaveBeenCalledWith('connection-1', 'ACTIVE')
  })

  it('должен отключать связь получателя', async () => {
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(acceptedTransfer),
      getConnectionById: vi.fn().mockResolvedValueOnce(pausedConnection).mockResolvedValueOnce(newConnection),
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
      updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
    })

    await reclaimStudent({
      transferId: 'transfer-1',
      repo,
    })

    expect(repo.updateConnectionStatus).toHaveBeenCalledWith('connection-new', 'DISCONNECTED')
  })

  it('должен переносить баланс обратно если передача была с балансом', async () => {
    const transferWithBalance = { ...acceptedTransfer, transferBalance: true }
    const newConnectionWithBalance = { ...newConnection, prepaidLessons: 8 } // осталось 8 занятий
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(transferWithBalance),
      getConnectionById: vi
        .fn()
        .mockResolvedValueOnce(pausedConnection)
        .mockResolvedValueOnce(newConnectionWithBalance),
      updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
      updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
    })

    await reclaimStudent({
      transferId: 'transfer-1',
      repo,
    })

    // Баланс возвращается в исходную связь
    expect(repo.updateConnectionBalance).toHaveBeenCalledWith('connection-1', 8)
    // Баланс новой связи обнуляется
    expect(repo.updateConnectionBalance).toHaveBeenCalledWith('connection-new', 0)
  })

  it('должен возвращать ошибку если исходная связь не на паузе', async () => {
    const activeConnection = { ...mockConnection, status: 'ACTIVE' as ConnectionStatus }
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(acceptedTransfer),
      getConnectionById: vi.fn().mockResolvedValue(activeConnection),
    })

    const result = await reclaimStudent({
      transferId: 'transfer-1',
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('CONNECTION_NOT_PAUSED')
  })

  it('должен возвращать ошибку если передача была постоянной', async () => {
    const permanentTransfer = {
      ...acceptedTransfer,
      type: 'PERMANENT' as TransferType,
    }
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(permanentTransfer),
      getConnectionById: vi.fn().mockResolvedValue(pausedConnection),
    })

    const result = await reclaimStudent({
      transferId: 'transfer-1',
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('PERMANENT_TRANSFER')
  })
})
