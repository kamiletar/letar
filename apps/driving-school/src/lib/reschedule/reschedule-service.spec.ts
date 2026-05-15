/**
 * Тесты для бизнес-логики переноса занятий
 *
 * TDD: Сначала пишем тесты, потом реализацию
 *
 * Бизнес-логика:
 * - requestReschedule — пометить занятие как требующее переноса (NEEDS_RESCHEDULE)
 * - rescheduleLesson — перенести занятие на новый слот:
 *   - Старое занятие получает статус RESCHEDULED + ссылку на новое
 *   - Новое занятие создаётся со статусом CONFIRMED
 *   - Старый слот возвращается в AVAILABLE
 *   - Новый слот становится BOOKED
 */

import type { LessonStatus, SlotStatus } from '@letar/driving-school-db/prisma'
import {
  type LessonData,
  requestReschedule,
  type RequestRescheduleResult,
  rescheduleLesson,
  type RescheduleLessonResult,
  type RescheduleRepository,
  type SlotData,
} from './reschedule-service'

// === Мок репозитория ===

const createMockRepository = (overrides: Partial<RescheduleRepository> = {}): RescheduleRepository => ({
  getLesson: vi.fn().mockResolvedValue(null),
  getSlot: vi.fn().mockResolvedValue(null),
  updateLessonStatus: vi.fn().mockResolvedValue(undefined),
  updateSlotStatus: vi.fn().mockResolvedValue(undefined),
  createLesson: vi.fn().mockResolvedValue({ id: 'new-lesson-1' }),
  linkRescheduledLessons: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

// === Тестовые данные ===

const mockSlot: SlotData = {
  id: 'slot-1',
  instructorId: 'instructor-1',
  startTime: new Date('2025-01-15T14:00:00Z'),
  endTime: new Date('2025-01-15T15:30:00Z'),
  status: 'BOOKED' as SlotStatus,
}

const mockAvailableSlot: SlotData = {
  id: 'slot-2',
  instructorId: 'instructor-1',
  startTime: new Date('2025-01-16T14:00:00Z'),
  endTime: new Date('2025-01-16T15:30:00Z'),
  status: 'AVAILABLE' as SlotStatus,
}

const mockLesson: LessonData = {
  id: 'lesson-1',
  slotId: 'slot-1',
  studentId: 'student-1',
  instructorId: 'instructor-1',
  status: 'CONFIRMED' as LessonStatus,
  createdBy: 'student-1',
  rescheduledToId: null,
}

// === Тесты ===

describe('Reschedule Service', () => {
  describe('requestReschedule', () => {
    it('должен помечать занятие как требующее переноса', async () => {
      const updateLessonStatusMock = vi.fn().mockResolvedValue({
        ...mockLesson,
        status: 'NEEDS_RESCHEDULE',
      })
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(mockLesson),
        updateLessonStatus: updateLessonStatusMock,
      })

      const result = await requestReschedule('lesson-1', repo)

      expect(result.success).toBe(true)
      expect(updateLessonStatusMock).toHaveBeenCalledWith('lesson-1', 'NEEDS_RESCHEDULE')
    })

    it('должен возвращать ошибку если занятие не найдено', async () => {
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(null),
      })

      const result = await requestReschedule('unknown-lesson', repo)

      expect(result.success).toBe(false)
      expect((result as RequestRescheduleResult & { success: false }).error).toBe('LESSON_NOT_FOUND')
    })

    it('должен возвращать ошибку если занятие уже отменено', async () => {
      const cancelledLesson = { ...mockLesson, status: 'CANCELLED' as LessonStatus }
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(cancelledLesson),
      })

      const result = await requestReschedule('lesson-1', repo)

      expect(result.success).toBe(false)
      expect((result as RequestRescheduleResult & { success: false }).error).toBe('INVALID_STATUS')
    })

    it('должен возвращать ошибку если занятие уже завершено', async () => {
      const completedLesson = { ...mockLesson, status: 'COMPLETED' as LessonStatus }
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(completedLesson),
      })

      const result = await requestReschedule('lesson-1', repo)

      expect(result.success).toBe(false)
      expect((result as RequestRescheduleResult & { success: false }).error).toBe('INVALID_STATUS')
    })

    it('должен возвращать ошибку если занятие уже перенесено', async () => {
      const rescheduledLesson = { ...mockLesson, status: 'RESCHEDULED' as LessonStatus }
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(rescheduledLesson),
      })

      const result = await requestReschedule('lesson-1', repo)

      expect(result.success).toBe(false)
      expect((result as RequestRescheduleResult & { success: false }).error).toBe('INVALID_STATUS')
    })

    it('должен работать для занятия со статусом PENDING', async () => {
      const pendingLesson = { ...mockLesson, status: 'PENDING' as LessonStatus }
      const updateLessonStatusMock = vi.fn().mockResolvedValue({
        ...pendingLesson,
        status: 'NEEDS_RESCHEDULE',
      })
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(pendingLesson),
        updateLessonStatus: updateLessonStatusMock,
      })

      const result = await requestReschedule('lesson-1', repo)

      expect(result.success).toBe(true)
    })

    it('должен работать для занятия со статусом NEEDS_RESCHEDULE (идемпотентность)', async () => {
      const needsRescheduleLesson = { ...mockLesson, status: 'NEEDS_RESCHEDULE' as LessonStatus }
      const updateLessonStatusMock = vi.fn().mockResolvedValue(needsRescheduleLesson)
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(needsRescheduleLesson),
        updateLessonStatus: updateLessonStatusMock,
      })

      const result = await requestReschedule('lesson-1', repo)

      expect(result.success).toBe(true)
    })
  })

  describe('rescheduleLesson', () => {
    it('должен переносить занятие на новый слот', async () => {
      const createLessonMock = vi.fn().mockResolvedValue({ id: 'new-lesson-1' })
      const linkMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(mockLesson),
        getSlot: vi
          .fn()
          .mockResolvedValueOnce(mockSlot) // старый слот
          .mockResolvedValueOnce(mockAvailableSlot), // новый слот
        createLesson: createLessonMock,
        linkRescheduledLessons: linkMock,
      })

      const result = await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(result.success).toBe(true)
      expect((result as RescheduleLessonResult & { success: true }).newLessonId).toBe('new-lesson-1')
    })

    it('должен устанавливать статус RESCHEDULED для старого занятия', async () => {
      const updateLessonStatusMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(mockLesson),
        getSlot: vi.fn().mockResolvedValueOnce(mockSlot).mockResolvedValueOnce(mockAvailableSlot),
        createLesson: vi.fn().mockResolvedValue({ id: 'new-lesson-1' }),
        updateLessonStatus: updateLessonStatusMock,
      })

      await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(updateLessonStatusMock).toHaveBeenCalledWith('lesson-1', 'RESCHEDULED')
    })

    it('должен создавать новое занятие со статусом CONFIRMED', async () => {
      const createLessonMock = vi.fn().mockResolvedValue({ id: 'new-lesson-1' })
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(mockLesson),
        getSlot: vi.fn().mockResolvedValueOnce(mockSlot).mockResolvedValueOnce(mockAvailableSlot),
        createLesson: createLessonMock,
      })

      await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(createLessonMock).toHaveBeenCalledWith({
        slotId: 'slot-2',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        status: 'CONFIRMED',
        createdBy: 'student-1',
      })
    })

    it('должен освобождать старый слот', async () => {
      const updateSlotStatusMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(mockLesson),
        getSlot: vi.fn().mockResolvedValueOnce(mockSlot).mockResolvedValueOnce(mockAvailableSlot),
        createLesson: vi.fn().mockResolvedValue({ id: 'new-lesson-1' }),
        updateSlotStatus: updateSlotStatusMock,
      })

      await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-1', 'AVAILABLE')
    })

    it('должен бронировать новый слот', async () => {
      const updateSlotStatusMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(mockLesson),
        getSlot: vi.fn().mockResolvedValueOnce(mockSlot).mockResolvedValueOnce(mockAvailableSlot),
        createLesson: vi.fn().mockResolvedValue({ id: 'new-lesson-1' }),
        updateSlotStatus: updateSlotStatusMock,
      })

      await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-2', 'BOOKED')
    })

    it('должен связывать старое и новое занятие', async () => {
      const linkMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(mockLesson),
        getSlot: vi.fn().mockResolvedValueOnce(mockSlot).mockResolvedValueOnce(mockAvailableSlot),
        createLesson: vi.fn().mockResolvedValue({ id: 'new-lesson-1' }),
        linkRescheduledLessons: linkMock,
      })

      await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(linkMock).toHaveBeenCalledWith('lesson-1', 'new-lesson-1')
    })

    it('должен возвращать ошибку если занятие не найдено', async () => {
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(null),
      })

      const result = await rescheduleLesson({
        lessonId: 'unknown-lesson',
        newSlotId: 'slot-2',
        repo,
      })

      expect(result.success).toBe(false)
      expect((result as RescheduleLessonResult & { success: false }).error).toBe('LESSON_NOT_FOUND')
    })

    it('должен возвращать ошибку если новый слот не найден', async () => {
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(mockLesson),
        getSlot: vi.fn().mockResolvedValueOnce(mockSlot).mockResolvedValueOnce(null),
      })

      const result = await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'unknown-slot',
        repo,
      })

      expect(result.success).toBe(false)
      expect((result as RescheduleLessonResult & { success: false }).error).toBe('NEW_SLOT_NOT_FOUND')
    })

    it('должен возвращать ошибку если новый слот недоступен', async () => {
      const bookedSlot = { ...mockAvailableSlot, status: 'BOOKED' as SlotStatus }
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(mockLesson),
        getSlot: vi.fn().mockResolvedValueOnce(mockSlot).mockResolvedValueOnce(bookedSlot),
      })

      const result = await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(result.success).toBe(false)
      expect((result as RescheduleLessonResult & { success: false }).error).toBe('NEW_SLOT_NOT_AVAILABLE')
    })

    it('должен возвращать ошибку если занятие уже отменено', async () => {
      const cancelledLesson = { ...mockLesson, status: 'CANCELLED' as LessonStatus }
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(cancelledLesson),
      })

      const result = await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(result.success).toBe(false)
      expect((result as RescheduleLessonResult & { success: false }).error).toBe('INVALID_STATUS')
    })

    it('должен возвращать ошибку если занятие уже завершено', async () => {
      const completedLesson = { ...mockLesson, status: 'COMPLETED' as LessonStatus }
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(completedLesson),
      })

      const result = await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(result.success).toBe(false)
      expect((result as RescheduleLessonResult & { success: false }).error).toBe('INVALID_STATUS')
    })

    it('должен возвращать ошибку если занятие уже перенесено', async () => {
      const rescheduledLesson = { ...mockLesson, status: 'RESCHEDULED' as LessonStatus }
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(rescheduledLesson),
      })

      const result = await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(result.success).toBe(false)
      expect((result as RescheduleLessonResult & { success: false }).error).toBe('INVALID_STATUS')
    })

    it('должен возвращать ошибку если новый слот принадлежит другому инструктору', async () => {
      const otherInstructorSlot = { ...mockAvailableSlot, instructorId: 'other-instructor' }
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(mockLesson),
        getSlot: vi.fn().mockResolvedValueOnce(mockSlot).mockResolvedValueOnce(otherInstructorSlot),
      })

      const result = await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(result.success).toBe(false)
      expect((result as RescheduleLessonResult & { success: false }).error).toBe('SLOT_INSTRUCTOR_MISMATCH')
    })

    it('должен работать для занятия со статусом PENDING', async () => {
      const pendingLesson = { ...mockLesson, status: 'PENDING' as LessonStatus }
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(pendingLesson),
        getSlot: vi.fn().mockResolvedValueOnce(mockSlot).mockResolvedValueOnce(mockAvailableSlot),
        createLesson: vi.fn().mockResolvedValue({ id: 'new-lesson-1' }),
      })

      const result = await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(result.success).toBe(true)
    })

    it('должен работать для занятия со статусом NEEDS_RESCHEDULE', async () => {
      const needsRescheduleLesson = { ...mockLesson, status: 'NEEDS_RESCHEDULE' as LessonStatus }
      const repo = createMockRepository({
        getLesson: vi.fn().mockResolvedValue(needsRescheduleLesson),
        getSlot: vi.fn().mockResolvedValueOnce(mockSlot).mockResolvedValueOnce(mockAvailableSlot),
        createLesson: vi.fn().mockResolvedValue({ id: 'new-lesson-1' }),
      })

      const result = await rescheduleLesson({
        lessonId: 'lesson-1',
        newSlotId: 'slot-2',
        repo,
      })

      expect(result.success).toBe(true)
    })
  })
})
