'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { createLesson, type CreateLessonRepository } from '@/lib/lessons/lesson-service'
import type { LessonCategory, LicenseCategory, TransmissionType, VehicleOwner } from '@letar/driving-school-db/prisma'
import { revalidatePath } from 'next/cache'

// === Типы ===

export interface StudentLicenseForBooking {
  id: string
  category: LicenseCategory
  transmissionRestriction: TransmissionType | null
  expiresAt: Date
  isVerified: boolean
}

export interface PricingOptionForBooking {
  id: string
  vehicleOwner: VehicleOwner
  vehicleId: string | null
  lessonsCount: number
  pricePerLesson: number
  discountPercent: number
  isPrimary: boolean
}

export interface LessonTypeForBooking {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  licenseCategory: LicenseCategory | null
  lessonCategory: LessonCategory | null
  pricingOptions: PricingOptionForBooking[]
}

export interface VehicleForDisplay {
  id: string
  brand: string
  model: string
  transmission: 'MANUAL' | 'AUTOMATIC'
  isPrimary: boolean
}

export interface InstructorWithSlots {
  id: string
  name: string | null
  email: string
  image: string | null
  isFreelance: boolean // Частный инструктор (требует права ученика)
  instructorProfile: {
    id: string
    bio: string | null
    primaryVehicle: VehicleForDisplay | null
  } | null
  slots: SlotForBooking[]
  lessonTypes: LessonTypeForBooking[]
}

export interface SlotForBooking {
  id: string
  startTime: Date
  endTime: Date
  status: string
}

export type GetInstructorsResult =
  | { success: true; instructors: InstructorWithSlots[]; studentLicenses: StudentLicenseForBooking[] }
  | { success: false; error: 'UNAUTHORIZED' | 'NOT_STUDENT' | 'UNKNOWN_ERROR' }

export type BookLessonResult = { success: true } | { success: false; error: string }

// === Получение инструкторов ученика со слотами ===

