/**
 * Тесты для бизнес-логики штрафов
 *
 * TDD: Сначала пишем тесты, потом реализацию
 *
 * Бизнес-логика:
 * - Штраф за позднюю отмену (LATE_CANCEL) — отмена менее чем за lateCancelHours до занятия
 * - Штраф за неявку (NO_SHOW) — ученик не явился на занятие
 * - Инструктор может отменить штраф с указанием причины
 * - Инструктор может отметить штраф как оплаченный
 */

import type { PenaltyStatus, PenaltyType } from '@letar/driving-school-db/prisma'
import {
  calculateCancelDeadline,
  cancelPenalty,
  type CancelPenaltyResult,
  chargePenalty,
  type ChargePenaltyResult,
  getPenaltySettings,
  type InstructorSettings,
  isLateCancellation,
  type MarkPaidResult,
  markPenaltyAsPaid,
  type PenaltyData,
  type PenaltyRepository,
} from './penalty-service'

// === Мок репозитория ===

const createMockRepository = (overrides: Partial<PenaltyRepository> = {}): PenaltyRepository => ({
  getInstructorSettings: vi.fn().mockResolvedValue(null),
  createPenalty: vi.fn().mockResolvedValue({ id: 'penalty-1' }),
  updatePenalty: vi.fn().mockResolvedValue(undefined),
  getPenaltyById: vi.fn().mockResolvedValue(null),
  ...overrides,
})

// === Тестовые данные ===

const mockInstructorSettings: InstructorSettings = {
  instructorId: 'instructor-1',
  lateCancelHours: 24,
  lateCancelPenalty: 1000, // 1000 рублей
  noShowPenalty: 1500, // 1500 рублей
}

const mockPenalty: PenaltyData = {
  id: 'penalty-1',
  studentId: 'student-1',
  instructorId: 'instructor-1',
  lessonId: 'lesson-1',
  type: 'LATE_CANCEL' as PenaltyType,
  status: 'CHARGED' as PenaltyStatus,
  amount: 1000,
  chargedAt: new Date('2025-01-15T10:00:00Z'),
  paidAt: null,
  cancelledAt: null,
  cancelReason: null,
}

// === Тесты ===

