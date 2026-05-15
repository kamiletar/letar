'use server'

import { getAppUrl } from '@/lib/app-url'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { notifyUser } from '@/lib/notifications'
import { createNotificationProviders, createOrchestratorRepository } from '@/lib/orchestrator-repository'
import { isInstructor } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const log = createLogger('EnrollmentRequest')

interface ActionResult {
  success: boolean
  error?: string
}

/**
 * Одобрение заявки на обучение
 * Создаёт StudentInstructorConnection и обновляет статус заявки
 */
export async function approveEnrollmentRequestAction(requestId: string): Promise<ActionResult> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  if (!isInstructor(session.user.roles)) {
    return { success: false, error: 'Только инструкторы могут обрабатывать заявки' }
  }

  const db = getEnhancedPrisma(session.user)

  // Получаем заявку
  const request = await db.enrollmentRequest.findUnique({
    where: { id: requestId },
    include: {
      student: {
        select: { id: true, name: true },
      },
    },
  })

  if (!request) {
    return { success: false, error: 'Заявка не найдена' }
  }

  // Проверяем, что заявка принадлежит текущему инструктору
  if (request.instructorId !== session.user.id) {
    return { success: false, error: 'Эта заявка не для вас' }
  }

  // Проверяем статус
  if (request.status !== 'PENDING') {
    return { success: false, error: 'Заявка уже обработана' }
  }

  // Получаем профили
  const [instructorProfile, studentProfile] = await Promise.all([
    db.instructorProfile.findUnique({
      where: { userId: session.user.id },
    }),
    db.studentProfile.findUnique({
      where: { userId: request.studentId },
    }),
  ])

  if (!instructorProfile) {
    return { success: false, error: 'Профиль инструктора не найден' }
  }

  if (!studentProfile) {
    return { success: false, error: 'Профиль ученика не найден' }
  }

  // Проверяем, нет ли уже активной связи
  const existingConnection = await db.studentInstructorConnection.findFirst({
    where: {
      studentId: studentProfile.id,
      instructorId: instructorProfile.id,
      status: 'ACTIVE',
    },
  })

  if (existingConnection) {
    // Если связь уже есть — просто обновляем статус заявки
    await db.enrollmentRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        processedById: session.user.id,
        processedAt: new Date(),
      },
    })

    revalidatePath('/enrollment-requests')
    return { success: true }
  }

  // Создаём связь и обновляем заявку в транзакции
  await db.$transaction([
    db.studentInstructorConnection.create({
      data: {
        studentId: studentProfile.id,
        instructorId: instructorProfile.id,
        status: 'ACTIVE',
      },
    }),
    db.enrollmentRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        processedById: session.user.id,
        processedAt: new Date(),
      },
    }),
  ])

  // Отправляем уведомление ученику об одобрении (fire-and-forget)
  const orchestratorRepo = createOrchestratorRepository(db)
  const providers = createNotificationProviders()
  const appUrl = getAppUrl()

  notifyUser({
    userId: request.studentId,
    type: 'ENROLLMENT_REQUEST_APPROVED',
    title: 'Ваша заявка одобрена!',
    body: `Инструктор ${session.user.name || 'Инструктор'} принял вашу заявку на обучение`,
    data: {
      requestId,
      instructorId: session.user.id,
      actionUrl: '/my-lessons',
    },
    repo: orchestratorRepo,
    providers,
    appUrl,
  }).catch((error) => {
    log.error('Ошибка отправки уведомления об одобрении заявки:', error)
  })

  revalidatePath('/enrollment-requests')
  revalidatePath('/students')

  return { success: true }
}

// Схема валидации для отклонения заявки
const RejectEnrollmentSchema = z
  .object({
    requestId: z.string().uuid(),
    reason: z
      .string()
      .max(500, 'Причина не должна превышать 500 символов')
      .transform((val) => val.trim())
      .optional(),
  })
  .strip()

/**
 * Отклонение заявки на обучение
 */
export async function rejectEnrollmentRequestAction(requestId: string, reason?: string): Promise<ActionResult> {
  // Валидация входных данных
  const parsed = RejectEnrollmentSchema.safeParse({ requestId, reason })
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }
  const validatedData = parsed.data

  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  if (!isInstructor(session.user.roles)) {
    return { success: false, error: 'Только инструкторы могут обрабатывать заявки' }
  }

  const db = getEnhancedPrisma(session.user)

  // Получаем заявку
  const request = await db.enrollmentRequest.findUnique({
    where: { id: validatedData.requestId },
  })

  if (!request) {
    return { success: false, error: 'Заявка не найдена' }
  }

  // Проверяем, что заявка принадлежит текущему инструктору
  if (request.instructorId !== session.user.id) {
    return { success: false, error: 'Эта заявка не для вас' }
  }

  // Проверяем статус
  if (request.status !== 'PENDING') {
    return { success: false, error: 'Заявка уже обработана' }
  }

  // Обновляем статус
  await db.enrollmentRequest.update({
    where: { id: validatedData.requestId },
    data: {
      status: 'REJECTED',
      rejectReason: validatedData.reason || null,
      processedById: session.user.id,
      processedAt: new Date(),
    },
  })

  // Отправляем уведомление ученику об отклонении (fire-and-forget)
  const orchestratorRepo = createOrchestratorRepository(db)
  const providers = createNotificationProviders()
  const appUrl = getAppUrl()

  notifyUser({
    userId: request.studentId,
    type: 'ENROLLMENT_REQUEST_REJECTED',
    title: 'Заявка отклонена',
    body: validatedData.reason
      ? `Инструктор ${session.user.name || 'Инструктор'} отклонил вашу заявку: ${validatedData.reason}`
      : `Инструктор ${session.user.name || 'Инструктор'} отклонил вашу заявку на обучение`,
    data: {
      requestId: validatedData.requestId,
      instructorId: session.user.id,
      reason: validatedData.reason || null,
      actionUrl: '/my-enrollment-requests',
    },
    repo: orchestratorRepo,
    providers,
    appUrl,
  }).catch((error) => {
    log.error('Ошибка отправки уведомления об отклонении заявки:', error)
  })

  revalidatePath('/enrollment-requests')

  return { success: true }
}

/**
 * Получение заявок для инструктора
 */
export async function getEnrollmentRequestsAction(): Promise<{
  success: boolean
  error?: string
  requests?: Array<{
    id: string
    type: string
    status: string
    message: string | null
    createdAt: Date
    student: {
      id: string
      name: string | null
      image: string | null
      phone: string | null
    }
    vehicle: {
      id: string
      brand: string
      model: string
      transmission: string
    } | null
  }>
}> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  if (!isInstructor(session.user.roles)) {
    return { success: false, error: 'Только инструкторы могут просматривать заявки' }
  }

  const db = getEnhancedPrisma(session.user)

  const requests = await db.enrollmentRequest.findMany({
    where: {
      instructorId: session.user.id,
      type: 'DIRECT', // Только прямые заявки, школьные обрабатываются через школу
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          image: true,
          phone: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          brand: true,
          model: true,
          transmission: true,
        },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return {
    success: true,
    requests: requests.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      student: r.student,
      vehicle: r.vehicle,
    })),
  }
}
