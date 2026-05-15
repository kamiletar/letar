// Общие моки для тестов lesson-service
import type { ConnectionStatus, LessonStatus, SlotStatus } from '@letar/driving-school-db/prisma'

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = async () => {}

// === Интерфейсы моков ===

export interface MockSlot {
  id: string
  instructorId: string
  startTime: Date
  endTime: Date
  status: SlotStatus
}

export interface MockLesson {
  id: string
  slotId: string
  studentId: string
  instructorId: string
  status: LessonStatus
  createdBy: string
  cancelledBy?: string
  cancelledAt?: Date
  cancelReason?: string
  instructorNotes?: string
}

export interface MockConnection {
  id: string
  studentId: string
  instructorId: string
  status: ConnectionStatus
  isPrimary: boolean
  totalLessons: number
  completedLessons: number
  cancelledLessons: number
  noShowCount: number
}

export interface MockInstructorProfile {
  id: string
  userId: string
  autoConfirmBookings: boolean
  lateCancelHours: number
}

// Занятие с информацией о слоте для проверки пересечений
export interface MockLessonWithSlot extends MockLesson {
  slot: {
    startTime: Date
    endTime: Date
  }
}

// === Фабрики для создания моков ===

export const createMockSlot = (overrides: Partial<MockSlot> = {}): MockSlot => ({
  id: 'slot-1',
  instructorId: 'instructor-profile-1',
  startTime: new Date('2025-01-10T09:00:00'),
  endTime: new Date('2025-01-10T10:30:00'),
  status: 'AVAILABLE',
  ...overrides,
})

export const createMockConnection = (overrides: Partial<MockConnection> = {}): MockConnection => ({
  id: 'connection-1',
  studentId: 'student-profile-1',
  instructorId: 'instructor-profile-1',
  status: 'ACTIVE',
  isPrimary: true,
  totalLessons: 0,
  completedLessons: 0,
  cancelledLessons: 0,
  noShowCount: 0,
  ...overrides,
})

export const createMockInstructorProfile = (overrides: Partial<MockInstructorProfile> = {}): MockInstructorProfile => ({
  id: 'instructor-profile-1',
  userId: 'instructor-1',
  autoConfirmBookings: false,
  lateCancelHours: 24,
  ...overrides,
})

export const createMockLesson = (overrides: Partial<MockLesson> = {}): MockLesson => ({
  id: 'lesson-1',
  slotId: 'slot-1',
  studentId: 'student-1',
  instructorId: 'instructor-1',
  status: 'PENDING',
  createdBy: 'student-1',
  ...overrides,
})
