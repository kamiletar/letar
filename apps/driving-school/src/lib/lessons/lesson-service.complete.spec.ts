// Тесты завершения, подтверждения занятий и неявки
import type { LessonStatus } from '@letar/driving-school-db/prisma'
import { completeLesson, confirmLesson, markNoShow } from './lesson-service'
import { createMockLesson, type MockLesson, type MockLessonWithSlot, noop } from './lesson-service.mocks'

describe('confirmLesson', () => {
  it('должен подтвердить занятие со статусом PENDING', async () => {
    // Arrange
    const lesson: MockLesson & { slot: { startTime: Date; endTime: Date } } = {
      ...createMockLesson({ status: 'PENDING' }),
      slot: {
        startTime: new Date('2025-01-10T09:00:00'),
        endTime: new Date('2025-01-10T10:30:00'),
      },
    }

    // Act
    const result = await confirmLesson('lesson-1', 'instructor-1', {
      getLesson: async () => lesson,
      getStudentLessonsForConflictCheck: async () => [],
      updateLessonStatus: async (id, status) => ({ ...lesson, id, status }),
    })

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.lesson.status).toBe('CONFIRMED')
    }
  })

  it('не должен подтверждать уже подтверждённое занятие', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CONFIRMED' })

    // Act
    const result = await confirmLesson('lesson-1', 'instructor-1', {
      getLesson: async () => lesson,
      getStudentLessonsForConflictCheck: async () => [],
      updateLessonStatus: async () => {
        throw new Error('Should not be called')
      },
    })

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('INVALID_STATUS')
    }
  })

  it('должен вернуть ошибку для несуществующего занятия', async () => {
    // Act
    const result = await confirmLesson('non-existent', 'instructor-1', {
      getLesson: async () => null,
      getStudentLessonsForConflictCheck: async () => [],
      updateLessonStatus: async () => {
        throw new Error('Should not be called')
      },
    })

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('LESSON_NOT_FOUND')
    }
  })

  it('должен вернуть ошибку если подтверждает не инструктор', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'PENDING', instructorId: 'instructor-1' })

    // Act
    const result = await confirmLesson('lesson-1', 'another-instructor', {
      getLesson: async () => lesson,
      getStudentLessonsForConflictCheck: async () => [],
      updateLessonStatus: async () => {
        throw new Error('Should not be called')
      },
    })

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_AUTHORIZED')
    }
  })

  describe('проверка пересечения при подтверждении', () => {
    // BUG-2: Проверка пересечения при подтверждении занятия
    it('должен вернуть ошибку если у ученика уже есть подтверждённое занятие в это время', async () => {
      // Arrange: занятие на 09:00-10:30, у ученика уже есть CONFIRMED занятие в то же время
      const lesson: MockLesson & { slot: { startTime: Date; endTime: Date } } = {
        ...createMockLesson({ status: 'PENDING', studentId: 'student-1' }),
        slot: {
          startTime: new Date('2025-01-10T09:00:00'),
          endTime: new Date('2025-01-10T10:30:00'),
        },
      }
      const existingLesson: MockLessonWithSlot = {
        id: 'existing-lesson',
        slotId: 'slot-2',
        studentId: 'student-1',
        instructorId: 'instructor-2',
        status: 'CONFIRMED',
        createdBy: 'student-1',
        slot: {
          startTime: new Date('2025-01-10T09:00:00'),
          endTime: new Date('2025-01-10T10:30:00'),
        },
      }

      // Act
      const result = await confirmLesson('lesson-1', 'instructor-1', {
        getLesson: async () => lesson,
        getStudentLessonsForConflictCheck: async () => [existingLesson],
        updateLessonStatus: async () => {
          throw new Error('Should not be called')
        },
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('STUDENT_TIME_CONFLICT')
      }
    })

    it('должен вернуть ошибку если занятие частично пересекается при подтверждении', async () => {
      // Arrange: занятие на 10:00-11:30, существующее на 09:00-10:30 (пересечение 30 мин)
      const lesson: MockLesson & { slot: { startTime: Date; endTime: Date } } = {
        ...createMockLesson({ status: 'PENDING', studentId: 'student-1' }),
        slot: {
          startTime: new Date('2025-01-10T10:00:00'),
          endTime: new Date('2025-01-10T11:30:00'),
        },
      }
      const existingLesson: MockLessonWithSlot = {
        id: 'existing-lesson',
        slotId: 'slot-2',
        studentId: 'student-1',
        instructorId: 'instructor-2',
        status: 'CONFIRMED',
        createdBy: 'student-1',
        slot: {
          startTime: new Date('2025-01-10T09:00:00'),
          endTime: new Date('2025-01-10T10:30:00'),
        },
      }

      // Act
      const result = await confirmLesson('lesson-1', 'instructor-1', {
        getLesson: async () => lesson,
        getStudentLessonsForConflictCheck: async () => [existingLesson],
        updateLessonStatus: async () => {
          throw new Error('Should not be called')
        },
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('STUDENT_TIME_CONFLICT')
      }
    })

    it('должен подтвердить занятие если нет пересечений', async () => {
      // Arrange: занятие на 12:00-13:30, существующее на 09:00-10:30 (нет пересечения)
      const lesson: MockLesson & { slot: { startTime: Date; endTime: Date } } = {
        ...createMockLesson({ status: 'PENDING', studentId: 'student-1' }),
        slot: {
          startTime: new Date('2025-01-10T12:00:00'),
          endTime: new Date('2025-01-10T13:30:00'),
        },
      }
      const existingLesson: MockLessonWithSlot = {
        id: 'existing-lesson',
        slotId: 'slot-2',
        studentId: 'student-1',
        instructorId: 'instructor-2',
        status: 'CONFIRMED',
        createdBy: 'student-1',
        slot: {
          startTime: new Date('2025-01-10T09:00:00'),
          endTime: new Date('2025-01-10T10:30:00'),
        },
      }

      // Act
      const result = await confirmLesson('lesson-1', 'instructor-1', {
        getLesson: async () => lesson,
        getStudentLessonsForConflictCheck: async () => [existingLesson],
        updateLessonStatus: async (id, status) => ({ ...lesson, id, status }),
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.lesson.status).toBe('CONFIRMED')
      }
    })
  })
})