export async function getStudentInstructors(): Promise<GetInstructorsResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    // Проверяем наличие профиля ученика
    if (!session.user.hasStudentProfile) {
      return { success: false, error: 'NOT_STUDENT' }
    }

    const db = getEnhancedPrisma(session.user)

    // Получаем профиль ученика
    const studentProfile = await db.studentProfile.findFirst({
      where: { userId: session.user.id },
    })

    if (!studentProfile) {
      return { success: true, instructors: [], studentLicenses: [] }
    }

    // Получаем права ученика
    const licenses = await db.studentLicense.findMany({
      where: { studentProfileId: studentProfile.id },
    })

    const studentLicenses: StudentLicenseForBooking[] = licenses.map((l) => ({
      id: l.id,
      category: l.category,
      transmissionRestriction: l.transmissionRestriction,
      expiresAt: l.expiresAt,
      isVerified: l.isVerified,
    }))

    // ZenStack v3.2.x баг: глубокий nested include с access policies генерирует невалидный SQL
    // Ошибка: "таблица StudentInstructorConnection$instructor$user$sub отсутствует в предложении FROM"
    // Используем prisma напрямую — access control обеспечивается условием studentId: studentProfile.id
    const connections = await prisma.studentInstructorConnection.findMany({
      where: {
        studentId: studentProfile.id,
        status: 'ACTIVE',
      },
      include: {
        instructor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                roles: true, // Добавляем роли для проверки FREELANCE_INSTRUCTOR
              },
            },
            vehicles: {
              where: { isActive: true },
              orderBy: { isPrimary: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    // Batch-загрузка слотов и типов занятий для всех инструкторов (вместо N+1)
    const now = new Date()
    const instructorIds = connections.map((c) => c.instructor.id)

    // ZenStack v3.2.x баг: access policies могут генерировать невалидный SQL для include
    // Используем prisma напрямую — access control обеспечивается условием instructorId
    const [allSlots, allLessonTypes] = await Promise.all([
      prisma.timeSlot.findMany({
        where: {
          instructorId: { in: instructorIds },
          status: 'AVAILABLE',
          startTime: { gte: now },
        },
        orderBy: { startTime: 'asc' },
        take: instructorIds.length * 20, // Ограничение на уровне SQL
      }),
      prisma.lessonType.findMany({
        where: {
          instructorId: { in: instructorIds },
          isActive: true,
        },
        include: {
          pricingOptions: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ])

    // Группируем по инструкторам в памяти
    type SlotItem = (typeof allSlots)[number]
    type LessonTypeItem = (typeof allLessonTypes)[number]
    const slotsByInstructor = Map.groupBy<string, SlotItem>(allSlots, (s) => s.instructorId)
    const typesByInstructor = Map.groupBy<string, LessonTypeItem>(allLessonTypes, (t) => t.instructorId)

    const instructorsWithSlots: InstructorWithSlots[] = connections.map((conn) => {
      const slots = (slotsByInstructor.get(conn.instructor.id) ?? []).slice(0, 20)
      const lessonTypes = typesByInstructor.get(conn.instructor.id) ?? []
      const primaryVehicle = conn.instructor.vehicles[0]

      // Проверяем, является ли инструктор частным (имеет роль FREELANCE_INSTRUCTOR)
      const isFreelance = conn.instructor.user.roles.includes('FREELANCE_INSTRUCTOR')

      return {
        id: conn.instructor.user.id,
        name: conn.instructor.user.name,
        email: conn.instructor.user.email,
        image: conn.instructor.user.image,
        isFreelance,
        instructorProfile: {
          id: conn.instructor.id,
          bio: conn.instructor.bio,
          primaryVehicle: primaryVehicle
            ? {
                id: primaryVehicle.id,
                brand: primaryVehicle.brand,
                model: primaryVehicle.model,
                transmission: primaryVehicle.transmission as 'MANUAL' | 'AUTOMATIC',
                isPrimary: primaryVehicle.isPrimary,
              }
            : null,
        },
        slots,
        lessonTypes: lessonTypes.map((lt) => ({
          id: lt.id,
          name: lt.name,
          description: lt.description,
          durationMinutes: lt.durationMinutes,
          licenseCategory: lt.licenseCategory,
          lessonCategory: lt.lessonCategory,
          pricingOptions: lt.pricingOptions.map((po) => ({
            id: po.id,
            vehicleOwner: po.vehicleOwner,
            vehicleId: po.vehicleId,
            lessonsCount: po.lessonsCount,
            pricePerLesson: Number(po.pricePerLesson),
            discountPercent: po.discountPercent,
            isPrimary: po.isPrimary,
          })),
        })),
      }
    })

    return { success: true, instructors: instructorsWithSlots, studentLicenses }
  } catch (error) {
    console.error('Ошибка получения инструкторов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Запись ученика на занятие ===

export async function bookLessonAction(
  slotId: string,
  instructorUserId: string,
  lessonTypeId?: string,
  pricingOptionId?: string
): Promise<BookLessonResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'Необходимо войти в систему' }
    }

    // Проверяем наличие профиля ученика
    if (!session.user.hasStudentProfile) {
      return { success: false, error: 'Только для учеников' }
    }

    const db = getEnhancedPrisma(session.user)

    // Проверяем права для частных инструкторов
    const instructor = await db.user.findUnique({
      where: { id: instructorUserId },
      select: { roles: true },
    })

    if (instructor?.roles.includes('FREELANCE_INSTRUCTOR')) {
      // Получаем профиль ученика и права
      const studentProfile = await db.studentProfile.findFirst({
        where: { userId: session.user.id },
        include: {
          studentLicenses: {
            where: {
              expiresAt: { gt: new Date() }, // Только действующие права
            },
          },
        },
      })

      // Проверяем наличие действующих прав (категория B по умолчанию)
      const hasValidLicense =
        studentProfile?.studentLicenses.some((l) => l.category === 'B' && l.expiresAt > new Date()) ?? false

      if (!hasValidLicense) {
        return {
          success: false,
          error: 'Для записи к частному инструктору необходимы действующие водительские права. Добавьте их в профиле.',
        }
      }
    }

    const repo: CreateLessonRepository = {
      getSlot: async (id) => {
        const slot = await db.timeSlot.findUnique({ where: { id } })
        return slot
      },
      getConnection: async (studentId, instructorId) => {
        const studentProfile = await db.studentProfile.findFirst({
          where: { userId: studentId },
        })
        const instructorProfile = await db.instructorProfile.findFirst({
          where: { userId: instructorId },
        })

        if (!studentProfile || !instructorProfile) {
          return null
        }

        const connection = await db.studentInstructorConnection.findFirst({
          where: {
            studentId: studentProfile.id,
            instructorId: instructorProfile.id,
          },
        })
        return connection
      },
      getInstructorProfile: async (instructorId) => {
        const profile = await db.instructorProfile.findFirst({
          where: { userId: instructorId },
        })
        return profile
      },
      getStudentLessons: async (studentId) => {
        // Получаем профиль студента
        const studentProfile = await db.studentProfile.findFirst({
          where: { userId: studentId },
        })
        if (!studentProfile) {
          return []
        }
        // Получаем все активные занятия ученика (PENDING и CONFIRMED)
        const lessons = await db.lesson.findMany({
          where: {
            studentId: studentProfile.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          include: {
            slot: {
              select: { startTime: true, endTime: true },
            },
          },
        })
        return lessons
      },
      createLessonInDb: async (data) => {
        // ZenStack v3: типы CreateInput несовместимы с Prisma, используем as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lesson = await db.lesson.create({ data: data as any })
        return lesson
      },
      updateSlotStatus: async (id, status) => {
        await db.timeSlot.update({
          where: { id },
          data: { status },
        })
      },
    }

    // Получаем цену из варианта, если указан
    let price: number | undefined
    if (pricingOptionId) {
      const pricingOption = await db.pricingOption.findUnique({
        where: { id: pricingOptionId },
      })
      if (pricingOption) {
        price = Number(pricingOption.pricePerLesson)
      }
    }

    const result = await createLesson(
      {
        slotId,
        studentId: session.user.id,
        instructorId: instructorUserId,
        createdBy: session.user.id,
        lessonTypeId,
        pricingOptionId,
        price,
      },
      repo
    )

    if (!result.success) {
      const errorMessages: Record<string, string> = {
        SLOT_NOT_FOUND: 'Слот не найден',
        SLOT_NOT_AVAILABLE: 'Слот уже занят',
        NO_CONNECTION: 'Нет связи с инструктором',
        CONNECTION_NOT_ACTIVE: 'Связь с инструктором неактивна',
        STUDENT_TIME_CONFLICT: 'У вас уже есть занятие в это время',
      }
      return { success: false, error: errorMessages[result.error] || 'Ошибка' }
    }

    revalidatePath('/my-schedule')
    revalidatePath('/my-lessons')
    return { success: true }
  } catch (error) {
    console.error('Ошибка записи на занятие:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}

// === Получение занятий ученика ===

export interface StudentLesson {
  id: string
  status: string
  createdAt: Date
  cancelReason: string | null
  slot: {
    id: string
    startTime: Date
    endTime: Date
  }
  instructor: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export type GetStudentLessonsResult =
  | { success: true; lessons: StudentLesson[] }
  | { success: false; error: 'UNAUTHORIZED' | 'NOT_STUDENT' | 'UNKNOWN_ERROR' }

export async function getStudentLessons(): Promise<GetStudentLessonsResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    // Проверяем наличие профиля ученика
    if (!session.user.hasStudentProfile) {
      return { success: false, error: 'NOT_STUDENT' }
    }

    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    // Используем prisma напрямую вместо getEnhancedPrisma
    // Lesson.studentId ссылается на User.id (не на StudentProfile.id!)
    const lessons = await prisma.lesson.findMany({
      where: {
        studentId: session.user.id,
      },
      include: {
        slot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { success: true, lessons }
  } catch (error) {
    console.error('Ошибка получения занятий ученика:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение занятий ученика с пагинацией ===

export interface GetStudentLessonsPaginatedParams {
  cursor?: number // offset для пагинации
  take?: number
}

export type GetStudentLessonsPaginatedResult =
  | { success: true; lessons: StudentLesson[]; hasMore: boolean }
  | { success: false; error: 'UNAUTHORIZED' | 'NOT_STUDENT' | 'UNKNOWN_ERROR' }

export async function getStudentLessonsPaginated(
  params: GetStudentLessonsPaginatedParams
): Promise<GetStudentLessonsPaginatedResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    // Проверяем наличие профиля ученика
    if (!session.user.hasStudentProfile) {
      return { success: false, error: 'NOT_STUDENT' }
    }

    const take = params.take ?? 20
    const skip = params.cursor ?? 0

    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    // Используем prisma напрямую вместо getEnhancedPrisma
    // Lesson.studentId ссылается на User.id (не на StudentProfile.id!)
    const lessons = await prisma.lesson.findMany({
      where: {
        studentId: session.user.id,
      },
      include: {
        slot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: take + 1, // +1 чтобы определить есть ли ещё
    })

    // Определяем, есть ли ещё записи
    const hasMore = lessons.length > take
    const resultLessons = hasMore ? lessons.slice(0, take) : lessons

    // Преобразуем к ожидаемому типу
    const typedLessons: StudentLesson[] = resultLessons.map((l) => ({
      id: l.id,
      status: l.status,
      createdAt: l.createdAt,
      cancelReason: l.cancelReason,
      slot: {
        id: l.slot.id,
        startTime: l.slot.startTime,
        endTime: l.slot.endTime,
      },
      instructor: {
        id: l.instructor.id,
        name: l.instructor.name,
        email: l.instructor.email,
        image: l.instructor.image,
      },
    }))

    return { success: true, lessons: typedLessons, hasMore }
  } catch (error) {
    console.error('Ошибка получения занятий ученика:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Отмена занятия учеником ===

export async function cancelStudentLessonAction(lessonId: string, reason?: string): Promise<BookLessonResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'Необходимо войти в систему' }
    }

    const db = getEnhancedPrisma(session.user)

    // Проверяем, что это занятие ученика
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
    })

    if (!lesson) {
      return { success: false, error: 'Занятие не найдено' }
    }

    if (lesson.studentId !== session.user.id) {
      return { success: false, error: 'Нет прав для отмены' }
    }

    if (lesson.status !== 'PENDING' && lesson.status !== 'CONFIRMED') {
      return { success: false, error: 'Занятие нельзя отменить' }
    }

    // Отменяем занятие
    await db.lesson.update({
      where: { id: lessonId },
      data: {
        status: 'CANCELLED',
        cancelledBy: session.user.id,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    })

    // Возвращаем слот в доступные
    await db.timeSlot.update({
      where: { id: lesson.slotId },
      data: { status: 'AVAILABLE' },
    })

    revalidatePath('/my-schedule')
    revalidatePath('/my-lessons')
    return { success: true }
  } catch (error) {
    console.error('Ошибка отмены занятия:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}
