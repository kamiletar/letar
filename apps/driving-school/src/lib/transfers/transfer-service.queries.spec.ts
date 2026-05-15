/**
 * Тесты для получения списков передач
 *
 * Покрывает:
 * - Получение исходящих передач (getTransfersByInstructor)
 * - Получение входящих передач (getPendingTransfersForInstructor)
 */

import { getPendingTransfersForInstructor, getTransfersByInstructor } from './transfer-service'
import { createMockRepository, mockTransfer } from './transfer-service.mocks'

describe('getTransfersByInstructor', () => {
  it('должен возвращать исходящие запросы инструктора', async () => {
    const transfers = [mockTransfer]
    const repo = createMockRepository({
      getTransfersByFromInstructor: vi.fn().mockResolvedValue(transfers),
    })

    const result = await getTransfersByInstructor({
      instructorId: 'instructor-profile-a',
      repo,
    })

    expect(result.transfers).toEqual(transfers)
    expect(repo.getTransfersByFromInstructor).toHaveBeenCalledWith('instructor-profile-a')
  })
})

describe('getPendingTransfersForInstructor', () => {
  it('должен возвращать входящие запросы инструктора', async () => {
    const transfers = [mockTransfer]
    const repo = createMockRepository({
      getPendingTransfersByToInstructor: vi.fn().mockResolvedValue(transfers),
    })

    const result = await getPendingTransfersForInstructor({
      instructorId: 'instructor-profile-b',
      repo,
    })

    expect(result.transfers).toEqual(transfers)
    expect(repo.getPendingTransfersByToInstructor).toHaveBeenCalledWith('instructor-profile-b')
  })
})
