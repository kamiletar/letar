'use server'

/**
 * Server Actions для сплитскрин-панели
 *
 * Получение данных для контекстных панелей в чате.
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { ConnectionStatus, LessonStatus, LicenseCategory, TransmissionType } from '@letar/driving-school-db/prisma'

// ============================================================================
// ТИПЫ
// ============================================================================

/** Информация о лицензии для панели */
export interface PanelLicense {
  id: string
  category: LicenseCategory
  transmissionRestriction: TransmissionType | null
  isVerified: boolean
  expiresAt: Date
  isExpired: boolean
}

/** Профиль пользователя для панели */
export interface PanelUserProfile {
  id: string
  name: string
  email: string
  image: string | null
  // Данные студента
  studentProfile?: {
    balance: number
    completedLessons: number
    totalScheduledLessons: number
    licenses: PanelLicense[]
    connectionStatus: ConnectionStatus
  }
  // Данные инструктора
  instructorProfile?: {
    totalStudents: number
    rating: number | null
    vehicle?: {
      brand: string
      model: string
      plateNumber: string | null
    }
  }
}

/** Урок для панели */
export interface PanelLesson {
  id: string
  startTime: Date
  endTime: Date
  status: LessonStatus
  student?: {
    id: string
    name: string
    image: string | null
  }
  instructor?: {
    id: string
    name: string
    image: string | null
  }
  vehicle?: {
    brand: string
    model: string
    plateNumber: string | null
  }
}

/** Студент для панели */
export interface PanelStudent {
  userId: string
  name: string
  image: string | null
  balance: number
  completedLessons: number
  status: ConnectionStatus
}

// ============================================================================
// ПОЛУЧЕНИЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
// ============================================================================

export type GetPanelProfileResult = { success: true; profile: PanelUserProfile } | { success: false; error: string }

/**
 * Получает профиль пользователя для отображения в сплитскрин-панели
 */
