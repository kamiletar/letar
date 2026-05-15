// Тесты создания занятий
import type { SlotStatus } from '@letar/driving-school-db/prisma'
import { createLesson, type CreateLessonInput } from './lesson-service'
import {
  createMockConnection,
  createMockInstructorProfile,
  createMockSlot,
  type MockLessonWithSlot,
  noop,
} from './lesson-service.mocks'

describe('createLesson', () => {
  describe('создание занятия', () => {
    it('должен создать занятие со статусом PENDING', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot()
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile({ autoConfirmBookings: false })

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [],
        createLessonInDb: async (data) => ({
          id: 'new-lesson-1',
          ...data,
          status: data.status,
        }),
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.lesson.status).toBe('PENDING')
      }
    })

    it('должен создать занятие со статусом CONFIRMED при автоподтверждении', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot()
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile({ autoConfirmBookings: true })

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [],
        createLessonInDb: async (data) => ({
          id: 'new-lesson-1',
          ...data,
          status: data.status,
        }),
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.lesson.status).toBe('CONFIRMED')
      }
    })

    it('должен создать занятие со статусом CONFIRMED когда создаёт инструктор', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'instructor-1', // Инструктор создаёт занятие
      }
      const slot = createMockSlot()
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile({ autoConfirmBookings: false })

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [],
        createLessonInDb: async (data) => ({
          id: 'new-lesson-1',
          ...data,
          status: data.status,
        }),
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.lesson.status).toBe('CONFIRMED')
      }
    })

    it('должен менять статус слота на BOOKED', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot()
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile()
      let updatedSlotStatus: SlotStatus | null = null

      // Act
      await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [],
        createLessonInDb: async (data) => ({ id: 'new-lesson-1', ...data, status: data.status }),
        updateSlotStatus: async (slotId, status) => {
          updatedSlotStatus = status
        },
      })

      // Assert
      expect(updatedSlotStatus).toBe('BOOKED')
    })

    it('должен создать занятие с указанным типом занятия', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
        lessonTypeId: 'lesson-type-1',
      }
      const slot = createMockSlot()
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile()
      let createdLessonTypeId: string | undefined

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [],
        createLessonInDb: async (data) => {
          createdLessonTypeId = data.lessonTypeId
          return { id: 'new-lesson-1', ...data, status: data.status }
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(true)
      expect(createdLessonTypeId).toBe('lesson-type-1')
    })

    it('должен создать занятие без типа занятия (опционально)', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
        // lessonTypeId не указан
      }
      const slot = createMockSlot()
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile()
      let createdLessonTypeId: string | undefined

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [],
        createLessonInDb: async (data) => {
          createdLessonTypeId = data.lessonTypeId
          return { id: 'new-lesson-1', ...data, status: data.status }
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(true)
      expect(createdLessonTypeId).toBeUndefined()
    })
  })

  describe('валидация слота', () => {
    it('должен вернуть ошибку для несуществующего слота', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'non-existent-slot',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }

      // Act
      const result = await createLesson(input, {
        getSlot: async () => null,
        getConnection: async () => createMockConnection(),
        getInstructorProfile: async () => createMockInstructorProfile(),
        getStudentLessons: async () => [],
        createLessonInDb: async () => {
          throw new Error('Should not be called')
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('SLOT_NOT_FOUND')
      }
    })

    it('не должен создавать занятие на занятый слот', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot({ status: 'BOOKED' })

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => createMockConnection(),
        getInstructorProfile: async () => createMockInstructorProfile(),
        getStudentLessons: async () => [],
        createLessonInDb: async () => {
          throw new Error('Should not be called')
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('SLOT_NOT_AVAILABLE')
      }
    })

    it('не должен создавать занятие на заблокированный слот', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot({ status: 'BLOCKED' })

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => createMockConnection(),
        getInstructorProfile: async () => createMockInstructorProfile(),
        getStudentLessons: async () => [],
        createLessonInDb: async () => {
          throw new Error('Should not be called')
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('SLOT_NOT_AVAILABLE')
      }
    })
  })

  describe('проверка пересечения занятий ученика', () => {
    // 4.1.7: Ошибка если у ученика уже есть занятие в это время
    it('должен вернуть ошибку если у ученика уже есть занятие в это время', async () => {
      // Arrange: слот на 09:00-10:30, у ученика уже есть занятие на 09:00-10:30
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot({
        startTime: new Date('2025-01-10T09:00:00'),
        endTime: new Date('2025-01-10T10:30:00'),
      })
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile()
      // Существующее занятие в то же самое время
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
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [existingLesson],
        createLessonInDb: async () => {
          throw new Error('Should not be called')
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('STUDENT_TIME_CONFLICT')
      }
    })

    // 4.1.8: Ошибка если занятие частично пересекается с другим
    it('должен вернуть ошибку если занятие частично пересекается с другим', async () => {
      // Arrange: новый слот на 10:00-11:30, существующий на 09:00-10:30 (пересечение 30 мин)
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot({
        startTime: new Date('2025-01-10T10:00:00'),
        endTime: new Date('2025-01-10T11:30:00'),
      })
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile()
      // Существующее занятие, пересекающееся частично
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
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [existingLesson],
        createLessonInDb: async () => {
          throw new Error('Should not be called')
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('STUDENT_TIME_CONFLICT')
      }
    })

    // 4.1.9: Пересечение проверяется для PENDING и CONFIRMED занятий
    it('должен проверять пересечение для PENDING занятий', async () => {
      // Arrange: у ученика есть PENDING занятие в то же время
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot({
        startTime: new Date('2025-01-10T09:00:00'),
        endTime: new Date('2025-01-10T10:30:00'),
      })
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile()
      // Существующее PENDING занятие
      const existingLesson: MockLessonWithSlot = {
        id: 'existing-lesson',
        slotId: 'slot-2',
        studentId: 'student-1',
        instructorId: 'instructor-2',
        status: 'PENDING',
        createdBy: 'student-1',
        slot: {
          startTime: new Date('2025-01-10T09:00:00'),
          endTime: new Date('2025-01-10T10:30:00'),
        },
      }

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [existingLesson],
        createLessonInDb: async () => {
          throw new Error('Should not be called')
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('STUDENT_TIME_CONFLICT')
      }
    })

    // 4.1.10: Можно записаться если старое занятие CANCELLED
    it('должен разрешить запись если старое занятие отменено', async () => {
      // Arrange: у ученика было занятие в то же время, но оно CANCELLED
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot({
        startTime: new Date('2025-01-10T09:00:00'),
        endTime: new Date('2025-01-10T10:30:00'),
      })
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile()

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [], // CANCELLED занятия не возвращаются
        createLessonInDb: async (data) => ({
          id: 'new-lesson-1',
          ...data,
          status: data.status,
        }),
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(true)
    })

    it('должен разрешить запись если нет пересечений по времени', async () => {
      // Arrange: новый слот на 12:00-13:30, существующий на 09:00-10:30 (нет пересечения)
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot({
        startTime: new Date('2025-01-10T12:00:00'),
        endTime: new Date('2025-01-10T13:30:00'),
      })
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile()
      // Существующее занятие без пересечения
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
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [existingLesson],
        createLessonInDb: async (data) => ({
          id: 'new-lesson-1',
          ...data,
          status: data.status,
        }),
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(true)
    })

    it('должен разрешить запись если занятия идут последовательно (конец = начало)', async () => {
      // Arrange: новый слот на 10:30-12:00, существующий на 09:00-10:30 (без пересечения)
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot({
        startTime: new Date('2025-01-10T10:30:00'),
        endTime: new Date('2025-01-10T12:00:00'),
      })
      const connection = createMockConnection()
      const instructorProfile = createMockInstructorProfile()
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
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => instructorProfile,
        getStudentLessons: async () => [existingLesson],
        createLessonInDb: async (data) => ({
          id: 'new-lesson-1',
          ...data,
          status: data.status,
        }),
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe('проверка связи ученик-инструктор', () => {
    it('должен вернуть ошибку если нет активной связи', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot()

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => null, // Нет связи
        getInstructorProfile: async () => createMockInstructorProfile(),
        getStudentLessons: async () => [],
        createLessonInDb: async () => {
          throw new Error('Should not be called')
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NO_CONNECTION')
      }
    })

    it('должен вернуть ошибку если связь приостановлена', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot()
      const connection = createMockConnection({ status: 'PAUSED' })

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => createMockInstructorProfile(),
        getStudentLessons: async () => [],
        createLessonInDb: async () => {
          throw new Error('Should not be called')
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CONNECTION_NOT_ACTIVE')
      }
    })

    it('должен вернуть ошибку если связь отключена', async () => {
      // Arrange
      const input: CreateLessonInput = {
        slotId: 'slot-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        createdBy: 'student-1',
      }
      const slot = createMockSlot()
      const connection = createMockConnection({ status: 'DISCONNECTED' })

      // Act
      const result = await createLesson(input, {
        getSlot: async () => slot,
        getConnection: async () => connection,
        getInstructorProfile: async () => createMockInstructorProfile(),
        getStudentLessons: async () => [],
        createLessonInDb: async () => {
          throw new Error('Should not be called')
        },
        updateSlotStatus: noop,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CONNECTION_NOT_ACTIVE')
      }
    })
  })
})
