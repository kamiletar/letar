// Тесты отмены занятий
import type { LessonStatus, SlotStatus } from '@letar/driving-school-db/prisma'
import { cancelLesson } from './lesson-service'
import { createMockInstructorProfile, createMockLesson, createMockSlot, noop } from './lesson-service.mocks'

describe('cancelLesson', () => {
  it('должен отменить занятие и установить статус CANCELLED', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CONFIRMED' })
    const now = new Date('2025-01-09T10:00:00') // За 23 часа до занятия

    // Act
    const result = await cancelLesson(
      'lesson-1',
      'student-1',
      'Не смогу приехать',
      {
        getLesson: async () => lesson,
        getSlot: async () => createMockSlot(),
        updateLesson: async (id, data) => ({
          ...lesson,
          ...data,
          status: 'CANCELLED' as LessonStatus,
        }),
        updateSlotStatus: noop,
        getInstructorProfile: async () => createMockInstructorProfile(),
      },
      now
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.lesson.status).toBe('CANCELLED')
      expect(result.lesson.cancelledBy).toBe('student-1')
      expect(result.lesson.cancelReason).toBe('Не смогу приехать')
    }
  })

  it('должен возвращать слот в статус AVAILABLE при отмене', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CONFIRMED' })
    let updatedSlotStatus: SlotStatus | null = null

    // Act
    await cancelLesson(
      'lesson-1',
      'student-1',
      undefined,
      {
        getLesson: async () => lesson,
        getSlot: async () => createMockSlot({ status: 'BOOKED' }),
        updateLesson: async (id, data) => ({ ...lesson, ...data, status: 'CANCELLED' as LessonStatus }),
        updateSlotStatus: async (slotId, status) => {
          updatedSlotStatus = status
        },
        getInstructorProfile: async () => createMockInstructorProfile(),
      },
      new Date()
    )

    // Assert
    expect(updatedSlotStatus).toBe('AVAILABLE')
  })

  it('должен фиксировать время отмены', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'PENDING' })
    const cancelTime = new Date('2025-01-08T15:30:00')

    // Act
    const result = await cancelLesson(
      'lesson-1',
      'instructor-1',
      undefined,
      {
        getLesson: async () => lesson,
        getSlot: async () => createMockSlot(),
        updateLesson: async (id, data) => ({ ...lesson, ...data, status: 'CANCELLED' as LessonStatus }),
        updateSlotStatus: noop,
        getInstructorProfile: async () => createMockInstructorProfile(),
      },
      cancelTime
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.lesson.cancelledAt).toEqual(cancelTime)
    }
  })

  it('должен определять позднюю отмену для расчёта штрафа', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CONFIRMED' })
    const slot = createMockSlot({ startTime: new Date('2025-01-10T09:00:00') })
    const cancelTime = new Date('2025-01-09T10:00:00') // За 23 часа (меньше 24)
    const instructorProfile = createMockInstructorProfile({ lateCancelHours: 24 })

    // Act
    const result = await cancelLesson(
      'lesson-1',
      'student-1',
      undefined,
      {
        getLesson: async () => lesson,
        getSlot: async () => slot,
        updateLesson: async (id, data) => ({ ...lesson, ...data, status: 'CANCELLED' as LessonStatus }),
        updateSlotStatus: noop,
        getInstructorProfile: async () => instructorProfile,
      },
      cancelTime
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.isLateCancellation).toBe(true)
    }
  })

  it('не должен считать позднюю отмену если времени достаточно', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CONFIRMED' })
    const slot = createMockSlot({ startTime: new Date('2025-01-10T09:00:00') })
    const cancelTime = new Date('2025-01-08T08:00:00') // За 49 часов (больше 24)
    const instructorProfile = createMockInstructorProfile({ lateCancelHours: 24 })

    // Act
    const result = await cancelLesson(
      'lesson-1',
      'student-1',
      undefined,
      {
        getLesson: async () => lesson,
        getSlot: async () => slot,
        updateLesson: async (id, data) => ({ ...lesson, ...data, status: 'CANCELLED' as LessonStatus }),
        updateSlotStatus: noop,
        getInstructorProfile: async () => instructorProfile,
      },
      cancelTime
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.isLateCancellation).toBe(false)
    }
  })

  it('не должен отменять уже отменённое занятие', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CANCELLED' })

    // Act
    const result = await cancelLesson('lesson-1', 'student-1', undefined, {
      getLesson: async () => lesson,
      getSlot: async () => createMockSlot(),
      updateLesson: async () => {
        throw new Error('Should not be called')
      },
      updateSlotStatus: noop,
      getInstructorProfile: async () => createMockInstructorProfile(),
    })

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('INVALID_STATUS')
    }
  })

  it('не должен отменять завершённое занятие', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'COMPLETED' })

    // Act
    const result = await cancelLesson('lesson-1', 'student-1', undefined, {
      getLesson: async () => lesson,
      getSlot: async () => createMockSlot(),
      updateLesson: async () => {
        throw new Error('Should not be called')
      },
      updateSlotStatus: noop,
      getInstructorProfile: async () => createMockInstructorProfile(),
    })

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('INVALID_STATUS')
    }
  })
})
