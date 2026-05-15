/**
 * Типы данных для учебных групп
 *
 * ВАЖНО: Этот файл НЕ содержит 'use server', так как содержит только типы.
 * Типы безопасно импортировать везде (Client/Server Components, Server Actions).
 */

import type { LessonSchedule } from '@/lib/lesson-schedule'
import type { LicenseCategory, StudyGroupSchedule } from '@letar/driving-school-db/prisma'

// === Типы для учебных групп ===

export interface StudyGroupSummary {
  id: string
  name: string
  schedule: StudyGroupSchedule
  categories: LicenseCategory[]
  startDate: Date
  endDate: Date | null
  lessonSchedule: LessonSchedule
  classroomId: string | null
  classroomName: string | null
  theoryHours: number | null
  maxStudents: number
  isActive: boolean
  membersCount: number
  lessonsCount: number
  organization: {
    id: string
    name: string
  }
}

export interface StudyGroupDetails extends StudyGroupSummary {
  members: StudyGroupMemberInfo[]
  upcomingLessons: TheoryLessonInfo[]
  createdAt: Date
  updatedAt: Date
}

export interface StudyGroupMemberInfo {
  id: string
  userId: string
  userName: string
  userImage: string | null
  enrolledAt: Date
  leftAt: Date | null
  attendanceRate: number | null
}

export interface TheoryLessonInfo {
  id: string
  scheduledAt: Date
  topic: {
    id: string
    name: string
  } | null
  status: string
  attendeesCount: number
}

// === Результаты операций ===

export type GetStudyGroupsResult =
  | { success: true; groups: StudyGroupSummary[] }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NO_PROFILE'
        | 'UNKNOWN_ERROR'
    }

export type GetStudyGroupResult =
  | { success: true; group: StudyGroupDetails }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NO_PROFILE'
        | 'NOT_FOUND'
        | 'UNKNOWN_ERROR'
    }

export type CreateStudyGroupResult =
  | { success: true; groupId: string }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NO_PROFILE'
        | 'VALIDATION_ERROR'
        | 'UNKNOWN_ERROR'
      message?: string
    }

export type UpdateStudyGroupResult =
  | { success: true }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NO_PROFILE'
        | 'NOT_FOUND'
        | 'VALIDATION_ERROR'
        | 'UNKNOWN_ERROR'
      message?: string
    }

export type DeleteStudyGroupResult =
  | { success: true }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NO_PROFILE'
        | 'NOT_FOUND'
        | 'HAS_ACTIVE_LESSONS'
        | 'UNKNOWN_ERROR'
      message?: string
    }
