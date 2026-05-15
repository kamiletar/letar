/**
 * Тесты для отклонения и отмены передачи
 *
 * Покрывает:
 * - Отклонение передачи (rejectTransfer)
 * - Отмена передачи (cancelTransfer)
 */

import type { TransferStatus } from '@letar/driving-school-db/prisma'
import { cancelTransfer, rejectTransfer } from './transfer-service'
import { createMockRepository, mockTransfer } from './transfer-service.mocks'

describe('rejectTransfer', () => {
  it('должен обновлять статус запроса на REJECTED', async () => {
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(mockTransfer),
      updateTransfer: vi.fn().mockResolvedValue(undefined),
    })

    const result = await rejectTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(result.success).toBe(true)
    expect(repo.updateTransfer).toHaveBeenCalledWith(
      'transfer-1',
      expect.objectContaining({
        status: 'REJECTED',
        respondedAt: expect.any(Date),
      })
    )
  })

  it('должен возвращать ошибку если запрос не найден', async () => {
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(null),
    })

    const result = await rejectTransfer({
      transferId: 'non-existent',
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('TRANSFER_NOT_FOUND')
  })

  it('должен возвращать ошибку если запрос уже обработан', async () => {
    const acceptedTransfer = {
      ...mockTransfer,
      status: 'ACCEPTED' as TransferStatus,
    }
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(acceptedTransfer),
    })

    const result = await rejectTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('TRANSFER_ALREADY_PROCESSED')
  })
})

describe('cancelTransfer', () => {
  it('должен отменять запрос на передачу', async () => {
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(mockTransfer),
      updateTransfer: vi.fn().mockResolvedValue(undefined),
    })

    const result = await cancelTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(result.success).toBe(true)
    expect(repo.updateTransfer).toHaveBeenCalledWith(
      'transfer-1',
      expect.objectContaining({
        status: 'CANCELLED',
      })
    )
  })

  it('должен возвращать ошибку если запрос уже обработан', async () => {
    const acceptedTransfer = {
      ...mockTransfer,
      status: 'ACCEPTED' as TransferStatus,
    }
    const repo = createMockRepository({
      getTransferById: vi.fn().mockResolvedValue(acceptedTransfer),
    })

    const result = await cancelTransfer({
      transferId: 'transfer-1',
      repo,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('TRANSFER_ALREADY_PROCESSED')
  })
})
