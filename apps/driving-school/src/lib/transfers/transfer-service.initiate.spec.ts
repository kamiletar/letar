/**
 * Тесты для инициирования передачи ученика
 *
 * Покрывает:
 * - Создание запроса на передачу (initiateTransfer)
 */

import type { ConnectionStatus } from '@letar/driving-school-db/prisma'
import { initiateTransfer } from './transfer-service'
import {
  createMockRepository,
  mockConnection,
  mockInstructorA,
  mockInstructorB,
  mockTransfer,
} from './transfer-service.mocks'

describe('initiateTransfer', () => {
  it('должен создавать запрос на передачу', async () => {
    const repo = createMockRepository({
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      getInstructorProfileById: vi.fn().mockResolvedValue(mockInstructorB),
      createTransfer: vi.fn().mockResolvedValue({ id: 'transfer-1' }),
    })

    const result = await initiateTransfer({
      connectionId: 'connection-1',
      toInstructorId: 'instructor-profile-b',
      type: 'TEMPORARY',
      reason: 'VACATION',
      transferBalance: true,
      repo,
    })

    expect(result.success).toBe(true)
    expect(result.transferId).toBe('transfer-1')
    expect(repo.createTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        fromConnectionId: 'connection-1',
        toInstructorId: 'instructor-profile-b',
        type: 'TEMPORARY',
        reason: 'VACATION',
        transferBalance: true,
        status: 'PENDING',
      })
    )
  })

  it('должен возвращать ошибку если связь не найдена', async () => {
    const repo = createMockRepository({
      getConnectionById: vi.fn().mockResolvedValue(null),
    })

    const result = await initiateTransfer({
      connectionId: 'non-existent',
      toInstructorId: 'instructor-profile-b',
      type: 'TEMPORARY',
      reason: 'VACATION',
      transferBalance: true,
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('CONNECTION_NOT_FOUND')
  })

  it('должен возвращать ошибку если связь неактивна', async () => {
    const inactiveConnection = { ...mockConnection, status: 'DISCONNECTED' as ConnectionStatus }
    const repo = createMockRepository({
      getConnectionById: vi.fn().mockResolvedValue(inactiveConnection),
    })

    const result = await initiateTransfer({
      connectionId: 'connection-1',
      toInstructorId: 'instructor-profile-b',
      type: 'TEMPORARY',
      reason: 'VACATION',
      transferBalance: true,
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('CONNECTION_NOT_ACTIVE')
  })

  it('должен возвращать ошибку если получатель не найден', async () => {
    const repo = createMockRepository({
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      getInstructorProfileById: vi.fn().mockResolvedValue(null),
    })

    const result = await initiateTransfer({
      connectionId: 'connection-1',
      toInstructorId: 'non-existent',
      type: 'TEMPORARY',
      reason: 'VACATION',
      transferBalance: true,
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('RECIPIENT_NOT_FOUND')
  })

  it('должен возвращать ошибку если получатель — тот же инструктор', async () => {
    const repo = createMockRepository({
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      getInstructorProfileById: vi.fn().mockResolvedValue(mockInstructorA),
    })

    const result = await initiateTransfer({
      connectionId: 'connection-1',
      toInstructorId: 'instructor-profile-a', // тот же
      type: 'TEMPORARY',
      reason: 'VACATION',
      transferBalance: true,
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('SAME_INSTRUCTOR')
  })

  it('должен устанавливать срок действия 7 дней', async () => {
    const now = new Date()
    const repo = createMockRepository({
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      getInstructorProfileById: vi.fn().mockResolvedValue(mockInstructorB),
      createTransfer: vi.fn().mockResolvedValue({ id: 'transfer-1' }),
    })

    await initiateTransfer({
      connectionId: 'connection-1',
      toInstructorId: 'instructor-profile-b',
      type: 'TEMPORARY',
      reason: 'VACATION',
      transferBalance: true,
      repo,
    })

    const createCall = vi.mocked(repo.createTransfer).mock.calls[0][0]
    const expiresAt = new Date(createCall.expiresAt)
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    expect(diffDays).toBeGreaterThanOrEqual(6.9)
    expect(diffDays).toBeLessThanOrEqual(7.1)
  })

  it('должен возвращать ошибку если уже есть активный запрос на эту связь', async () => {
    const repo = createMockRepository({
      getConnectionById: vi.fn().mockResolvedValue(mockConnection),
      getInstructorProfileById: vi.fn().mockResolvedValue(mockInstructorB),
      getActiveTransferByConnection: vi.fn().mockResolvedValue(mockTransfer),
    })

    const result = await initiateTransfer({
      connectionId: 'connection-1',
      toInstructorId: 'instructor-profile-b',
      type: 'TEMPORARY',
      reason: 'VACATION',
      transferBalance: true,
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('TRANSFER_ALREADY_EXISTS')
  })
})
