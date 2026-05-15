/**
 * Типы для сплитскрин-панели чата
 */

import type { ChatType, UserRole } from '@letar/driving-school-db/prisma'

/**
 * Типы панелей, которые могут отображаться рядом с чатом
 */
export type SplitPanelType = 'profile' | 'schedule' | 'lessons' | 'students' | 'none'

/**
 * Таб для навигации в панели
 */
export interface SplitPanelTab {
  id: SplitPanelType
  label: string
  icon: React.ReactNode
}

/**
 * Данные для профиля пользователя в панели
 */
export interface PanelUserProfile {
  id: string
  name: string | null
  image: string | null
  roles: UserRole[]
  // Данные ученика (если есть)
  studentProfile?: {
    balance: number
    totalLessons: number
    completedLessons: number
    licenses: Array<{
      id: string
      category: string
      status: string
    }>
  }
  // Данные инструктора (если есть)
  instructorProfile?: {
    totalStudents: number
    rating: number | null
    vehicleName?: string
  }
}

/**
 * Урок для отображения в панели
 */
export interface PanelLesson {
  id: string
  startTime: Date
  endTime: Date
  status: string
  student?: {
    id: string
    name: string | null
    image: string | null
  }
  instructor?: {
    id: string
    name: string | null
    image: string | null
  }
  vehicle?: {
    brand: string
    model: string
    plateNumber: string
  }
}

/**
 * Студент для отображения в панели
 */
export interface PanelStudent {
  id: string
  userId: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
  balance: number
  completedLessons: number
  totalLessons: number
}

/**
 * Контекст активного чата для определения типа панели
 */
export interface ActiveChatContext {
  chatId: string | null
  chatType: ChatType | null
  // Для приватных чатов — ID собеседника
  otherParticipantId?: string
  // Для групповых чатов — ID группы или организации
  studyGroupId?: string
  organizationId?: string
  // ID инструктора (для чатов INSTRUCTOR_STUDENTS)
  instructorId?: string
}

/**
 * Определяет тип панели на основе типа чата и роли пользователя
 */
export function getPanelTypeForChat(
  chatType: ChatType | null,
  userRoles: UserRole[],
  isCurrentUserInstructor: boolean
): SplitPanelType {
  if (!chatType) {
    return 'none'
  }

  switch (chatType) {
    // Приватный чат: инструктор видит профиль ученика, ученик видит свои уроки
    case 'PRIVATE':
      return isCurrentUserInstructor ? 'profile' : 'lessons'

    // Чат инструктора с учениками: инструктор видит список студентов
    case 'INSTRUCTOR_STUDENTS':
      return isCurrentUserInstructor ? 'students' : 'lessons'

    // Чат учебной группы: расписание группы
    case 'STUDY_GROUP':
      return 'schedule'

    // Чат школы: расписание школы
    case 'SCHOOL':
      return 'schedule'

    // Системные чаты — без панели
    case 'INSTRUCTORS':
    case 'STUDENTS':
    case 'GENERAL':
      return 'none'

    default:
      return 'none'
  }
}