export async function getPanelProfileAction(userId: string): Promise<GetPanelProfileResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const now = new Date()

    // Получаем пользователя с профилями
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            studentLicenses: true,
            instructorConnections: {
              where: {
                instructor: {
                  userId: session.user.id,
                },
                status: { not: 'DISCONNECTED' },
              },
              take: 1,
            },
          },
        },
        instructorProfile: {
          include: {
            vehicles: true,
            studentConnections: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    })

    if (!user) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Получаем статистику уроков для студента
    let completedLessons = 0
    let totalScheduledLessons = 0

    if (user.studentProfile) {
      const lessonStats = await prisma.lesson.aggregate({
        where: {
          studentId: user.id,
        },
        _count: { id: true },
      })
      totalScheduledLessons = lessonStats._count.id

      const completedStats = await prisma.lesson.aggregate({
        where: {
          studentId: user.id,
          status: 'COMPLETED',
        },
        _count: { id: true },
      })
      completedLessons = completedStats._count.id
    }

    const profile: PanelUserProfile = {
      id: user.id,
      name: user.name || 'Без имени',
      email: user.email,
      image: user.image,
    }

    if (user.studentProfile) {
      const connection = user.studentProfile.instructorConnections[0]

      profile.studentProfile = {
        balance: connection?.prepaidLessons ?? 0,
        completedLessons,
        totalScheduledLessons,
        connectionStatus: connection?.status ?? 'DISCONNECTED',
        licenses: user.studentProfile.studentLicenses.map(
          (l: {
            id: string
            category: LicenseCategory
            transmissionRestriction: TransmissionType | null
            isVerified: boolean
            expiresAt: Date
          }) => ({
            id: l.id,
            category: l.category,
            transmissionRestriction: l.transmissionRestriction,
            isVerified: l.isVerified,
            expiresAt: l.expiresAt,
            isExpired: l.expiresAt < now,
          })
        ),
      }
    }

    if (user.instructorProfile) {
      // Берём первое транспортное средство инструктора (если есть)
      const primaryVehicle = user.instructorProfile.vehicles[0]

      profile.instructorProfile = {
        totalStudents: user.instructorProfile.studentConnections.length,
        rating: user.instructorProfile.averageRating,
        vehicle: primaryVehicle
          ? {
              brand: primaryVehicle.brand,
              model: primaryVehicle.model,
              plateNumber: primaryVehicle.plateNumber,
            }
          : undefined,
      }
    }

    return { success: true, profile }
  } catch (error) {
    console.error('Ошибка получения профиля для панели:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

// ============================================================================
// ПОЛУЧЕНИЕ УРОКОВ
// ============================================================================

export type GetPanelLessonsResult = { success: true; lessons: PanelLesson[] } | { success: false; error: string }

/**
 * Получает ближайшие уроки для отображения в панели
 */
export async function getPanelLessonsAction(params: {
  /** ID текущего пользователя (для фильтрации) */
  userId: string
  /** ID другого пользователя в приватном чате (опционально) */
  otherUserId?: string
  /** Лимит записей */
  limit?: number
}): Promise<GetPanelLessonsResult> {
  const { otherUserId, limit = 5 } = params

  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const now = new Date()

    // Строим условия фильтрации — slot.startTime >= now
    // Lesson.student и Lesson.instructor — это User (не ProfileId)
    type LessonWhere = {
      slot: { startTime: { gte: Date } }
      status: { in: LessonStatus[] }
      studentId?: string
      instructorId?: string
    }

    const whereConditions: LessonWhere = {
      slot: { startTime: { gte: now } },
      status: { in: ['PENDING', 'CONFIRMED'] },
    }

    // Если есть otherUserId — фильтруем по обоим пользователям
    if (otherUserId) {
      // Определяем кто студент, кто инструктор
      const [currentUserProfile, otherUserProfile] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { instructorProfile: { select: { id: true } } },
        }),
        prisma.user.findUnique({
          where: { id: otherUserId },
          select: { studentProfile: { select: { id: true } } },
        }),
      ])

      if (currentUserProfile?.instructorProfile && otherUserProfile?.studentProfile) {
        // Текущий — инструктор, другой — ученик
        whereConditions.studentId = otherUserId
        whereConditions.instructorId = session.user.id
      } else {
        // Текущий — ученик, другой — инструктор
        whereConditions.studentId = session.user.id
        whereConditions.instructorId = otherUserId
      }
    } else {
      // Без otherUserId — показываем все уроки текущего пользователя
      const currentUserProfile = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          studentProfile: { select: { id: true } },
          instructorProfile: { select: { id: true } },
        },
      })

      if (currentUserProfile?.studentProfile) {
        whereConditions.studentId = session.user.id
      } else if (currentUserProfile?.instructorProfile) {
        whereConditions.instructorId = session.user.id
      }
    }

    const lessons = await prisma.lesson.findMany({
      where: whereConditions,
      include: {
        slot: { select: { startTime: true, endTime: true } },
        student: { select: { id: true, name: true, image: true } },
        instructor: { select: { id: true, name: true, image: true } },
        pricingOption: {
          include: {
            vehicle: { select: { brand: true, model: true, plateNumber: true } },
          },
        },
      },
      orderBy: { slot: { startTime: 'asc' } },
      take: limit,
    })

    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma возвращает сложный тип
      lessons: lessons.map((l: any) => ({
        id: l.id,
        startTime: l.slot.startTime,
        endTime: l.slot.endTime,
        status: l.status,
        student: {
          id: l.student.id,
          name: l.student.name || 'Без имени',
          image: l.student.image,
        },
        instructor: {
          id: l.instructor.id,
          name: l.instructor.name || 'Без имени',
          image: l.instructor.image,
        },
        vehicle: l.pricingOption?.vehicle
          ? {
              brand: l.pricingOption.vehicle.brand,
              model: l.pricingOption.vehicle.model,
              plateNumber: l.pricingOption.vehicle.plateNumber,
            }
          : undefined,
      })),
    }
  } catch (error) {
    console.error('Ошибка получения уроков для панели:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

// ============================================================================
// ПОЛУЧЕНИЕ СТУДЕНТОВ ИНСТРУКТОРА
// ============================================================================

export type GetPanelStudentsResult = { success: true; students: PanelStudent[] } | { success: false; error: string }

/**
 * Получает список студентов инструктора для панели
 */
export async function getPanelStudentsAction(params: {
  instructorId: string
  organizationId?: string
}): Promise<GetPanelStudentsResult> {
  const { instructorId, organizationId } = params

  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    // Получаем профиль инструктора
    const instructorProfile = await prisma.instructorProfile.findUnique({
      where: { userId: instructorId },
    })

    if (!instructorProfile) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем, что текущий пользователь — это тот же инструктор
    if (instructorId !== session.user.id) {
      return { success: false, error: 'FORBIDDEN' }
    }

    // Получаем связи со студентами
    const connections = await prisma.studentInstructorConnection.findMany({
      where: {
        instructorId: instructorProfile.id,
        status: { not: 'DISCONNECTED' },
        // Если указана организация — фильтруем по ней
        ...(organizationId && { organizationId }),
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
      orderBy: {
        student: { user: { name: 'asc' } },
      },
    })

    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma сложный тип
      students: connections.map((c: any) => ({
        userId: c.student.user.id,
        name: c.student.user.name || 'Без имени',
        image: c.student.user.image,
        balance: c.prepaidLessons,
        completedLessons: c.completedLessons,
        status: c.status,
      })),
    }
  } catch (error) {
    console.error('Ошибка получения студентов для панели:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

// ============================================================================
// ПОЛУЧЕНИЕ РАСПИСАНИЯ ГРУППЫ/ШКОЛЫ
// ============================================================================

export type GetPanelScheduleResult = { success: true; lessons: PanelLesson[] } | { success: false; error: string }

/**
 * Получает расписание учебной группы или школы для панели
 */
export async function getPanelScheduleAction(params: {
  studyGroupId?: string
  organizationId?: string
  limit?: number
}): Promise<GetPanelScheduleResult> {
  const { studyGroupId, organizationId, limit = 10 } = params

  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const now = new Date()

    // Базовые условия фильтрации
    type LessonWhere = {
      slot: { startTime: { gte: Date } }
      status: { in: LessonStatus[] }
      studentId?: { in: string[] }
      instructorId?: { in: string[] }
    }

    const whereConditions: LessonWhere = {
      slot: { startTime: { gte: now } },
      status: { in: ['PENDING', 'CONFIRMED'] },
    }

    if (studyGroupId) {
      // Получаем участников группы
      const groupMembers = await prisma.studyGroupMember.findMany({
        where: {
          groupId: studyGroupId,
          leftAt: null,
        },
        select: { userId: true },
      })

      const memberUserIds = groupMembers.map((m: { userId: string }) => m.userId)
      whereConditions.studentId = { in: memberUserIds }
    } else if (organizationId) {
      // Получаем всех инструкторов школы
      const schoolMembers = await prisma.member.findMany({
        where: {
          organizationId,
          role: 'instructor',
        },
        select: { userId: true },
      })

      const instructorUserIds = schoolMembers.map((m: { userId: string }) => m.userId)
      whereConditions.instructorId = { in: instructorUserIds }
    } else {
      return { success: false, error: 'INVALID_PARAMS' }
    }

    const lessons = await prisma.lesson.findMany({
      where: whereConditions,
      include: {
        slot: { select: { startTime: true, endTime: true } },
        student: { select: { id: true, name: true, image: true } },
        instructor: { select: { id: true, name: true, image: true } },
        pricingOption: {
          include: {
            vehicle: { select: { brand: true, model: true, plateNumber: true } },
          },
        },
      },
      orderBy: { slot: { startTime: 'asc' } },
      take: limit,
    })

    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma возвращает сложный тип
      lessons: lessons.map((l: any) => ({
        id: l.id,
        startTime: l.slot.startTime,
        endTime: l.slot.endTime,
        status: l.status,
        student: {
          id: l.student.id,
          name: l.student.name || 'Без имени',
          image: l.student.image,
        },
        instructor: {
          id: l.instructor.id,
          name: l.instructor.name || 'Без имени',
          image: l.instructor.image,
        },
        vehicle: l.pricingOption?.vehicle
          ? {
              brand: l.pricingOption.vehicle.brand,
              model: l.pricingOption.vehicle.model,
              plateNumber: l.pricingOption.vehicle.plateNumber,
            }
          : undefined,
      })),
    }
  } catch (error) {
    console.error('Ошибка получения расписания для панели:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}
