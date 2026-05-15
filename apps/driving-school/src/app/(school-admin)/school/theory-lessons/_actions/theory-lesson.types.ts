/**
 * Типы для теоретических занятий
 */

import type { TheoryLessonStatus } from '@letar/driving-school-db/prisma'

/**
 * Сводная информация о занятии (для списков)
 */
export interface TheoryLessonSummary {
  id: string
  groupId: string
  groupName: string
  topicId: string | null
  topicName: string | null
  scheduledAt: Date
  duration: number
  status: TheoryLessonStatus
  instructorId: string | null
  instructorName: string | null
  location: string | null
  attendeesCount: number
  totalMembers: number
}

/**
 * Детальная информация о занятии
 */
export interface TheoryLessonDetails {
  id: string
  groupId: string
  groupName: string
  topicId: string | null
  topicName: string | null
  scheduledAt: Date
  duration: number
  status: TheoryLessonStatus
  instructorId: string | null
  instructorName: string | null
  location: string | null
  cancelledAt: Date | null
  cancelReason: string | null
  rescheduledToId: string | null
  createdAt: Date
  updatedAt: Date
  attendances: TheoryLessonAttendance[]
}

/**
 * Посещаемость участника занятия
 */
export interface TheoryLessonAttendance {
  memberId: string
  memberName: string | null
  memberEmail: string
  isPresent: boolean
  markedAt: Date | null
}

/**
 * Инструктор школы
 */
export interface SchoolInstructor {
  id: string
  name: string | null
}

/**
 * Учебный класс (филиал type=CLASSROOM)
 */
export interface SchoolClassroom {
  id: string
  name: string
  address: string | null
}