describe('completeLesson', () => {
  it('должен завершить занятие со статусом COMPLETED', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CONFIRMED' })

    // Act
    const result = await completeLesson('lesson-1', 'instructor-1', undefined, {
      getLesson: async () => lesson,
      updateLesson: async (id, data) => ({ ...lesson, ...data, status: 'COMPLETED' as LessonStatus }),
      updateConnectionStats: noop,
    })

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.lesson.status).toBe('COMPLETED')
    }
  })

  it('должен добавлять заметку инструктора', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CONFIRMED' })
    const notes = 'Ученик хорошо справился с парковкой'

    // Act
    const result = await completeLesson('lesson-1', 'instructor-1', notes, {
      getLesson: async () => lesson,
      updateLesson: async (id, data) => ({ ...lesson, ...data, status: 'COMPLETED' as LessonStatus }),
      updateConnectionStats: noop,
    })

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.lesson.instructorNotes).toBe(notes)
    }
  })

  it('должен обновлять статистику связи при завершении', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CONFIRMED', studentId: 'student-1', instructorId: 'instructor-1' })
    let statsUpdated = false

    // Act
    await completeLesson('lesson-1', 'instructor-1', undefined, {
      getLesson: async () => lesson,
      updateLesson: async (id, data) => ({ ...lesson, ...data, status: 'COMPLETED' as LessonStatus }),
      updateConnectionStats: async (studentId, instructorId, type) => {
        expect(studentId).toBe('student-1')
        expect(instructorId).toBe('instructor-1')
        expect(type).toBe('COMPLETED')
        statsUpdated = true
      },
    })

    // Assert
    expect(statsUpdated).toBe(true)
  })

  it('не должен завершать занятие со статусом PENDING', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'PENDING' })

    // Act
    const result = await completeLesson('lesson-1', 'instructor-1', undefined, {
      getLesson: async () => lesson,
      updateLesson: async () => {
        throw new Error('Should not be called')
      },
      updateConnectionStats: noop,
    })

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('INVALID_STATUS')
    }
  })
})

describe('markNoShow', () => {
  it('должен отметить неявку со статусом NO_SHOW', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CONFIRMED' })

    // Act
    const result = await markNoShow('lesson-1', 'instructor-1', {
      getLesson: async () => lesson,
      updateLesson: async (id, data) => ({ ...lesson, ...data, status: 'NO_SHOW' as LessonStatus }),
      updateConnectionStats: noop,
    })

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.lesson.status).toBe('NO_SHOW')
    }
  })

  it('должен обновлять статистику неявок', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'CONFIRMED', studentId: 'student-1', instructorId: 'instructor-1' })
    let statsType: string | null = null

    // Act
    await markNoShow('lesson-1', 'instructor-1', {
      getLesson: async () => lesson,
      updateLesson: async (id, data) => ({ ...lesson, ...data, status: 'NO_SHOW' as LessonStatus }),
      updateConnectionStats: async (studentId, instructorId, type) => {
        statsType = type
      },
    })

    // Assert
    expect(statsType).toBe('NO_SHOW')
  })

  it('не должен отмечать неявку для неподтверждённого занятия', async () => {
    // Arrange
    const lesson = createMockLesson({ status: 'PENDING' })

    // Act
    const result = await markNoShow('lesson-1', 'instructor-1', {
      getLesson: async () => lesson,
      updateLesson: async () => {
        throw new Error('Should not be called')
      },
      updateConnectionStats: noop,
    })

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('INVALID_STATUS')
    }
  })
})