describe('Penalty Service', () => {
  describe('calculateCancelDeadline', () => {
    it('должен рассчитывать дедлайн отмены на основе lateCancelHours', () => {
      const lessonStartTime = new Date('2025-01-15T14:00:00Z')
      const lateCancelHours = 24

      const deadline = calculateCancelDeadline(lessonStartTime, lateCancelHours)

      // Дедлайн = время занятия минус 24 часа
      expect(deadline).toEqual(new Date('2025-01-14T14:00:00Z'))
    })

    it('должен корректно рассчитывать дедлайн для коротких интервалов', () => {
      const lessonStartTime = new Date('2025-01-15T14:00:00Z')
      const lateCancelHours = 2

      const deadline = calculateCancelDeadline(lessonStartTime, lateCancelHours)

      expect(deadline).toEqual(new Date('2025-01-15T12:00:00Z'))
    })

    it('должен корректно работать с нулевым интервалом', () => {
      const lessonStartTime = new Date('2025-01-15T14:00:00Z')
      const lateCancelHours = 0

      const deadline = calculateCancelDeadline(lessonStartTime, lateCancelHours)

      expect(deadline).toEqual(new Date('2025-01-15T14:00:00Z'))
    })
  })

  describe('isLateCancellation', () => {
    it('должен определять позднюю отмену (после дедлайна)', () => {
      const lessonStartTime = new Date('2025-01-15T14:00:00Z')
      const cancelTime = new Date('2025-01-15T10:00:00Z') // За 4 часа до занятия
      const lateCancelHours = 24 // Дедлайн 24 часа

      const result = isLateCancellation(lessonStartTime, cancelTime, lateCancelHours)

      expect(result).toBe(true)
    })

    it('должен определять своевременную отмену (до дедлайна)', () => {
      const lessonStartTime = new Date('2025-01-15T14:00:00Z')
      const cancelTime = new Date('2025-01-14T10:00:00Z') // За 28 часов до занятия
      const lateCancelHours = 24

      const result = isLateCancellation(lessonStartTime, cancelTime, lateCancelHours)

      expect(result).toBe(false)
    })

    it('должен считать отмену ровно в дедлайн своевременной', () => {
      const lessonStartTime = new Date('2025-01-15T14:00:00Z')
      const cancelTime = new Date('2025-01-14T14:00:00Z') // Ровно за 24 часа
      const lateCancelHours = 24

      const result = isLateCancellation(lessonStartTime, cancelTime, lateCancelHours)

      expect(result).toBe(false)
    })

    it('должен определять позднюю отмену при нулевом интервале (отмена после начала)', () => {
      const lessonStartTime = new Date('2025-01-15T14:00:00Z')
      const cancelTime = new Date('2025-01-15T14:01:00Z') // Через минуту после начала занятия
      const lateCancelHours = 0

      const result = isLateCancellation(lessonStartTime, cancelTime, lateCancelHours)

      expect(result).toBe(true)
    })

    it('должен считать своевременной отмену за минуту до занятия при нулевом интервале', () => {
      const lessonStartTime = new Date('2025-01-15T14:00:00Z')
      const cancelTime = new Date('2025-01-15T13:59:00Z') // За минуту до занятия
      const lateCancelHours = 0

      const result = isLateCancellation(lessonStartTime, cancelTime, lateCancelHours)

      expect(result).toBe(false)
    })
  })

  describe('getPenaltySettings', () => {
    it('должен возвращать настройки штрафов инструктора', async () => {
      const repo = createMockRepository({
        getInstructorSettings: vi.fn().mockResolvedValue(mockInstructorSettings),
      })

      const result = await getPenaltySettings('instructor-1', repo)

      expect(result.success).toBe(true)
      expect((result as { success: true; settings: InstructorSettings }).settings).toEqual(mockInstructorSettings)
    })

    it('должен возвращать ошибку если инструктор не найден', async () => {
      const repo = createMockRepository({
        getInstructorSettings: vi.fn().mockResolvedValue(null),
      })

      const result = await getPenaltySettings('unknown-instructor', repo)

      expect(result.success).toBe(false)
      expect((result as { success: false; error: string }).error).toBe('INSTRUCTOR_NOT_FOUND')
    })
  })

  describe('chargePenalty', () => {
    describe('LATE_CANCEL', () => {
      it('должен начислять штраф за позднюю отмену', async () => {
        const repo = createMockRepository({
          getInstructorSettings: vi.fn().mockResolvedValue(mockInstructorSettings),
          createPenalty: vi.fn().mockResolvedValue({ id: 'penalty-1' }),
        })

        const result = await chargePenalty({
          studentId: 'student-1',
          instructorId: 'instructor-1',
          lessonId: 'lesson-1',
          type: 'LATE_CANCEL',
          repo,
        })

        expect(result.success).toBe(true)
        expect((result as ChargePenaltyResult & { success: true }).penaltyId).toBe('penalty-1')
        expect((result as ChargePenaltyResult & { success: true }).amount).toBe(1000)
        expect((result as ChargePenaltyResult & { success: true }).type).toBe('LATE_CANCEL')
      })

      it('не должен начислять штраф если lateCancelPenalty не настроен', async () => {
        const repo = createMockRepository({
          getInstructorSettings: vi.fn().mockResolvedValue({
            ...mockInstructorSettings,
            lateCancelPenalty: null,
          }),
        })

        const result = await chargePenalty({
          studentId: 'student-1',
          instructorId: 'instructor-1',
          lessonId: 'lesson-1',
          type: 'LATE_CANCEL',
          repo,
        })

        expect(result.success).toBe(false)
        expect((result as ChargePenaltyResult & { success: false }).error).toBe('PENALTY_NOT_CONFIGURED')
      })
    })

    describe('NO_SHOW', () => {
      it('должен начислять штраф за неявку', async () => {
        const repo = createMockRepository({
          getInstructorSettings: vi.fn().mockResolvedValue(mockInstructorSettings),
          createPenalty: vi.fn().mockResolvedValue({ id: 'penalty-2' }),
        })

        const result = await chargePenalty({
          studentId: 'student-1',
          instructorId: 'instructor-1',
          lessonId: 'lesson-1',
          type: 'NO_SHOW',
          repo,
        })

        expect(result.success).toBe(true)
        expect((result as ChargePenaltyResult & { success: true }).penaltyId).toBe('penalty-2')
        expect((result as ChargePenaltyResult & { success: true }).amount).toBe(1500)
        expect((result as ChargePenaltyResult & { success: true }).type).toBe('NO_SHOW')
      })

      it('не должен начислять штраф если noShowPenalty не настроен', async () => {
        const repo = createMockRepository({
          getInstructorSettings: vi.fn().mockResolvedValue({
            ...mockInstructorSettings,
            noShowPenalty: null,
          }),
        })

        const result = await chargePenalty({
          studentId: 'student-1',
          instructorId: 'instructor-1',
          lessonId: 'lesson-1',
          type: 'NO_SHOW',
          repo,
        })

        expect(result.success).toBe(false)
        expect((result as ChargePenaltyResult & { success: false }).error).toBe('PENALTY_NOT_CONFIGURED')
      })
    })

    it('должен возвращать ошибку если инструктор не найден', async () => {
      const repo = createMockRepository({
        getInstructorSettings: vi.fn().mockResolvedValue(null),
      })

      const result = await chargePenalty({
        studentId: 'student-1',
        instructorId: 'unknown-instructor',
        lessonId: 'lesson-1',
        type: 'LATE_CANCEL',
        repo,
      })

      expect(result.success).toBe(false)
      expect((result as ChargePenaltyResult & { success: false }).error).toBe('INSTRUCTOR_NOT_FOUND')
    })

    it('должен вызывать createPenalty с правильными параметрами', async () => {
      const createPenaltyMock = vi.fn().mockResolvedValue({ id: 'penalty-1' })
      const repo = createMockRepository({
        getInstructorSettings: vi.fn().mockResolvedValue(mockInstructorSettings),
        createPenalty: createPenaltyMock,
      })

      await chargePenalty({
        studentId: 'student-1',
        instructorId: 'instructor-1',
        lessonId: 'lesson-1',
        type: 'LATE_CANCEL',
        repo,
      })

      expect(createPenaltyMock).toHaveBeenCalledWith({
        studentId: 'student-1',
        instructorId: 'instructor-1',
        lessonId: 'lesson-1',
        type: 'LATE_CANCEL',
        amount: 1000,
      })
    })
  })

  describe('cancelPenalty', () => {
    it('должен отменять штраф с указанием причины', async () => {
      const updatePenaltyMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getPenaltyById: vi.fn().mockResolvedValue(mockPenalty),
        updatePenalty: updatePenaltyMock,
      })

      const result = await cancelPenalty('penalty-1', 'Уважительная причина', repo)

      expect(result.success).toBe(true)
      expect(updatePenaltyMock).toHaveBeenCalledWith('penalty-1', {
        status: 'CANCELLED',
        cancelledAt: expect.any(Date),
        cancelReason: 'Уважительная причина',
      })
    })

    it('должен возвращать ошибку если штраф не найден', async () => {
      const repo = createMockRepository({
        getPenaltyById: vi.fn().mockResolvedValue(null),
      })

      const result = await cancelPenalty('unknown-penalty', 'Причина', repo)

      expect(result.success).toBe(false)
      expect((result as CancelPenaltyResult & { success: false }).error).toBe('PENALTY_NOT_FOUND')
    })

    it('должен возвращать ошибку если штраф уже отменён', async () => {
      const cancelledPenalty = { ...mockPenalty, status: 'CANCELLED' as PenaltyStatus }
      const repo = createMockRepository({
        getPenaltyById: vi.fn().mockResolvedValue(cancelledPenalty),
      })

      const result = await cancelPenalty('penalty-1', 'Причина', repo)

      expect(result.success).toBe(false)
      expect((result as CancelPenaltyResult & { success: false }).error).toBe('PENALTY_ALREADY_CANCELLED')
    })

    it('должен возвращать ошибку если штраф уже оплачен', async () => {
      const paidPenalty = { ...mockPenalty, status: 'PAID' as PenaltyStatus }
      const repo = createMockRepository({
        getPenaltyById: vi.fn().mockResolvedValue(paidPenalty),
      })

      const result = await cancelPenalty('penalty-1', 'Причина', repo)

      expect(result.success).toBe(false)
      expect((result as CancelPenaltyResult & { success: false }).error).toBe('PENALTY_ALREADY_PAID')
    })

    it('не должен требовать причину отмены', async () => {
      const updatePenaltyMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getPenaltyById: vi.fn().mockResolvedValue(mockPenalty),
        updatePenalty: updatePenaltyMock,
      })

      const result = await cancelPenalty('penalty-1', undefined, repo)

      expect(result.success).toBe(true)
      expect(updatePenaltyMock).toHaveBeenCalledWith('penalty-1', {
        status: 'CANCELLED',
        cancelledAt: expect.any(Date),
        cancelReason: undefined,
      })
    })
  })

  describe('markPenaltyAsPaid', () => {
    it('должен отмечать штраф как оплаченный', async () => {
      const updatePenaltyMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getPenaltyById: vi.fn().mockResolvedValue(mockPenalty),
        updatePenalty: updatePenaltyMock,
      })

      const result = await markPenaltyAsPaid('penalty-1', repo)

      expect(result.success).toBe(true)
      expect(updatePenaltyMock).toHaveBeenCalledWith('penalty-1', {
        status: 'PAID',
        paidAt: expect.any(Date),
      })
    })

    it('должен возвращать ошибку если штраф не найден', async () => {
      const repo = createMockRepository({
        getPenaltyById: vi.fn().mockResolvedValue(null),
      })

      const result = await markPenaltyAsPaid('unknown-penalty', repo)

      expect(result.success).toBe(false)
      expect((result as MarkPaidResult & { success: false }).error).toBe('PENALTY_NOT_FOUND')
    })

    it('должен возвращать ошибку если штраф уже оплачен', async () => {
      const paidPenalty = { ...mockPenalty, status: 'PAID' as PenaltyStatus }
      const repo = createMockRepository({
        getPenaltyById: vi.fn().mockResolvedValue(paidPenalty),
      })

      const result = await markPenaltyAsPaid('penalty-1', repo)

      expect(result.success).toBe(false)
      expect((result as MarkPaidResult & { success: false }).error).toBe('PENALTY_ALREADY_PAID')
    })

    it('должен возвращать ошибку если штраф отменён', async () => {
      const cancelledPenalty = { ...mockPenalty, status: 'CANCELLED' as PenaltyStatus }
      const repo = createMockRepository({
        getPenaltyById: vi.fn().mockResolvedValue(cancelledPenalty),
      })

      const result = await markPenaltyAsPaid('penalty-1', repo)

      expect(result.success).toBe(false)
      expect((result as MarkPaidResult & { success: false }).error).toBe('PENALTY_CANCELLED')
    })
  })
})
