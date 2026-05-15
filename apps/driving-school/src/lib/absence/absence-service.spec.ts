/**
 * Тесты для бизнес-логики отсутствия инструктора
 *
 * TDD: Сначала пишем тесты, потом реализацию
 *
 * Бизнес-логика:
 * - Инструктор может создать отпуск (VACATION) с датами начала и окончания
 * - Инструктор может создать болезнь (SICK_LEAVE) без даты окончания
 * - При создании отсутствия слоты в этот период блокируются
 * - Инструктор может отметить возвращение — слоты разблокируются
 * - Если есть занятия в период отсутствия — они требуют переноса
 */

import type { AbsenceType, LessonStatus, SlotStatus } from '@letar/driving-school-db/prisma'
import {
  type AbsenceData,
  type AbsenceRepository,
  createAbsence,
  type CreateAbsenceResult,
  endAbsence,
  type EndAbsenceResult,
  getActiveAbsence,
  type GetActiveAbsenceResult,
  getAffectedLessons,
  type GetAffectedLessonsResult,
  type LessonData,
  type SlotData,
} from './absence-service'

// === Мок репозитория ===

const createMockRepository = (overrides: Partial<AbsenceRepository> = {}): AbsenceRepository => ({
  getInstructorProfile: vi.fn().mockResolvedValue(null),
  createAbsence: vi.fn().mockResolvedValue({ id: 'absence-1' }),
  updateAbsence: vi.fn().mockResolvedValue(undefined),
  getAbsenceById: vi.fn().mockResolvedValue(null),
  getActiveAbsenceByInstructor: vi.fn().mockResolvedValue(null),
  getSlotsInPeriod: vi.fn().mockResolvedValue([]),
  updateSlotStatus: vi.fn().mockResolvedValue(undefined),
  getLessonsInPeriod: vi.fn().mockResolvedValue([]),
  updateLessonStatus: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

// === Тестовые данные ===

const mockInstructorProfile = {
  id: 'instructor-profile-1',
  userId: 'instructor-1',
}

const mockAbsence: AbsenceData = {
  id: 'absence-1',
  instructorId: 'instructor-profile-1',
  type: 'VACATION' as AbsenceType,
  startDate: new Date('2025-01-20T00:00:00Z'),
  endDate: new Date('2025-01-27T00:00:00Z'),
  reason: 'Отпуск',
  isActive: true,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  returnedAt: null,
}

const mockSlot: SlotData = {
  id: 'slot-1',
  instructorId: 'instructor-profile-1',
  startTime: new Date('2025-01-21T10:00:00Z'),
  endTime: new Date('2025-01-21T11:30:00Z'),
  status: 'AVAILABLE' as SlotStatus,
}

const mockLesson: LessonData = {
  id: 'lesson-1',
  slotId: 'slot-1',
  studentId: 'student-1',
  instructorId: 'instructor-1',
  status: 'CONFIRMED' as LessonStatus,
}

// === Тесты ===

describe('Absence Service', () => {
  describe('createAbsence', () => {
    describe('VACATION (отпуск)', () => {
      it('должен создавать отпуск с датами начала и окончания', async () => {
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
          createAbsence: vi.fn().mockResolvedValue({ id: 'absence-1' }),
          getSlotsInPeriod: vi.fn().mockResolvedValue([]),
          getLessonsInPeriod: vi.fn().mockResolvedValue([]),
        })

        const result = await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'VACATION',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: new Date('2025-01-27T00:00:00Z'),
          reason: 'Отпуск',
          repo,
        })

        expect(result.success).toBe(true)
        expect((result as CreateAbsenceResult & { success: true }).absenceId).toBe('absence-1')
      })

      it('должен требовать дату окончания для отпуска', async () => {
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
        })

        const result = await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'VACATION',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: undefined, // Не указана дата окончания
          reason: 'Отпуск',
          repo,
        })

        expect(result.success).toBe(false)
        expect((result as CreateAbsenceResult & { success: false }).error).toBe('END_DATE_REQUIRED_FOR_VACATION')
      })

      it('должен возвращать ошибку если дата окончания раньше даты начала', async () => {
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
        })

        const result = await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'VACATION',
          startDate: new Date('2025-01-27T00:00:00Z'),
          endDate: new Date('2025-01-20T00:00:00Z'), // Раньше начала
          reason: 'Отпуск',
          repo,
        })

        expect(result.success).toBe(false)
        expect((result as CreateAbsenceResult & { success: false }).error).toBe('END_DATE_BEFORE_START_DATE')
      })
    })

    describe('SICK_LEAVE (болезнь)', () => {
      it('должен создавать болезнь без даты окончания', async () => {
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
          createAbsence: vi.fn().mockResolvedValue({ id: 'absence-2' }),
          getSlotsInPeriod: vi.fn().mockResolvedValue([]),
          getLessonsInPeriod: vi.fn().mockResolvedValue([]),
        })

        const result = await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'SICK_LEAVE',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: undefined,
          reason: 'Заболел',
          repo,
        })

        expect(result.success).toBe(true)
        expect((result as CreateAbsenceResult & { success: true }).absenceId).toBe('absence-2')
      })

      it('должен принимать дату окончания для болезни (опционально)', async () => {
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
          createAbsence: vi.fn().mockResolvedValue({ id: 'absence-3' }),
          getSlotsInPeriod: vi.fn().mockResolvedValue([]),
          getLessonsInPeriod: vi.fn().mockResolvedValue([]),
        })

        const result = await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'SICK_LEAVE',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: new Date('2025-01-25T00:00:00Z'),
          reason: 'Заболел',
          repo,
        })

        expect(result.success).toBe(true)
      })
    })

    describe('Проверки', () => {
      it('должен возвращать ошибку если инструктор не найден', async () => {
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(null),
        })

        const result = await createAbsence({
          instructorId: 'unknown-instructor',
          type: 'VACATION',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: new Date('2025-01-27T00:00:00Z'),
          reason: 'Отпуск',
          repo,
        })

        expect(result.success).toBe(false)
        expect((result as CreateAbsenceResult & { success: false }).error).toBe('INSTRUCTOR_NOT_FOUND')
      })

      it('должен возвращать ошибку если уже есть активное отсутствие', async () => {
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
          getActiveAbsenceByInstructor: vi.fn().mockResolvedValue(mockAbsence),
        })

        const result = await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'VACATION',
          startDate: new Date('2025-02-01T00:00:00Z'),
          endDate: new Date('2025-02-10T00:00:00Z'),
          reason: 'Ещё один отпуск',
          repo,
        })

        expect(result.success).toBe(false)
        expect((result as CreateAbsenceResult & { success: false }).error).toBe('ALREADY_HAS_ACTIVE_ABSENCE')
      })
    })

    describe('Блокировка слотов', () => {
      it('должен блокировать доступные слоты в период отсутствия', async () => {
        const updateSlotStatusMock = vi.fn().mockResolvedValue(undefined)
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
          createAbsence: vi.fn().mockResolvedValue({ id: 'absence-1' }),
          getSlotsInPeriod: vi.fn().mockResolvedValue([
            { ...mockSlot, id: 'slot-1', status: 'AVAILABLE' },
            { ...mockSlot, id: 'slot-2', status: 'AVAILABLE' },
          ]),
          getLessonsInPeriod: vi.fn().mockResolvedValue([]),
          updateSlotStatus: updateSlotStatusMock,
        })

        const result = await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'VACATION',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: new Date('2025-01-27T00:00:00Z'),
          reason: 'Отпуск',
          repo,
        })

        expect(result.success).toBe(true)
        expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-1', 'BLOCKED')
        expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-2', 'BLOCKED')
        expect((result as CreateAbsenceResult & { success: true }).blockedSlotsCount).toBe(2)
      })

      it('не должен блокировать уже забронированные слоты', async () => {
        const updateSlotStatusMock = vi.fn().mockResolvedValue(undefined)
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
          createAbsence: vi.fn().mockResolvedValue({ id: 'absence-1' }),
          getSlotsInPeriod: vi.fn().mockResolvedValue([
            { ...mockSlot, id: 'slot-1', status: 'AVAILABLE' },
            { ...mockSlot, id: 'slot-2', status: 'BOOKED' },
          ]),
          getLessonsInPeriod: vi.fn().mockResolvedValue([]),
          updateSlotStatus: updateSlotStatusMock,
        })

        await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'VACATION',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: new Date('2025-01-27T00:00:00Z'),
          reason: 'Отпуск',
          repo,
        })

        expect(updateSlotStatusMock).toHaveBeenCalledTimes(1)
        expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-1', 'BLOCKED')
      })
    })

    describe('Затронутые занятия', () => {
      it('должен возвращать количество затронутых занятий', async () => {
        const updateLessonStatusMock = vi.fn().mockResolvedValue(undefined)
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
          createAbsence: vi.fn().mockResolvedValue({ id: 'absence-1' }),
          getSlotsInPeriod: vi.fn().mockResolvedValue([]),
          getLessonsInPeriod: vi.fn().mockResolvedValue([
            { ...mockLesson, id: 'lesson-1', status: 'CONFIRMED' },
            { ...mockLesson, id: 'lesson-2', status: 'PENDING' },
          ]),
          updateLessonStatus: updateLessonStatusMock,
        })

        const result = await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'VACATION',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: new Date('2025-01-27T00:00:00Z'),
          reason: 'Отпуск',
          repo,
        })

        expect(result.success).toBe(true)
        expect((result as CreateAbsenceResult & { success: true }).affectedLessonsCount).toBe(2)
      })

      it('должен помечать подтверждённые занятия как требующие переноса', async () => {
        const updateLessonStatusMock = vi.fn().mockResolvedValue(undefined)
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
          createAbsence: vi.fn().mockResolvedValue({ id: 'absence-1' }),
          getSlotsInPeriod: vi.fn().mockResolvedValue([]),
          getLessonsInPeriod: vi.fn().mockResolvedValue([{ ...mockLesson, id: 'lesson-1', status: 'CONFIRMED' }]),
          updateLessonStatus: updateLessonStatusMock,
        })

        await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'VACATION',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: new Date('2025-01-27T00:00:00Z'),
          reason: 'Отпуск',
          repo,
        })

        expect(updateLessonStatusMock).toHaveBeenCalledWith('lesson-1', 'NEEDS_RESCHEDULE')
      })

      it('должен помечать ожидающие занятия как требующие переноса', async () => {
        const updateLessonStatusMock = vi.fn().mockResolvedValue(undefined)
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
          createAbsence: vi.fn().mockResolvedValue({ id: 'absence-1' }),
          getSlotsInPeriod: vi.fn().mockResolvedValue([]),
          getLessonsInPeriod: vi.fn().mockResolvedValue([{ ...mockLesson, id: 'lesson-1', status: 'PENDING' }]),
          updateLessonStatus: updateLessonStatusMock,
        })

        await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'VACATION',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: new Date('2025-01-27T00:00:00Z'),
          reason: 'Отпуск',
          repo,
        })

        expect(updateLessonStatusMock).toHaveBeenCalledWith('lesson-1', 'NEEDS_RESCHEDULE')
      })

      it('не должен затрагивать уже отменённые или завершённые занятия', async () => {
        const updateLessonStatusMock = vi.fn().mockResolvedValue(undefined)
        const repo = createMockRepository({
          getInstructorProfile: vi.fn().mockResolvedValue(mockInstructorProfile),
          createAbsence: vi.fn().mockResolvedValue({ id: 'absence-1' }),
          getSlotsInPeriod: vi.fn().mockResolvedValue([]),
          getLessonsInPeriod: vi.fn().mockResolvedValue([
            { ...mockLesson, id: 'lesson-1', status: 'CANCELLED' },
            { ...mockLesson, id: 'lesson-2', status: 'COMPLETED' },
          ]),
          updateLessonStatus: updateLessonStatusMock,
        })

        const result = await createAbsence({
          instructorId: 'instructor-profile-1',
          type: 'VACATION',
          startDate: new Date('2025-01-20T00:00:00Z'),
          endDate: new Date('2025-01-27T00:00:00Z'),
          reason: 'Отпуск',
          repo,
        })

        expect(updateLessonStatusMock).not.toHaveBeenCalled()
        expect((result as CreateAbsenceResult & { success: true }).affectedLessonsCount).toBe(0)
      })
    })
  })

  describe('endAbsence', () => {
    it('должен завершать отсутствие при возвращении инструктора', async () => {
      const updateAbsenceMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getAbsenceById: vi.fn().mockResolvedValue(mockAbsence),
        updateAbsence: updateAbsenceMock,
        getSlotsInPeriod: vi.fn().mockResolvedValue([]),
      })

      const result = await endAbsence('absence-1', repo)

      expect(result.success).toBe(true)
      expect(updateAbsenceMock).toHaveBeenCalledWith('absence-1', {
        isActive: false,
        returnedAt: expect.any(Date),
      })
    })

    it('должен возвращать ошибку если отсутствие не найдено', async () => {
      const repo = createMockRepository({
        getAbsenceById: vi.fn().mockResolvedValue(null),
      })

      const result = await endAbsence('unknown-absence', repo)

      expect(result.success).toBe(false)
      expect((result as EndAbsenceResult & { success: false }).error).toBe('ABSENCE_NOT_FOUND')
    })

    it('должен возвращать ошибку если отсутствие уже завершено', async () => {
      const inactiveAbsence = { ...mockAbsence, isActive: false }
      const repo = createMockRepository({
        getAbsenceById: vi.fn().mockResolvedValue(inactiveAbsence),
      })

      const result = await endAbsence('absence-1', repo)

      expect(result.success).toBe(false)
      expect((result as EndAbsenceResult & { success: false }).error).toBe('ABSENCE_ALREADY_ENDED')
    })

    it('должен разблокировать слоты после возвращения', async () => {
      const now = new Date()
      const futureSlot1 = {
        ...mockSlot,
        id: 'slot-1',
        status: 'BLOCKED' as SlotStatus,
        startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Завтра
      }
      const futureSlot2 = {
        ...mockSlot,
        id: 'slot-2',
        status: 'BLOCKED' as SlotStatus,
        startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000), // Послезавтра
      }
      const updateSlotStatusMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getAbsenceById: vi.fn().mockResolvedValue(mockAbsence),
        updateAbsence: vi.fn().mockResolvedValue(undefined),
        getSlotsInPeriod: vi.fn().mockResolvedValue([futureSlot1, futureSlot2]),
        updateSlotStatus: updateSlotStatusMock,
      })

      const result = await endAbsence('absence-1', repo)

      expect(result.success).toBe(true)
      expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-1', 'AVAILABLE')
      expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-2', 'AVAILABLE')
      expect((result as EndAbsenceResult & { success: true }).unblockedSlotsCount).toBe(2)
    })

    it('должен разблокировать только будущие слоты', async () => {
      const now = new Date()
      const pastSlot = {
        ...mockSlot,
        id: 'slot-past',
        status: 'BLOCKED' as SlotStatus,
        startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Вчера
      }
      const futureSlot = {
        ...mockSlot,
        id: 'slot-future',
        status: 'BLOCKED' as SlotStatus,
        startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Завтра
      }
      const updateSlotStatusMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getAbsenceById: vi.fn().mockResolvedValue(mockAbsence),
        updateAbsence: vi.fn().mockResolvedValue(undefined),
        getSlotsInPeriod: vi.fn().mockResolvedValue([pastSlot, futureSlot]),
        updateSlotStatus: updateSlotStatusMock,
      })

      await endAbsence('absence-1', repo)

      expect(updateSlotStatusMock).toHaveBeenCalledTimes(1)
      expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-future', 'AVAILABLE')
    })

    it('не должен разблокировать забронированные слоты', async () => {
      const updateSlotStatusMock = vi.fn().mockResolvedValue(undefined)
      const now = new Date()
      const repo = createMockRepository({
        getAbsenceById: vi.fn().mockResolvedValue(mockAbsence),
        updateAbsence: vi.fn().mockResolvedValue(undefined),
        getSlotsInPeriod: vi.fn().mockResolvedValue([
          {
            ...mockSlot,
            id: 'slot-1',
            status: 'BLOCKED' as SlotStatus,
            startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
          {
            ...mockSlot,
            id: 'slot-2',
            status: 'BOOKED' as SlotStatus,
            startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
          },
        ]),
        updateSlotStatus: updateSlotStatusMock,
      })

      await endAbsence('absence-1', repo)

      expect(updateSlotStatusMock).toHaveBeenCalledTimes(1)
      expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-1', 'AVAILABLE')
    })
  })

  describe('getActiveAbsence', () => {
    it('должен возвращать активное отсутствие инструктора', async () => {
      const repo = createMockRepository({
        getActiveAbsenceByInstructor: vi.fn().mockResolvedValue(mockAbsence),
      })

      const result = await getActiveAbsence('instructor-profile-1', repo)

      expect(result.success).toBe(true)
      expect((result as GetActiveAbsenceResult & { success: true }).absence).toEqual(mockAbsence)
    })

    it('должен возвращать null если нет активного отсутствия', async () => {
      const repo = createMockRepository({
        getActiveAbsenceByInstructor: vi.fn().mockResolvedValue(null),
      })

      const result = await getActiveAbsence('instructor-profile-1', repo)

      expect(result.success).toBe(true)
      expect((result as GetActiveAbsenceResult & { success: true }).absence).toBeNull()
    })
  })

  describe('getAffectedLessons', () => {
    it('должен возвращать список затронутых занятий в период отсутствия', async () => {
      const repo = createMockRepository({
        getAbsenceById: vi.fn().mockResolvedValue(mockAbsence),
        getLessonsInPeriod: vi.fn().mockResolvedValue([
          { ...mockLesson, id: 'lesson-1', status: 'CONFIRMED' },
          { ...mockLesson, id: 'lesson-2', status: 'PENDING' },
        ]),
      })

      const result = await getAffectedLessons('absence-1', repo)

      expect(result.success).toBe(true)
      expect((result as GetAffectedLessonsResult & { success: true }).lessons).toHaveLength(2)
    })

    it('должен возвращать ошибку если отсутствие не найдено', async () => {
      const repo = createMockRepository({
        getAbsenceById: vi.fn().mockResolvedValue(null),
      })

      const result = await getAffectedLessons('unknown-absence', repo)

      expect(result.success).toBe(false)
      expect((result as GetAffectedLessonsResult & { success: false }).error).toBe('ABSENCE_NOT_FOUND')
    })

    it('должен возвращать только активные занятия (PENDING, CONFIRMED, NEEDS_RESCHEDULE)', async () => {
      const repo = createMockRepository({
        getAbsenceById: vi.fn().mockResolvedValue(mockAbsence),
        getLessonsInPeriod: vi.fn().mockResolvedValue([
          { ...mockLesson, id: 'lesson-1', status: 'CONFIRMED' },
          { ...mockLesson, id: 'lesson-2', status: 'CANCELLED' },
          { ...mockLesson, id: 'lesson-3', status: 'COMPLETED' },
          { ...mockLesson, id: 'lesson-4', status: 'NEEDS_RESCHEDULE' },
        ]),
      })

      const result = await getAffectedLessons('absence-1', repo)

      expect(result.success).toBe(true)
      const lessons = (result as GetAffectedLessonsResult & { success: true }).lessons
      expect(lessons).toHaveLength(2)
      expect(lessons.map((l) => l.id)).toEqual(['lesson-1', 'lesson-4'])
    })
  })
})
