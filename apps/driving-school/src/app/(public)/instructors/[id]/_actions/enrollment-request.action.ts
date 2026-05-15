'use server'

import { getAppUrl } from '@/lib/app-url'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { notifyUser } from '@/lib/notifications'
import { createNotificationProviders, createOrchestratorRepository } from '@/lib/orchestrator-repository'
import type { EnrollmentRequestType } from '@letar/driving-school-db/prisma'
import { redirect } from 'next/navigation'

interface CreateEnrollmentRequestInput {
  instructorId: string
  type: EnrollmentRequestType
  organizationId?: string
  vehicleId?: string
  message?: string
}

const log = createLogger('EnrollmentRequest')

interface ActionResult {
  success: boolean
  error?: string
  requestId?: string
}

/**
 * Создание заявки на обучение к инструктору
 */
export async function createEnrollmentRequestAction(input: CreateEnrollmentRequestInput): Promise<ActionResult> {
  const session = await getSession()

  // Если не авторизован, редирект на страницу входа
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/instructors/${input.instructorId}`)
  }

  const userId = session.user.id

  // Получаем инструктора с информацией о пользователе
  const instructorProfile = await prisma.instructorProfile.findUnique({
    where: { id: input.instructorId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  })

  if (!instructorProfile) {
    return { success: false, error: 'Инструктор не найден' }
  }

  // Проверяем, что ученик не записывается сам к себе
  if (instructorProfile.userId === userId) {
    return { success: false, error: 'Нельзя записаться к самому себе' }
  }

  // Получаем профиль ученика
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
  })

  if (!studentProfile) {
    return { success: false, error: 'Профиль ученика не найден' }
  }

  // Проверяем, нет ли уже активной связи (ZenStack v3.2.0 exists API)
  const connectionExists = await prisma.studentInstructorConnection.exists({
    where: {
      studentId: studentProfile.id,
      instructorId: input.instructorId,
      status: 'ACTIVE',
    },
  })

  if (connectionExists) {
    return { success: false, error: 'Вы уже занимаетесь у этого инструктора' }
  }

  // Проверяем, нет ли уже pending заявки (ZenStack v3.2.0 exists API)
  const requestExists = await prisma.enrollmentRequest.exists({
    where: {
      studentId: userId,
      instructorId: instructorProfile.userId,
      status: 'PENDING',
    },
  })

  if (requestExists) {
    return { success: false, error: 'У вас уже есть активная заявка к этому инструктору' }
  }

  // Валидация типа заявки
  if (input.type === 'VIA_SCHOOL' && !input.organizationId) {
    return { success: false, error: 'Для записи через школу необходимо указать школу' }
  }

  // Получаем имя ученика для уведомления
  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })

  // Создаём заявку
  const request = await prisma.enrollmentRequest.create({
    data: {
      type: input.type,
      studentId: userId,
      instructorId: instructorProfile.userId,
      organizationId: input.organizationId || null,
      vehicleId: input.vehicleId || null,
      message: input.message || null,
    },
  })

  // Отправляем уведомление инструктору о новой заявке (fire-and-forget)
  const orchestratorRepo = createOrchestratorRepository()
  const providers = createNotificationProviders()
  const appUrl = getAppUrl()

  notifyUser({
    userId: instructorProfile.userId,
    type: 'ENROLLMENT_REQUEST_RECEIVED',
    title: 'Новая заявка на обучение',
    body: `${student?.name || 'Ученик'} хочет заниматься с вами`,
    data: {
      requestId: request.id,
      studentId: userId,
      type: input.type,
      actionUrl: '/enrollment-requests',
    },
    repo: orchestratorRepo,
    providers,
    appUrl,
  }).catch((error) => {
    log.error('Ошибка отправки уведомления о новой заявке:', error)
  })

  return { success: true, requestId: request.id }
}
